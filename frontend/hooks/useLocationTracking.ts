"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import io, { Socket } from "socket.io-client";

// Type definitions
interface LocationData {
  latitude: number;
  longitude: number;
  address?: string;
  method?: string;
  timestamp?: number;
  userId?: string;
  email?: string;
}

interface RoomData {
  roomName: string;
  userCount: number;
}

interface LocationSentData {
  success: boolean;
  message?: string;
}

interface TrackingRoom {
  id: string;
  name: string;
  userCount: number;
}

/**
 * Custom React hook for WebSocket location tracking
 * Handles connection, authentication, and real-time location updates
 */
export function useLocationTracking(token: string | null, isEnabled = true) {
  const [isConnected, setIsConnected] = useState(false);
  const [activeRooms, setActiveRooms] = useState<TrackingRoom[]>([]);
  const [lastLocation, setLastLocation] = useState<LocationData | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const socketRef = useRef<Socket | null>(null);

  // Initialize WebSocket connection
  useEffect(() => {
    if (!isEnabled || !token) return;

    try {
      const socketURL =
        process.env.NEXT_PUBLIC_API_URL?.replace("/api", "") ||
        "http://localhost:5000";

      console.log("🔌 Connecting to WebSocket:", socketURL);

      socketRef.current = io(socketURL, {
        auth: {
          token,
        },
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        reconnectionAttempts: 5,
      });

      const socket = socketRef.current;

      // Connection successful
      socket.on("connect", () => {
        console.log("✅ WebSocket connected");
        setIsConnected(true);
        setLocationError(null);
      });

      // Receive location from tracked user
      socket.on("location-received", (data: LocationData) => {
        console.log("📍 Location received:", data);
        setLastLocation(data);
      });

      // Room joined confirmation
      socket.on("room-joined", (data: RoomData) => {
        console.log("👤 Joined room:", data);
      });

      // Room left confirmation
      socket.on("room-left", (data: RoomData) => {
        console.log("👤 Left room:", data);
      });

      // Location sent confirmation
      socket.on("location-sent", (data: LocationSentData) => {
        console.log("✅ Location sent:", data);
      });

      // Active tracking rooms list
      socket.on("active-tracking-rooms", (data: { rooms: TrackingRoom[] }) => {
        console.log("📊 Active tracking rooms:", data);
        setActiveRooms(data.rooms || []);
      });

      // Pong response (heartbeat)
      socket.on("pong", (data: { timestamp: number }) => {
        console.log("💓 Pong received at:", data.timestamp);
      });

      // Error handling
      socket.on("error", (error: Error) => {
        console.error("❌ WebSocket error:", error);
        setLocationError(error.message || "WebSocket error occurred");
      });

      // Disconnection
      socket.on("disconnect", () => {
        console.log("❌ WebSocket disconnected");
        setIsConnected(false);
      });

      // Connection error
      socket.on("connect_error", (error: Error) => {
        console.error("❌ Connection error:", error);
        setLocationError(error.message || "Failed to connect");
      });

      return () => {
        if (socket) {
          socket.disconnect();
        }
      };
    } catch (error) {
      console.error("Error initializing WebSocket:", error);
      // Note: Cannot call setState in effect cleanup or catch block
      // Error will be handled by connection event handlers
    }
  }, [token, isEnabled]);

  // Join a tracking room to receive location updates
  const joinTrackingRoom = useCallback((targetEmail: string) => {
    if (!socketRef.current?.connected) {
      console.warn("WebSocket not connected");
      return;
    }

    socketRef.current.emit("join-tracking-room", { targetEmail });
  }, []);

  // Leave a tracking room
  const leaveTrackingRoom = useCallback((targetEmail: string) => {
    if (!socketRef.current?.connected) {
      console.warn("WebSocket not connected");
      return;
    }

    socketRef.current.emit("leave-tracking-room", { targetEmail });
  }, []);

  // Send location to a requester
  const sendLocation = useCallback(
    (requesterEmail: string, latitude: number, longitude: number, address = "", method = "geolocation") => {
      if (!socketRef.current?.connected) {
        console.warn("WebSocket not connected");
        return false;
      }

      socketRef.current.emit("send-location", {
        requesterEmail,
        latitude,
        longitude,
        address,
        method,
      });

      return true;
    },
    [],
  );

  // Request location from tracked user
  const requestLocation = useCallback((targetEmail: string) => {
    if (!socketRef.current?.connected) {
      console.warn("WebSocket not connected");
      return;
    }

    socketRef.current.emit("request-location", { targetEmail });
  }, []);

  // Get list of active tracking rooms
  const getActiveTracking = useCallback(() => {
    if (!socketRef.current?.connected) {
      console.warn("WebSocket not connected");
      return;
    }

    socketRef.current.emit("get-active-tracking", {});
  }, []);

  // Heartbeat (ping)
  const sendPing = useCallback(() => {
    if (!socketRef.current?.connected) {
      console.warn("WebSocket not connected");
      return;
    }

    socketRef.current.emit("ping");
  }, []);

  return {
    isConnected,
    lastLocation,
    locationError,
    activeRooms,
    joinTrackingRoom,
    leaveTrackingRoom,
    sendLocation,
    requestLocation,
    getActiveTracking,
    sendPing,
  };
}

export default useLocationTracking;
