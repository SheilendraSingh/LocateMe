# WebSocket Configuration Guide - LocateMe Frontend

## Installation

Install socket.io-client:

```bash
npm install socket.io-client
```

## Setup

### 1. Install Socket.io Package

```bash
npm install socket.io-client
```

### 2. Environment Variables

Add to your `.env.local`:

```
NEXT_PUBLIC_API_URL=http://localhost:5000/api
NEXT_PUBLIC_WS_URL=http://localhost:5000
```

### 3. Using the Hook

The `useLocationTracking` hook handles all WebSocket operations:

```typescript
"use client";

import { useLocationTracking } from "@/hooks/useLocationTracking";
import { useAuth } from "@/context/AuthContext";

export default function TrackingComponent() {
  const { token } = useAuth();
  const {
    isConnected,
    lastLocation,
    locationError,
    activeRooms,
    joinTrackingRoom,
    leaveTrackingRoom,
    sendLocation,
    getActiveTracking,
  } = useLocationTracking(token, true);

  return (
    <div>
      <p>Status: {isConnected ? "✅ Connected" : "❌ Disconnected"}</p>
      {lastLocation && (
        <div>
          <p>Latitude: {lastLocation.latitude}</p>
          <p>Longitude: {lastLocation.longitude}</p>
          <p>Address: {lastLocation.address}</p>
        </div>
      )}
    </div>
  );
}
```

## API Reference

### useLocationTracking(token, isEnabled)

**Parameters:**

- `token` (string): JWT authentication token from login
- `isEnabled` (boolean, optional): Enable/disable WebSocket. Default: true

**Returns:**

```typescript
{
  isConnected: boolean;              // Connection status
  lastLocation: LocationData | null; // Last received location
  locationError: string | null;      // Last error message
  activeRooms: Room[];               // Active tracking rooms
  joinTrackingRoom(targetEmail);     // Join tracking room
  leaveTrackingRoom(targetEmail);    // Leave tracking room
  sendLocation(...);                 // Send current location
  requestLocation(targetEmail);      // Request location from user
  getActiveTracking();               // Get list of active rooms
  sendPing();                        // Send heartbeat
  socket: Socket | null;             // Raw socket instance
}
```

## Event Types

### Emitted Events (Client → Server)

#### join-tracking-room

Join a room to receive location updates from a tracked user

```javascript
socket.emit("join-tracking-room", {
  targetEmail: "jane@example.com",
});
```

#### leave-tracking-room

Leave a tracking room

```javascript
socket.emit("leave-tracking-room", {
  targetEmail: "jane@example.com",
});
```

#### send-location

Send your current location

```javascript
socket.emit("send-location", {
  requesterEmail: "john@example.com",
  latitude: 40.7128,
  longitude: -74.006,
  address: "New York, USA",
  method: "geolocation",
});
```

#### request-location

Request location from another user

```javascript
socket.emit("request-location", {
  targetEmail: "jane@example.com",
});
```

#### get-active-tracking

Get list of active tracking sessions

```javascript
socket.emit("get-active-tracking", {});
```

#### ping

Send heartbeat

```javascript
socket.emit("ping");
```

### Received Events (Server → Client)

#### location-received

Received location update from tracked user

```javascript
// { targetEmail, latitude, longitude, address, timestamp, method, senderName }
```

#### room-joined

Confirmation of joining a tracking room

```javascript
// { success, message, room }
```

#### room-left

Confirmation of leaving a tracking room

```javascript
// { success, message, room }
```

#### location-sent

Confirmation of sent location

```javascript
// { success, message, location }
```

#### active-tracking-rooms

List of active tracking rooms

```javascript
// { success, rooms: [{targetEmail, memberCount, room}], totalActiveRooms }
```

#### error

WebSocket error event

```javascript
// { message, error }
```

#### pong

Heartbeat response

```javascript
// { timestamp }
```

## Usage Examples

### Example 1: Real-Time Location Sharing

```typescript
"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useLocationTracking } from "@/hooks/useLocationTracking";

export default function LocationSharing({ targetEmail }) {
  const { token } = useAuth();
  const { isConnected, joinTrackingRoom, sendLocation } = useLocationTracking(
    token,
    true,
  );

  const shareRealTimeLocation = async () => {
    if (!navigator.geolocation) {
      alert("Geolocation not supported");
      return;
    }

    navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        sendLocation(targetEmail, latitude, longitude, "Real location");
      },
      (error) => console.error("Geolocation error:", error),
      {
        enableHighAccuracy: true,
        maximumAge: 3000, // Update every 3 seconds
      },
    );
  };

  useEffect(() => {
    if (isConnected) {
      joinTrackingRoom(targetEmail);
      shareRealTimeLocation();
    }
  }, [isConnected]);

  return (
    <button onClick={shareRealTimeLocation}>
      {isConnected ? "Sharing Location (Live)" : "Connecting..."}
    </button>
  );
}
```

### Example 2: Track Multiple Users

```typescript
"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useLocationTracking } from "@/hooks/useLocationTracking";

export default function MultiUserTracking() {
  const { token } = useAuth();
  const { isConnected, lastLocation, joinTrackingRoom, leaveTrackingRoom } =
    useLocationTracking(token, true);

  const [trackedUsers, setTrackedUsers] = useState([
    "jane@example.com",
    "bob@example.com",
  ]);

  const [locations, setLocations] = useState({});

  useEffect(() => {
    if (isConnected) {
      // Join tracking rooms for all users
      trackedUsers.forEach((email) => joinTrackingRoom(email));
    }

    return () => {
      // Leave all rooms on unmount
      trackedUsers.forEach((email) => leaveTrackingRoom(email));
    };
  }, [isConnected, trackedUsers]);

  // Update locations when new data arrives
  useEffect(() => {
    if (lastLocation) {
      setLocations((prev) => ({
        ...prev,
        [lastLocation.targetEmail]: lastLocation,
      }));
    }
  }, [lastLocation]);

  return (
    <div>
      <h2>Tracking {trackedUsers.length} Users</h2>
      {Object.entries(locations).map(([email, location]) => (
        <div key={email}>
          <p>{email}</p>
          <p>
            {location.latitude}, {location.longitude}
          </p>
          <p>{location.address}</p>
        </div>
      ))}
    </div>
  );
}
```

### Example 3: Location Display on Map

```typescript
"use client";

import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import { useAuth } from "@/context/AuthContext";
import { useLocationTracking } from "@/hooks/useLocationTracking";

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN!;

export default function LiveTrackingMap({ targetEmail }) {
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const markerRef = useRef<mapboxgl.Marker | null>(null);

  const { token } = useAuth();
  const { isConnected, lastLocation, joinTrackingRoom } = useLocationTracking(
    token,
    true,
  );

  // Initialize map
  useEffect(() => {
    if (!containerRef.current) return;

    mapRef.current = new mapboxgl.Map({
      container: containerRef.current,
      style: "mapbox://styles/mapbox/streets-v12",
      center: [0, 0],
      zoom: 12,
    });

    return () => mapRef.current?.remove();
  }, []);

  // Join tracking room
  useEffect(() => {
    if (isConnected) {
      joinTrackingRoom(targetEmail);
    }
  }, [isConnected]);

  // Update marker on location change
  useEffect(() => {
    if (!mapRef.current || !lastLocation) return;

    const { latitude, longitude } = lastLocation;

    // Remove old marker
    if (markerRef.current) {
      markerRef.current.remove();
    }

    // Add new marker
    markerRef.current = new mapboxgl.Marker()
      .setLngLat([longitude, latitude])
      .addTo(mapRef.current);

    // Pan to new location
    mapRef.current.flyTo({
      center: [longitude, latitude],
      zoom: 14,
      speed: 1.5,
    });
  }, [lastLocation]);

  return (
    <div>
      <div
        ref={containerRef}
        style={{ width: "100%", height: "500px" }}
      />
      {lastLocation && (
        <p>
          Last update: {new Date(lastLocation.timestamp).toLocaleTimeString()}
        </p>
      )}
    </div>
  );
}
```

## Best Practices

1. **Automatic Reconnection**: The hook handles reconnection automatically
2. **Token Expiry**: Reconnect with new token when JWT expires
3. **Room Management**: Always leave rooms when switching targets
4. **Error Handling**: Monitor `locationError` for connection issues
5. **Performance**: Use `watchPosition` with `maximumAge` to throttle updates
6. **Cleanup**: Component unmounts automatically clean up connections

## Troubleshooting

### Connection Failed

- Check `NEXT_PUBLIC_API_URL` is correct
- Verify JWT token is valid
- Ensure backend WebSocket is running

### No Location Updates

- Confirm `joinTrackingRoom(targetEmail)` was called
- Check browser console for WebSocket errors
- Verify tracked user has sent location

### Slow Updates

- Increase `maximumAge` in `watchPosition` options
- Reduce location update frequency on sender side
- Check network latency

### Memory Leaks

- Ensure `useLocationTracking` cleanup runs
- Call `leaveTrackingRoom()` before unmounting
- Don't create new hooks without cleanup

## Migration from HTTP Polling

**Before (HTTP Polling):**

```javascript
useEffect(() => {
  const interval = setInterval(async () => {
    const res = await fetch(
      `/api/auth/tracked-user-location?targetEmail=${targetEmail}`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    const data = await res.json();
    setLocation(data.lastLocation);
  }, 5000); // Every 5 seconds

  return () => clearInterval(interval);
}, []);
```

**After (WebSocket):**

```javascript
const { lastLocation, isConnected, joinTrackingRoom } = useLocationTracking(
  token,
  true,
);

useEffect(() => {
  if (isConnected) {
    joinTrackingRoom(targetEmail);
  }
}, [isConnected]);

useEffect(() => {
  setLocation(lastLocation);
}, [lastLocation]);
```

## Performance Metrics

| Method            | Latency  | Bandwidth | Polling |
| ----------------- | -------- | --------- | ------- |
| HTTP Polling (5s) | 2.5s avg | High      | Yes     |
| WebSocket         | <100ms   | Low       | No      |
| HTTP Polling (2s) | 1s avg   | Very High | Yes     |

WebSocket provides real-time updates with minimal bandwidth!
