/**
 * WebSocket Implementation Guide for Real-Time Location Tracking
 *
 * This file provides setup instructions and a template for WebSocket integration
 * to enable true real-time location updates without HTTP polling.
 */

// ============================================
// INSTALLATION
// ============================================
// npm install socket.io

// ============================================
// SERVER SETUP (Add to server.js)
// ============================================

import { createServer } from "http";
import { Server } from "socket.io";
import app from "./app.js";

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CORS_ORIGIN || "http://localhost:3000",
    credentials: true,
  },
});

// Middleware for authentication
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) {
    return next(new Error("Authentication error"));
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.userId = decoded.id;
    next();
  } catch (error) {
    next(new Error("Authentication error"));
  }
});

// WebSocket event handlers
io.on("connection", (socket) => {
  console.log(`User connected: ${socket.userId}`);

  // Join a room for location updates
  socket.on("join-tracking", (data) => {
    const { targetEmail } = data;
    const roomName = `tracking-${targetEmail.toLowerCase()}`;
    socket.join(roomName);
    console.log(`User joined room: ${roomName}`);
  });

  // Leave a tracking room
  socket.on("leave-tracking", (data) => {
    const { targetEmail } = data;
    const roomName = `tracking-${targetEmail.toLowerCase()}`;
    socket.leave(roomName);
    console.log(`User left room: ${roomName}`);
  });

  // Broadcast location update
  socket.on("location-update", (data) => {
    const { targetEmail, latitude, longitude, address } = data;
    const roomName = `tracking-${targetEmail.toLowerCase()}`;

    io.to(roomName).emit("location-updated", {
      targetEmail,
      latitude,
      longitude,
      address,
      timestamp: new Date(),
    });
  });

  socket.on("disconnect", () => {
    console.log(`User disconnected: ${socket.userId}`);
  });
});

const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => console.log(`Server running on port ${PORT}`));

// ============================================
// CLIENT SETUP (Frontend - React Hook)
// ============================================

import { useEffect, useState } from "react";
import io from "socket.io-client";

export function useLocationTracking(targetEmail, token) {
  const [location, setLocation] = useState(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!targetEmail || !token) return;

    // Initialize WebSocket connection
    const socket = io(
      process.env.REACT_APP_API_URL || "http://localhost:5000",
      {
        auth: {
          token,
        },
      },
    );

    socket.on("connect", () => {
      console.log("Connected to tracking server");
      setIsConnected(true);
      socket.emit("join-tracking", { targetEmail });
    });

    socket.on("location-updated", (data) => {
      console.log("Location update received:", data);
      setLocation(data);
    });

    socket.on("disconnect", () => {
      console.log("Disconnected from tracking server");
      setIsConnected(false);
    });

    return () => {
      socket.emit("leave-tracking", { targetEmail });
      socket.off("connect");
      socket.off("location-updated");
      socket.off("disconnect");
      socket.disconnect();
    };
  }, [targetEmail, token]);

  return { location, isConnected };
}

// ============================================
// BENEFITS OF WEBSOCKET
// ============================================
/*
1. Real-time updates without polling
2. Bidirectional communication
3. Lower latency and bandwidth usage
4. Better user experience
5. Automatic reconnection handling
6. Event-based architecture

VS HTTP POLLING:
- HTTP polling: Client asks server every N seconds if data changed
- WebSocket: Server pushes data immediately when it changes
*/

// ============================================
// IMPLEMENTATION FOR BOTH HTTP & WEBSOCKET
// ============================================
/*
Current HTTP polling approach:
1. Frontend calls GET /api/auth/tracked-user-location every 5-10 seconds
2. Backend returns latest location if tracking is active
3. Frontend updates map with new coordinates

Enhanced WebSocket approach:
1. User connects to WebSocket with authentication token
2. User joins tracking room with socket.emit("join-tracking", {targetEmail})
3. When location updates, server broadcasts via socket.emit
4. Frontend receives updates in real-time

You can implement both for backward compatibility:
- HTTP endpoints for polling (current implementation)
- WebSocket for real-time (new implementation)
- Frontend can switch between them based on browser support
*/

export default "See implementation guides above";
