// 1. ENVIRONMENT & IMPORTS
require("dotenv").config();
const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");
const bcrypt = require("bcrypt");

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

    // 3. THE RESPONSE: Let them in! 
    res.status(200).json({ 
      message: "Login successful!",
      username: user.username
    });

  } catch (error) {
    console.error("Login error:", error);
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
io.on("connection", (socket) => {
  console.log(`User Connected: ${socket.id}`);

  // Handle joining a room
  // Handle joining a room and fetching history
  // Handle joining a room and fetching history
  socket.on("join_room", async (room) => {
    socket.join(room);
    console.log(`User with ID: ${socket.id} joined room: ${room}`);

    try {
      // 1. Fetch history from PostgreSQL
      const chatHistory = await prisma.message.findMany({
        where: { roomId: room },
        orderBy: { createdAt: "asc" },
      });

      // 2. Normalize the data: Translate '.text' back to '.message' 
      // so the frontend receives exactly what it expects!
      const formattedHistory = chatHistory.map((msg) => ({
        room: msg.roomId,
        author: msg.author,
        message: msg.text, // <-- The magic translation line
        createdAt: msg.createdAt,
      }));

      // 3. Emit the perfectly formatted history to the user
      socket.emit("receive_history", formattedHistory);
      
    } catch (error) {
      console.error("Failed to fetch chat history:", error);
    }
  });

  // Handle sending and saving messages
  socket.on("send_message", async (data) => {
    try {
      // Step A: Save to PostgreSQL via Prisma
      await prisma.message.create({
        data: {
          roomId: data.room,
          author: data.author,
          text: data.message, 
        },
      });

      // Step B: Broadcast to everyone else in the room
      socket.to(data.room).emit("receive_message", data);
      
    } catch (error) {
      console.error("Failed to save message to database:", error);
    }
  });

  // Handle disconnects
  socket.on("disconnect", () => {
    console.log("User Disconnected", socket.id);
  });
});

// 7. BOOT THE SERVER
server.listen(3001, () => {
  console.log("SERVER IS RUNNING ON PORT 3001");
});