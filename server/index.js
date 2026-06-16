// 1. ENVIRONMENT & IMPORTS
require("dotenv").config();
const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

// 2. PRISMA DRIVER ADAPTER IMPORTS
const { Pool } = require("pg");
const { PrismaPg } = require("@prisma/adapter-pg");
const { PrismaClient } = require("@prisma/client");

// 3. DATABASE INITIALIZATION
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// 4. EXPRESS & HTTP SERVER SETUP
const app = express();
app.use(cors());
app.use(express.json());
const server = http.createServer(app);

// --- AUTHENTICATION ROUTES ---

app.post("/register", async (req, res) => {
  const { username, password, publicKey, encryptedPrivateKey} = req.body;

  try {
    const existingUser = await prisma.user.findUnique({
      where: { username: username },
    });

    if (existingUser) {
      return res.status(400).json({ error: "Username already taken." });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await prisma.user.create({
      data: {
        username: username,
        password: hashedPassword,
        publicKey: publicKey, // --- SAVING THE PADLOCK ---
        encryptedPrivateKey: encryptedPrivateKey // --- SAVING THE VAULT ---
      },
    });

    res.status(201).json({
      message: "User registered successfully!",
      userId: newUser.id
    });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.post("/login", async (req, res) => {
  const { username, password } = req.body;

  try {
    const user = await prisma.user.findUnique({
      where: { username: username },
    });

    if (!user) {
      return res.status(400).json({ error: "User not found." });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({ error: "Incorrect password." });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: "24h" }
    );

    res.status(200).json({
      message: "Login successful!",
      username: user.username,
      token: token,
       encryptedPrivateKey: user.encryptedPrivateKey // --- OPENING THE VAULT ---
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// --- HTTP SECURITY MIDDLEWARE ---
const requireAuth = (req, res, next) => {
  const token = req.headers.authorization;

  if (!token) {
    return res.status(401).json({ error: "Access Denied: No wristband provided." });
  }

  try {
    const verified = jwt.verify(token, process.env.JWT_SECRET);
    req.user = verified;
    next();
  } catch (err) {
    res.status(403).json({ error: "Access Denied: Fake or expired wristband." });
  }
};

// --- CONVERSATION ROUTES ---

app.post("/conversations", requireAuth, async (req, res) => {
  try {
    const { targetUsername } = req.body;
    const myId = req.user.id;

    const friend = await prisma.user.findUnique({
      where: { username: targetUsername }
    });

    if (!friend) return res.status(404).json({ error: "User not found!" });
    if (friend.id === myId) return res.status(400).json({ error: "You cannot chat with yourself." });

    const existingChat = await prisma.conversation.findFirst({
      where: {
        type: "PRIVATE",
        AND: [
          { participants: { some: { userId: myId } } },
          { participants: { some: { userId: friend.id } } }
        ]
      },
      include: {
        participants: {
          include: {
            user: { select: { username: true, publicKey: true } }
          }
        }
      }
    });

    if (existingChat) {
      return res.status(200).json(existingChat);
    }

    const newChat = await prisma.conversation.create({
      data: {
        type: "PRIVATE",
        participants: {
          create: [
            { userId: myId },
            { userId: friend.id }
          ]
        }
      },
      include: {
        participants: {
          include: {
            user: { select: { username: true, publicKey: true } }
          }
        }
      }
    });

    res.status(201).json(newChat);

  } catch (error) {
    console.error("Error creating chat:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.get("/conversations", requireAuth, async (req, res) => {
  try {
    const myId = req.user.id;

    const myConversations = await prisma.conversation.findMany({
      where: {
        participants: {
          some: { userId: myId }
        }
      },
      include: {
        participants: {
          include: {
            user: { select: { username: true, publicKey: true } } 
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.status(200).json(myConversations);

  } catch (error) {
    console.error("Error fetching chats:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.post("/conversations/group", requireAuth, async (req, res) => {
  try {
    const { name, usernames } = req.body; 
    const myId = req.user.id;

    const friends = await prisma.user.findMany({
      where: { username: { in: usernames } }
    });

    if (friends.length === 0) return res.status(400).json({ error: "Could not find any valid users." });

    const participantData = friends.map(friend => ({ userId: friend.id }));
    participantData.push({ userId: myId });

    const newGroup = await prisma.conversation.create({
      data: {
        type: "GROUP",
        name: name,
        participants: { create: participantData }
      }
    });

    res.status(201).json(newGroup);
  } catch (error) {
    console.error("Error creating group:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.get("/conversations/:id/messages", requireAuth, async (req, res) => {
  try {
    const conversationId = req.params.id;
    const myId = req.user.id; 

    const isParticipant = await prisma.conversationParticipant.findFirst({
      where: { conversationId: conversationId, userId: myId }
    });

    if (!isParticipant) return res.status(403).json({ error: "Security Alert: You are not in this chat." });

    const messages = await prisma.message.findMany({
      where: { conversationId: conversationId },
      include: { sender: { select: { username: true } } }, 
      orderBy: { createdAt: 'asc' } 
    });

    const formattedMessages = messages.map(msg => ({
      id: msg.id,
      author: msg.sender.username,
      text: msg.text,
      time: new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }));

    res.status(200).json(formattedMessages);
  } catch (error) {
    console.error("Error fetching messages:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});


// --- SOCKET.IO SETUP ---
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "*",
    methods: ["GET", "POST"],
  },
});

const userSocketMap = {};

io.on("connection", (socket) => {
  console.log(`User Connected: ${socket.id}`);

  const userId = socket.user?.id?.toString() || socket.handshake.query.userId;

  if (userId && userId !== "undefined") {
    userSocketMap[userId] = socket.id;
  }

  io.emit("getOnlineUsers", Object.keys(userSocketMap));

  socket.on("join_conversation", (conversationId) => {
    socket.join(conversationId);
    console.log(`User with Socket ID: ${socket.id} joined conversation: ${conversationId}`);
  });

  socket.on("send_message", async (data) => {
    try {
      const decodedToken = jwt.verify(data.token, process.env.JWT_SECRET);
      const verifiedSenderId = decodedToken.id;
      const verifiedUsername = decodedToken.username;

      const savedMessage = await prisma.message.create({
        data: {
          text: data.message,
          senderId: verifiedSenderId,         
          conversationId: data.conversationId 
        },
      });

      const secureBroadcastData = {
        id: savedMessage.id,
        text: savedMessage.text,
        author: verifiedUsername,
        createdAt: savedMessage.createdAt, 
        conversationId: data.conversationId
      };

      socket.to(data.conversationId).emit("receive_message", secureBroadcastData);
    } catch (error) {
      console.error("SECURITY ALERT or DB ERROR: Message blocked!", error);
    }
  });

  socket.on("typing", (data) => {
    socket.to(data.conversationId).emit("display_typing", {
      username: data.username,
      conversationId: data.conversationId
    });
  });

  socket.on("stop_typing", (conversationId) => {
    socket.to(conversationId).emit("clear_typing", conversationId);
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
    if (userId) {
      delete userSocketMap[userId];
      io.emit("getOnlineUsers", Object.keys(userSocketMap));
    }
  });
});

// 7. BOOT THE SERVER
const PORT = process.env.PORT || 3001;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});