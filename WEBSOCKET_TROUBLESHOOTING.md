# WebSocket Troubleshooting Guide

## Connection Issues

### Problem: "WebSocket connection failed"

**Symptoms:**

- Console error: `WebSocket is closed before the connection is established`
- Network tab shows failed WS connection
- `isConnected` stays false

**Solutions:**

1. **Check backend is running**

   ```bash
   curl http://localhost:5000/api/health
   # Should return: {"status":"OK","message":"Server is healthy 🚀"}
   ```

2. **Verify CORS configuration**

   ```
   backend/.env should have:
   CORS_ORIGIN=http://localhost:3000
   ```

3. **Check frontend URL in .env.local**

   ```
   frontend/.env.local should have:
   NEXT_PUBLIC_WS_URL=http://localhost:5000
   ```

4. **Verify no firewall blocking port 5000**

   ```bash
   # Linux/Mac
   netstat -an | grep 5000

   # Windows
   netstat -ano | findstr :5000
   ```

5. **Check browser console for specific error**
   - Open DevTools (F12)
   - Check Console tab for detailed error messages
   - Look for "CORS", "refused", or "net::ERR"

---

### Problem: "Authentication error: No token provided"

**Symptoms:**

- Connection fails immediately after WebSocket upgrade
- Error: `"Authentication error: No token provided"`
- User logged in but WebSocket won't connect

**Solutions:**

1. **Verify JWT token exists in AuthContext**

   ```typescript
   const { token } = useAuth();
   console.log("Token:", token); // Should not be undefined
   ```

2. **Check token is being passed to hook**

   ```typescript
   const tracker = useLocationTracking(token, true);
   // token parameter must not be null
   ```

3. **Verify token is still valid**
   - JWT tokens expire after 30 days
   - Token might have expired since login
   - Re-login to get fresh token

   ```typescript
   // In AuthContext.tsx, check token expiry
   const exp = decoded.exp;
   const isExpired = new Date().getTime() >= exp * 1000;
   ```

4. **Check localStorage for token**
   ```javascript
   // In browser console
   console.log(localStorage.getItem("token"));
   // Should show JWT token string
   ```

---

### Problem: "Authentication error: User not found"

**Symptoms:**

- WebSocket connects but then disconnects immediately
- Error: `"Authentication error: User not found"`
- User exists in database but still fails

**Solutions:**

1. **Verify user exists in MongoDB**

   ```bash
   # Check MongoDB
   db.users.findOne({ email: "your@email.com" })
   ```

2. **Check JWT token contains correct userId**

   ```javascript
   // Decode JWT (use jwt.io or run locally)
   const decoded = jwt.verify(token, JWT_SECRET);
   console.log("UserId:", decoded.id);
   // Should match user _id in database
   ```

3. **User account might be deleted**
   - Create new test account
   - Verify new account works

4. **Database connection issue**
   - Check backend logs for MongoDB errors
   - Verify `MONGO_URI` is correct
   - Test connection: `mongosh [MONGO_URI]`

---

## Location Update Issues

### Problem: "No location updates received"

**Symptoms:**

- WebSocket connected (`isConnected === true`)
- Joined tracking room
- Other user sends location but nothing received
- `lastLocation` remains null

**Solutions:**

1. **Verify tracking room was joined**

   ```typescript
   useEffect(() => {
     if (isConnected) {
       joinTrackingRoom("other@example.com");
       console.log("Joined room"); // Should log
     }
   }, [isConnected]);
   ```

2. **Check tracking room join confirmation**

   ```javascript
   // Browser console
   // Look for: "👤 Joined room"
   // Or check Network > WS > Messages tab
   ```

3. **Verify other user sent location**
   - Other user must have called `sendLocation()`
   - Check their console shows "✅ Location sent"
   - Verify they sent to correct requester email

4. **Check event listener is working**

   ```typescript
   // Verify hook is receiving events
   useEffect(() => {
     console.log("Last location:", lastLocation);
   }, [lastLocation]);
   ```

5. **Test with direct emit (advanced)**
   ```javascript
   // In browser console (advanced debugging)
   socket.emit("join-tracking-room", { targetEmail: "test@example.com" });
   socket.on("location-received", (data) => console.log("Got:", data));
   ```

---

### Problem: "Location updates are slow"

**Symptoms:**

- Location updates take 5+ seconds
- Significant delay between send and receive
- Defeating the purpose of real-time

**Solutions:**

1. **Reduce update frequency**

   ```typescript
   // Instead of every 1 second, try every 5-10 seconds
   navigator.geolocation.watchPosition(callback, {
     maximumAge: 5000, // Wait 5 seconds between updates
   });
   ```

2. **Check network latency**
   - Open DevTools > Network tab
   - Find WS connection
   - Check "Timings" tab
   - High latency (>500ms) = network issue

3. **Check backend isn't bottlenecked**

   ```bash
   # Monitor CPU/Memory
   # Mac/Linux: top or htop
   # Windows: Task Manager
   ```

4. **Reduce location history size**

   ```typescript
   // In locationHandler.js, currently stores 100 locations
   // Consider reducing to 50 for high-frequency tracking
   ```

5. **Use WebSocket polling instead of HTTP**
   - Ensure you're using WebSocket (see Network > WS)
   - Not falling back to HTTP polling
   - Check in browser console for polling method

---

## Disconnection Issues

### Problem: "WebSocket keeps disconnecting"

**Symptoms:**

- Connected for a few seconds, then disconnects
- Reconnects repeatedly
- Unstable connection
- Auto-reconnect messages in console

**Solutions:**

1. **Check network stability**

   ```bash
   # Test internet connection
   ping google.com
   # Any packet loss indicates network issues
   ```

2. **Check backend logs for errors**

   ```
   Backend should show:
   ✅ User connected
   📍 Location updates
   ❌ User disconnected

   Look for errors between connect and disconnect
   ```

3. **Verify heartbeat is working**
   - Socket.IO sends ping every 25 seconds
   - Should see responses in Network tab
   - If heartbeat fails, disconnect happens

4. **Check for unhandled errors in event handlers**

   ```typescript
   socket.on("error", (error) => {
     console.error("Socket error:", error);
     // This indicates connection issue
   });
   ```

5. **Try with different network**
   - Switch WiFi to mobile hotspot
   - Or vice versa
   - Helps identify network-specific issues

6. **Check server-side handler for errors**
   ```javascript
   // In locationHandler.js, ensure all handlers
   // have proper try-catch blocks
   // and next() is called
   ```

---

### Problem: "Can't reconnect after network drop"

**Symptoms:**

- Turn off WiFi/internet
- Come back online
- WebSocket doesn't reconnect
- Manual refresh needed

**Solutions:**

1. **Verify reconnection config**

   ```javascript
   // In locationHandler.js init, should have:
   reconnection: true,
   reconnectionDelay: 1000,
   reconnectionDelayMax: 5000,
   reconnectionAttempts: 5
   ```

2. **Check token is still valid after reconnect**
   - Token might expire during offline time
   - Need to get fresh token
   - Implement token refresh in hook

3. **Force reconnection**

   ```typescript
   // If manual reconnect needed
   socket?.connect();
   ```

4. **Add reconnection handler**
   ```typescript
   socket.on("reconnect", () => {
     console.log("Reconnected!");
     // Re-join rooms after reconnect
     joinTrackingRoom(targetEmail);
   });
   ```

---

## Performance Issues

### Problem: "WebSocket consuming too much bandwidth"

**Symptoms:**

- Network data usage very high
- Browser getting slow
- Multiple simultaneous updates flooding data

**Solutions:**

1. **Reduce update frequency**

   ```typescript
   // Don't update more than 1-2 times per second
   // Limit location updates to every 5+ seconds
   maximumAge: 5000;
   ```

2. **Batch location updates**

   ```typescript
   // Send location in bulk instead of one-by-one
   // Or skip some updates if changed <10m from last
   ```

3. **Compress location data**
   - Current: Full precision coordinates
   - Better: Round to 4-5 decimals (~1-10m accuracy)

   ```typescript
   const lat = parseFloat(latitude.toFixed(5));
   const lng = parseFloat(longitude.toFixed(5));
   ```

4. **Don't track too many users simultaneously**
   - Each tracking room = extra bandwidth
   - Consider tracking max 5-10 users
   - Switch between tracked users instead

---

### Problem: "Memory leak - memory keeps growing"

**Symptoms:**

- DevTools shows memory growing over time
- After 30 mins, memory significantly higher
- Browser becomes sluggish

**Solutions:**

1. **Ensure location history is capped**

   ```javascript
   // In locationHandler.js, ensure:
   if (trackingRequest.locationHistory.length > 100) {
     trackingRequest.locationHistory =
       trackingRequest.locationHistory.slice(-100);
   }
   ```

2. **Clean up listeners on unmount**

   ```typescript
   // In useLocationTracking hook
   useEffect(() => {
     // ... setup code ...
     return () => {
       socket?.disconnect();
       // Clean up all listeners
     };
   }, []);
   ```

3. **Don't create new listeners every render**

   ```typescript
   // BAD - creates new listener every render
   return (
     <button onClick={() => {
       socket.on("location-received", ...); // ❌
     }} />
   );

   // GOOD - listener created once
   useEffect(() => {
     socket?.on("location-received", ...); // ✅
   }, []);
   ```

4. **Leave rooms when switching users**
   ```typescript
   // Always leave old room before joining new one
   leaveTrackingRoom(oldTarget);
   joinTrackingRoom(newTarget);
   ```

---

## Browser Compatibility Issues

### Problem: "WebSocket works locally but not in deployed environment"

**Symptoms:**

- `localhost:3000` works
- Deployed URL doesn't work
- Different origin issues

**Solutions:**

1. **Check CORS configuration**

   ```javascript
   // backend/server.js
   cors: {
     origin: process.env.CORS_ORIGIN || "http://localhost:3000",
     credentials: true
   }
   ```

   ```
   Set CORS_ORIGIN to your deployed frontend URL:
   CORS_ORIGIN=https://yourdomain.com
   ```

2. **Ensure WebSocket secure (WSS)**
   - Production must use `wss://` (with SSL certificate)
   - Different from development `ws://`

   ```
   Frontend: https://yourdomain.com
   WebSocket: wss://yourdomain.com
   ```

3. **Check firewall/proxy allows WebSocket**
   - Some firewalls block WebSocket
   - Some proxies only allow HTTP(S)
   - Contact hosting provider if needed

4. **Verify API URL vs WS URL**

   ```
   API: https://yourdomain.com/api
   WS: wss://yourdomain.com

   (Not: wss://yourdomain.com/api)
   ```

---

## Testing Issues

### Problem: "Tests fail with WebSocket"

**Symptoms:**

- Jest tests timeout
- WebSocket connection hangs tests
- Tests pass locally, fail in CI

**Solutions:**

1. **Mock Socket.IO in tests**

   ```javascript
   jest.mock("socket.io-client");
   ```

2. **Set test timeout higher**

   ```javascript
   jest.setTimeout(10000); // 10 seconds
   ```

3. **Disable WebSocket in test environment**

   ```typescript
   const tracker = useLocationTracking(
     token,
     process.env.NODE_ENV !== "test", // Disabled in tests
   );
   ```

4. **Mock socket events**
   ```javascript
   const mockSocket = {
     on: jest.fn(),
     emit: jest.fn(),
     off: jest.fn(),
     disconnect: jest.fn(),
   };
   io.mockReturnValue(mockSocket);
   ```

---

## Debugging Tools

### Browser DevTools

1. **Network Tab - WebSocket**
   - Select WS connection
   - Frame: See all messages sent/received
   - Timing: Check latency

2. **Console Tab**

   ```javascript
   // Enable socket.io debug logging
   localStorage.debug = "socket.io-client:*";
   location.reload();
   ```

3. **Application Tab**
   - Local Storage: Check JWT token
   - Cookies: Check session data

### Backend Logging

```javascript
// Add to locationHandler.js for debugging
console.log(`📍 Location: ${data.latitude}, ${data.longitude}`);
console.log(`🚀 Emitting to room: ${roomName}`);
console.log(`👥 Room size: ${io.sockets.adapter.rooms.get(roomName)?.size}`);
```

### Command Line Tools

```bash
# Monitor WebSocket traffic
npm install -g wscat
wscat -c "ws://localhost:5000/socket.io/?EIO=4&transport=websocket"

# Monitor server logs
tail -f backend.log

# Check network
netstat -an | grep 5000
```

---

## Getting Help

If you're stuck:

1. **Check the guides**
   - `WEBSOCKET_SETUP.md` - Quick start
   - `backend/WEBSOCKET_GUIDE.md` - Events reference
   - `frontend/WEBSOCKET_GUIDE.md` - Hook usage

2. **Review example code**
   - `frontend/app/components/RealTimeTracking.tsx`
   - `frontend/hooks/useLocationTracking.ts`

3. **Check logs**
   - Browser console (Frontend)
   - Terminal output (Backend)

4. **Test with command line**

   ```bash
   # Terminal 1
   cd backend && npm run dev

   # Terminal 2
   curl http://localhost:5000/api/health

   # Should return success
   ```

5. **Verify checklist**
   - Use `WEBSOCKET_CHECKLIST.md`
   - Follow each step
   - Identify failing step

---

## Common Error Messages

| Error                                          | Cause              | Fix                        |
| ---------------------------------------------- | ------------------ | -------------------------- |
| "Net::ERR_UNSUPPORTED_PROTO"                   | WSS without SSL    | Use SSL cert in production |
| "No space left on device"                      | Storage full       | Clear browser cache        |
| "Invalid or unexpected token"                  | JWT invalid        | Re-login to get new token  |
| "Maximum call stack size exceeded"             | Infinite loop      | Check event handlers       |
| "WebSocket is already in CLOSING/CLOSED state" | Reconnection issue | Check network              |

---

**Last Updated**: April 2026
**Version**: 1.0.0
