import jwt from "jsonwebtoken";
import User from "../models/User.js";

/**
 * WebSocket event handlers for real-time location tracking
 * Manages Socket.IO connections and emits/receives location updates
 */

export const initializeWebSocket = (io) => {
  // Middleware for authentication
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;

      if (!token) {
        return next(new Error("Authentication error: No token provided"));
      }

      // Verify JWT token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded.id;
      socket.email = null;

      // Get user email from database
      const user = await User.findById(decoded.id);
      if (!user) {
        return next(new Error("Authentication error: User not found"));
      }

      socket.email = user.email;
      socket.userName = user.name;

      next();
    } catch (error) {
      console.error("WebSocket authentication error:", error.message);
      next(new Error("Authentication error: " + error.message));
    }
  });

  // Connection handler
  io.on("connection", (socket) => {
    console.log(`✅ User connected: ${socket.userName} (${socket.email})`);

    // Join a tracking room for incoming location updates
    socket.on("join-tracking-room", (data) => {
      try {
        const { targetEmail } = data;

        if (!targetEmail) {
          socket.emit("error", { message: "Target email is required" });
          return;
        }

        const roomName = `tracking-${targetEmail.toLowerCase()}`;
        socket.join(roomName);

        console.log(`👤 ${socket.email} joined tracking room: ${roomName}`);

        socket.emit("room-joined", {
          success: true,
          message: `Joined tracking room for ${targetEmail}`,
          room: roomName,
        });
      } catch (error) {
        console.error("Error joining tracking room:", error);
        socket.emit("error", {
          message: "Failed to join tracking room",
          error: error.message,
        });
      }
    });

    // Leave a tracking room
    socket.on("leave-tracking-room", (data) => {
      try {
        const { targetEmail } = data;

        if (!targetEmail) {
          socket.emit("error", { message: "Target email is required" });
          return;
        }

        const roomName = `tracking-${targetEmail.toLowerCase()}`;
        socket.leave(roomName);

        console.log(`👤 ${socket.email} left tracking room: ${roomName}`);

        socket.emit("room-left", {
          success: true,
          message: `Left tracking room for ${targetEmail}`,
          room: roomName,
        });
      } catch (error) {
        console.error("Error leaving tracking room:", error);
        socket.emit("error", {
          message: "Failed to leave tracking room",
          error: error.message,
        });
      }
    });

    // Receive location update from tracked user and broadcast to watchers
    socket.on("send-location", async (data) => {
      try {
        const {
          requesterEmail,
          latitude,
          longitude,
          address,
          method = "geolocation",
        } = data;

        if (
          !requesterEmail ||
          latitude === undefined ||
          longitude === undefined
        ) {
          socket.emit("error", {
            message: "Requester email, latitude, and longitude are required",
          });
          return;
        }

        // Validate coordinates
        if (
          latitude < -90 ||
          latitude > 90 ||
          longitude < -180 ||
          longitude > 180
        ) {
          socket.emit("error", {
            message: "Invalid coordinates",
          });
          return;
        }

        const locationData = {
          targetEmail: socket.email,
          latitude: Number(latitude),
          longitude: Number(longitude),
          address: address || "Unknown location",
          method: method || "geolocation",
          timestamp: new Date(),
          senderName: socket.userName,
        };

        const roomName = `tracking-${requesterEmail.toLowerCase()}`;

        // Broadcast to all users in the tracking room
        io.to(roomName).emit("location-received", locationData);

        console.log(
          `📍 Location update from ${socket.email} to room ${roomName}`,
        );

        socket.emit("location-sent", {
          success: true,
          message: "Location sent successfully",
          location: locationData,
        });
      } catch (error) {
        console.error("Error sending location:", error);
        socket.emit("error", {
          message: "Failed to send location",
          error: error.message,
        });
      }
    });

    // Request user's current location
    socket.on("request-location", (data) => {
      try {
        const { targetEmail } = data;

        if (!targetEmail) {
          socket.emit("error", { message: "Target email is required" });
          return;
        }

        console.log(
          `📮 ${socket.email} requesting location from ${targetEmail}`,
        );

        const targetRoomName = `user-${targetEmail.toLowerCase()}`;
        io.to(targetRoomName).emit("location-requested", {
          requesterEmail: socket.email,
          requesterName: socket.userName,
          timestamp: new Date(),
        });
      } catch (error) {
        console.error("Error requesting location:", error);
        socket.emit("error", {
          message: "Failed to request location",
          error: error.message,
        });
      }
    });

    // Get list of active tracking sessions
    socket.on("get-active-tracking", async (data) => {
      try {
        const user = await User.findById(socket.userId);

        if (!user) {
          socket.emit("error", { message: "User not found" });
          return;
        }

        const activeRooms = [];
        const roomsObject = io.sockets.adapter.rooms;

        // Find all tracking rooms this user is in
        for (const [roomName, members] of roomsObject) {
          if (roomName.startsWith("tracking-")) {
            const targetEmail = roomName.replace("tracking-", "");
            activeRooms.push({
              targetEmail,
              membersCount: members.size,
              room: roomName,
            });
          }
        }

        socket.emit("active-tracking-rooms", {
          success: true,
          rooms: activeRooms,
          totalActiveRooms: activeRooms.length,
        });
      } catch (error) {
        console.error("Error getting active tracking:", error);
        socket.emit("error", {
          message: "Failed to get active tracking",
          error: error.message,
        });
      }
    });

    // Heartbeat to keep connection alive
    socket.on("ping", () => {
      socket.emit("pong", { timestamp: new Date() });
    });

    // Disconnect handler
    socket.on("disconnect", () => {
      console.log(`❌ User disconnected: ${socket.email}`);
    });

    // Generic error handler
    socket.on("error", (error) => {
      console.error("Socket error for user", socket.email, ":", error);
    });
  });
};

export default initializeWebSocket;
