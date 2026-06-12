// 1. ENVIRONMENT & IMPORTS
require("dotenv").config();
const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

// 2. PRISMA 7 DRIVER ADAPTER IMPORTS
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

app.post("/register", async (req, res) => {
  // Grab the username and password from the frontend request
  const { username, password } = req.body;

  try {
    // 1. SECURITY CHECK: Does this username already exist?
    const existingUser = await prisma.user.findUnique({
      where: { username: username },
    });

    if (existingUser) {
      // 400 Bad Request: Stop the process and tell the frontend why
      return res.status(400).json({ error: "Username already taken." });
    }

    // 2. THE MATH: Hash the password
    // The "10" is the "Salt Rounds" - it dictates how complex the math is. 
    // 10 is the current industry balance between speed and extreme security.
    const hashedPassword = await bcrypt.hash(password, 10);

    // 3. THE SAVE: Store the user with the scrambled hash, NOT the real password
    const newUser = await prisma.user.create({
      data: {
        username: username,
        password: hashedPassword, // Saving the hash!
      },
    });

    // 4. THE RESPONSE: Tell the frontend it worked (but NEVER send the password back)
    res.status(201).json({
      message: "User registered successfully!",
      userId: newUser.id
    });

  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});


// Login Endpoint
app.post("/login", async (req, res) => {
  const { username, password } = req.body;

  try {
    // 1. SECURITY CHECK: Does this user even exist?
    const user = await prisma.user.findUnique({
      where: { username: username },
    });

    if (!user) {
      // 400 Bad Request: Stop and tell the frontend the user wasn't found
      return res.status(400).json({ error: "User not found." });
    }

    // 2. THE MATH: Compare the typed password against the saved hash
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      // 401 Unauthorized: Stop and tell the frontend the password was wrong
      return res.status(401).json({ error: "Incorrect password." });
    }

    // NEW: THE WRISTBAND - Generate the JWT
    // We pack their username inside, sign it with the .env secret, and make it expire in 24 hours.
    const token = jwt.sign(
      { id: user.id, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: "24h" }
    );

    // NEW: THE RESPONSE - Let them in AND hand them the wristband! 
    res.status(200).json({
      message: "Login successful!",
      username: user.username,
      token: token // <-- Sending the newly minted token back to React
    });

  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// --- HTTP SECURITY MIDDLEWARE ---
// This function sits in front of our protected routes to check the VIP wristband.
const requireAuth = (req, res, next) => {
  // 1. Look for the token in the HTTP Headers
  const token = req.headers.authorization;

  if (!token) {
    return res.status(401).json({ error: "Access Denied: No wristband provided." });
  }

  try {
    // 2. Mathematically verify the token
    const verified = jwt.verify(token, process.env.JWT_SECRET);

    // 3. Attach the verified user's identity to the request so the route can use it
    req.user = verified;

    // 4. Open the gate and let them through!
    next();
  } catch (err) {
    res.status(403).json({ error: "Access Denied: Fake or expired wristband." });
  }
};

// --- CONVERSATION ROUTES ---
// 1. Start a new Private Chat (Upgraded with Duplicate Prevention)
app.post("/conversations", requireAuth, async (req, res) => {
  try {
    const { targetUsername } = req.body;
    const myId = req.user.id;

    // Step A: Find the friend in the database
    const friend = await prisma.user.findUnique({
      where: { username: targetUsername }
    });

    if (!friend) {
      return res.status(404).json({ error: "User not found!" });
    }

    if (friend.id === myId) {
      return res.status(400).json({ error: "You cannot chat with yourself." });
    }

    // Step B: NEW! Check if a private chat already exists between these two exact users
    const existingChat = await prisma.conversation.findFirst({
      where: {
        type: "PRIVATE",
        AND: [
          { participants: { some: { userId: myId } } },
          { participants: { some: { userId: friend.id } } }
        ]
      }
    });

    // If a chat already exists, politely stop and return the existing one!
    if (existingChat) {
      return res.status(200).json(existingChat);
    }

    // Step C: If no chat exists, create a brand new one
    const newChat = await prisma.conversation.create({
      data: {
        type: "PRIVATE",
        participants: {
          create: [
            { userId: myId },
            { userId: friend.id }
          ]
        }
      }
    });

    res.status(201).json(newChat);

  } catch (error) {
    console.error("Error creating chat:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});


// 3. Start a new Group Chat
app.post("/conversations/group", requireAuth, async (req, res) => {
  try {
    const { name, usernames } = req.body; // Expecting an array: ["Parth", "Rahul"]
    const myId = req.user.id;

    // Step A: Find all friends in the database based on the array of usernames
    const friends = await prisma.user.findMany({
      where: {
        username: { in: usernames }
      }
    });

    if (friends.length === 0) {
      return res.status(400).json({ error: "Could not find any valid users." });
    }

    // Step B: Build the participant list (Include all friends + Myself)
    const participantData = friends.map(friend => ({ userId: friend.id }));
    participantData.push({ userId: myId });

    // Step C: Create the Group Conversation and link EVERYONE at once
    const newGroup = await prisma.conversation.create({
      data: {
        type: "GROUP",
        name: name, // Groups get actual names!
        participants: {
          create: participantData
        }
      }
    });

    res.status(201).json(newGroup);

  } catch (error) {
    console.error("Error creating group:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// 4. Fetch Message History for a specific chat
app.get("/conversations/:id/messages", requireAuth, async (req, res) => {
  try {
    const conversationId = req.params.id;
    const myId = req.user.id; // From our JWT bouncer!

    // Step A: SECURITY CHECK - Is this user actually a participant in this chat?
    const isParticipant = await prisma.conversationParticipant.findFirst({
      where: {
        conversationId: conversationId,
        userId: myId
      }
    });

    if (!isParticipant) {
      return res.status(403).json({ error: "Security Alert: You are not in this chat." });
    }

    // Step B: Fetch all messages for this chat, including who sent them
    const messages = await prisma.message.findMany({
      where: { conversationId: conversationId },
      include: {
        sender: { select: { username: true } } // We need the author's name for the UI!
      },
      orderBy: { createdAt: 'asc' } // Oldest at the top, newest at the bottom
    });

    // Step C: Format the database data to perfectly match our React UI structure
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

// 2. Fetch all my chats for the Sidebar
app.get("/conversations", requireAuth, async (req, res) => {
  try {
    const myId = req.user.id;

    // Find every conversation where myId exists inside the participants list
    const myConversations = await prisma.conversation.findMany({
      where: {
        participants: {
          some: {
            userId: myId
          }
        }
      },
      // Include the participant data so React knows WHO we are talking to
      include: {
        participants: {
          include: {
            user: {
              select: { username: true } // Only send back the username, never the password!
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc' // Newest chats at the top
      }
    });

    res.status(200).json(myConversations);

  } catch (error) {
    console.error("Error fetching chats:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});


// 5. SOCKET.IO SETUP
const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000", // Ensure this matches your React port
    methods: ["GET", "POST"],
  },
});

// 6. REAL-TIME EVENT LISTENERS
// --- SECURE REAL-TIME SOCKET CONNECTION ---
io.on("connection", (socket) => {
  console.log(`User Connected: ${socket.id}`);

  // 1. JOIN A SECURE CONVERSATION
  socket.on("join_conversation", (conversationId) => {
    socket.join(conversationId);
    console.log(`User with Socket ID: ${socket.id} joined conversation: ${conversationId}`);
  });

  // 2. SEND A SECURE RELATIONAL MESSAGE
  socket.on("send_message", async (data) => {
    try {
      // Step A: Verify the VIP wristband mathematically
      const decodedToken = jwt.verify(data.token, process.env.JWT_SECRET);

      // Step B: Extract their real Database ID from the token
      const verifiedSenderId = decodedToken.id;
      const verifiedUsername = decodedToken.username;

      // Step C: Save to PostgreSQL using our NEW Relational Schema
      const savedMessage = await prisma.message.create({
        data: {
          text: data.message,
          senderId: verifiedSenderId,         // Links perfectly to the User table
          conversationId: data.conversationId // Links perfectly to the Conversation table
        },
      });

      // Step D: Broadcast the message to the room, attaching the verified username
      const secureBroadcastData = {
        id: savedMessage.id,
        text: savedMessage.text,
        author: verifiedUsername,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      socket.to(data.conversationId).emit("receive_message", secureBroadcastData);

    } catch (error) {
      console.error("SECURITY ALERT or DB ERROR: Message blocked!", error);
    }
  });

  // 3. TYPING INDICATORS
  socket.on("typing", (data) => {
    // Whisper to the room: "Hey, this specific user is typing!"
    socket.to(data.conversationId).emit("display_typing", data.username);
  });

  socket.on("stop_typing", (conversationId) => {
    // Whisper to the room: "Okay, they stopped."
    socket.to(conversationId).emit("clear_typing");
  });

  socket.on("disconnect", () => {
    console.log("User Disconnected", socket.id);
  });
});

// 7. BOOT THE SERVER
server.listen(3001, () => {
  console.log("SERVER IS RUNNING ON PORT 3001");
});