import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import helmet from "helmet";
import { createServer } from "http";
import { Server as SocketIOServer } from "socket.io";

import connectDB from "./config/db.js";
import authRoutes from "./routes/auth.js";
import { verifyTransporter } from "./controllers/authController.js";
import {
  apiRateLimit,
  authRateLimit,
} from "./middleware/rateLimitMiddleware.js";
import { sanitizeInput } from "./middleware/sanitizeMiddleware.js";
import { initializeWebSocket } from "./websocket/locationHandler.js";

verifyTransporter();

//Added DB connection log safety
connectDB().then(() => {
  console.log("✅ Database connected successfully");
});

const app = express();

// Trust proxy for proper IP detection (important for rate limiting)
app.set("trust proxy", 1); // Trust first proxy

// Security & Middleware
app.use(helmet());

//CORS configuration with environment variable support and credentials
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || "http://localhost:3000",
    credentials: true,
  }),
);

//Body Parser with size limits to prevent DoS attacks
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));

// Input sanitization middleware
app.use(sanitizeInput);

// Global API rate limiting
// app.use("/api/", apiRateLimit()); // Temporarily disabled for testing

app.get("/", (req, res) => {
  res.status(200).send("✅ Backend is running");
});

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({ status: "OK", message: "Server is healthy 🚀" });
});

// Auth routes with stricter rate limiting for login/register
app.use("/api/auth", authRateLimit(900000, 10), authRoutes); // Increased from 5 to 10

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
    path: req.originalUrl,
  });
});

// Global error handler with improved logging
app.use((err, req, res, next) => {
  const statusCode = err.status || err.statusCode || 500;
  const isDevelopment = process.env.NODE_ENV === "development";

  // Log error details
  console.error({
    timestamp: new Date().toISOString(),
    statusCode,
    message: err.message,
    path: req.originalUrl,
    method: req.method,
    ...(isDevelopment && { stack: err.stack }),
  });

  res.status(statusCode).json({
    success: false,
    message: err.message || "Internal server error",
    ...(isDevelopment && { stack: err.stack }),
    ...(isDevelopment && { details: err.details }),
  });
});

// Create HTTP server for WebSocket support
const httpServer = createServer(app);

// Initialize Socket.IO with CORS configuration
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: process.env.CORS_ORIGIN || "http://localhost:3000",
    credentials: true,
    methods: ["GET", "POST"],
  },
  transports: ["websocket", "polling"],
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  reconnectionAttempts: 5,
});

// Initialize WebSocket event handlers
initializeWebSocket(io);

// Make io accessible in app for potential use in routes
app.use((req, res, next) => {
  req.io = io;
  next();
});

const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📡 WebSocket enabled at ws://localhost:${PORT}`);
  console.log(
    `🔗 CORS origin: ${process.env.CORS_ORIGIN || "http://localhost:3000"}`,
  );
});

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("SIGTERM signal received: closing HTTP server");
  httpServer.close(() => {
    console.log("HTTP server closed");
  });
});

process.on("SIGINT", () => {
  console.log("SIGINT signal received: closing HTTP server");
  httpServer.close(() => {
    console.log("HTTP server closed");
  });
});
