// 1. ENVIRONMENT & IMPORTS
require("dotenv").config();
const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");

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
const server = http.createServer(app);

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
  socket.on("join_room", (data) => {
    socket.join(data);
    console.log(`User with ID: ${socket.id} joined room: ${data}`);
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