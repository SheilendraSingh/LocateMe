# WebSocket Setup Checklist

Use this checklist to verify your WebSocket implementation is working correctly.

## Prerequisites ✓

- [ ] Node.js >= 18 installed
- [ ] MongoDB running and connected
- [ ] Both backend and frontend folders have package.json
- [ ] No other services running on port 5000 (backend)
- [ ] No other services running on port 3000 (frontend)

## Backend Setup ✓

### Installation

- [ ] Navigate to `backend/` directory
- [ ] Run `npm install` (should already have socket.io)
- [ ] `.env` file exists with all required variables:
  - [ ] `MONGO_URI` set
  - [ ] `JWT_SECRET` set (strong random string)
  - [ ] `EMAIL_USER` and `EMAIL_PASS` set (if using email)
  - [ ] `BACKEND_URL` set (e.g., http://localhost:5000)
  - [ ] `CORS_ORIGIN` set (e.g., http://localhost:3000)

### Files Created

- [ ] `websocket/locationHandler.js` exists
- [ ] `server.js` imports locationHandler
- [ ] `server.js` initializes Socket.IO
- [ ] `WEBSOCKET_GUIDE.md` exists
- [ ] `WEBSOCKET_IMPLEMENTATION.md` exists

### Backend Running

- [ ] Run `npm run dev`
- [ ] See message: "✅ Database connected successfully"
- [ ] See message: "✅ Email transporter verified successfully"
- [ ] See message: "🚀 Server running on port 5000"
- [ ] See message: "📡 WebSocket enabled at ws://localhost:5000"

### Testing Backend

- [ ] Health check works: `curl http://localhost:5000/api/health`
- [ ] Response shows `status: "OK"`
- [ ] No errors in backend console

## Frontend Setup ✓

### Installation

- [ ] Navigate to `frontend/` directory
- [ ] `package.json` has `socket.io-client` in dependencies
- [ ] Run `npm install`
- [ ] Create `.env.local` (copy from `.env.example`):
  - [ ] `NEXT_PUBLIC_API_URL=http://localhost:5000/api`
  - [ ] `NEXT_PUBLIC_WS_URL=http://localhost:5000`
  - [ ] `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN` set (if using maps)

### Files Created

- [ ] `hooks/useLocationTracking.ts` exists
- [ ] `app/components/RealTimeTracking.tsx` exists
- [ ] `WEBSOCKET_GUIDE.md` exists

### Frontend Running

- [ ] Run `npm run dev`
- [ ] Frontend opens at `http://localhost:3000`
- [ ] No build errors
- [ ] Page loads without errors

## Manual Testing ✓

### Test 1: WebSocket Connection

- [ ] Open browser console (F12)
- [ ] Login to the application
- [ ] No errors in console
- [ ] Open Network tab → filter by "WS"
- [ ] Should see a WebSocket connection to `ws://localhost:5000/socket.io/...`

### Test 2: WebSocket Events

- [ ] In browser console, type: `localStorage.debug = 'socket.io-client:*'`
- [ ] Reload page
- [ ] Console shows socket.io debug messages
- [ ] See connection attempts and successes

### Test 3: Basic Communication

- [ ] Implement `useLocationTracking` hook in a test component:

```typescript
const { isConnected } = useLocationTracking(token, true);
console.log("WebSocket connected:", isConnected);
```

- [ ] Console shows "WebSocket connected: true" after login
- [ ] Removes "false" message after few seconds

### Test 4: Location Tracking

- [ ] Create two test users (or use two browsers with different users)
- [ ] User A: Call `joinTrackingRoom("userb@example.com")`
- [ ] User B: Call `sendLocation("usera@example.com", 40.7128, -74.0060, "NYC")`
- [ ] User A: Check console for `lastLocation` event
- [ ] Console shows location data with coordinates

### Test 5: Real-Time Updates

- [ ] Set up `RealTimeTracking` component
- [ ] Click "Start Tracking" button
- [ ] Allow geolocation access when prompted
- [ ] Console shows location updates (should show current location)
- [ ] Page displays:
  - [ ] Connection status (green dot)
  - [ ] Tracking status (🔴 Tracking Active)
  - [ ] Latest location coordinates
  - [ ] Location history (if multiple updates)

### Test 6: Multiple Users Tracking

- [ ] Open 3 browser windows (or incognito windows)
- [ ] User A joins tracking room for User B
- [ ] User B joins tracking room for User C
- [ ] User C sends location
- [ ] User B receives it
- [ ] User A does NOT receive it (didn't subscribe directly)

### Test 7: Connection Management

- [ ] Verify `joinTrackingRoom` works
- [ ] Verify `leaveTrackingRoom` works
- [ ] In Network tab (WS filter), watch connection messages
- [ ] Try disconnecting from room and reconnecting

### Test 8: Error Handling

- [ ] Send invalid coordinates (latitude > 90)
- [ ] Console shows error: "Invalid coordinates"
- [ ] Send location without requester email
- [ ] Console shows error: "Requester email is required"
- [ ] Test recovers after errors

## API Endpoints Still Working ✓

WebSocket doesn't replace HTTP API, both work together:

- [ ] Register endpoint works: `POST /api/auth/register`
- [ ] Login endpoint works: `POST /api/auth/login`
- [ ] Get me endpoint works: `GET /api/auth/me`
- [ ] HTTP location update still works: `POST /api/auth/update-location`
- [ ] Tracking status works: `GET /api/auth/tracking-status`

## Performance Verification ✓

### Latency Check

- [ ] Open DevTools Network tab (WS tab)
- [ ] Send location via `send-location` event
- [ ] Check message appears in receiving browser (<100ms)
- [ ] Should be significantly faster than 5+ seconds

### Memory Check

- [ ] Open DevTools Memory tab
- [ ] Take heap snapshot before tracking
- [ ] Start tracking for 2 minutes
- [ ] Take another heap snapshot
- [ ] Memory shouldn't spike dramatically
- [ ] Around 100-200 location updates shouldn't use >10MB

### Connection Check

- [ ] Disconnect internet (airplane mode or unplug)
- [ ] Wait a few seconds
- [ ] Should see "Reconnecting..." in console
- [ ] Reconnect internet
- [ ] Should auto-reconnect (see "Connected" in console)
- [ ] Location updates resume

## Production Readiness ✓

### Code Quality

- [ ] No console errors in development
- [ ] No TypeScript errors (frontend)
- [ ] No ESLint warnings
- [ ] All imports resolved

### Security

- [ ] JWT token required for WebSocket connection
- [ ] Invalid tokens rejected with "Authentication error"
- [ ] CORS properly configured
- [ ] Sensitive data not logged in production

### Error Handling

- [ ] All error cases handled gracefully
- [ ] No unhandled promise rejections
- [ ] Console shows helpful error messages
- [ ] App doesn't crash on WebSocket errors

### Tests

- [ ] Run `npm test` in backend (if tests enabled)
- [ ] All tests pass
- [ ] Test coverage acceptable

## Logging Verification ✓

### Backend Logs

- [ ] `npm run dev` shows:
  - ✅ Database connected
  - ✅ Email transporter verified
  - ✅ Server running on port 5000
  - ✅ WebSocket enabled
- [ ] New connections show:
  - ✅ User connected: `[name] ([email])`
- [ ] Events show:
  - ✅ Room joined/left
  - 📍 Location updates
  - 👤 User actions
- [ ] Disconnections show:
  - ❌ User disconnected

### Frontend Console

- [ ] No errors (red messages)
- [ ] WebSocket connection shown
- [ ] Location updates logged
- [ ] Toast notifications show (success/error)

## Documentation ✓

- [ ] `WEBSOCKET_SETUP.md` exists (quick start)
- [ ] `backend/WEBSOCKET_GUIDE.md` exists (full backend docs)
- [ ] `backend/WEBSOCKET_IMPLEMENTATION.md` exists (summary)
- [ ] `frontend/WEBSOCKET_GUIDE.md` exists (frontend docs)
- [ ] `backend/WEBSOCKET_GUIDE.md` has event reference
- [ ] Example component exists and is documented
- [ ] Hook has JSDoc comments
- [ ] README files updated with WebSocket info

## Cleanup & Verification ✓

- [ ] No temporary console.log statements left
- [ ] No debug code in production files
- [ ] No hardcoded URLs (using env vars instead)
- [ ] No commented-out code
- [ ] Git ready for commit (run `git status`)

## Deployment Verification ✓

- [ ] Can build frontend: `npm run build`
- [ ] Can start production backend: `npm start`
- [ ] Can specify environment variables
- [ ] Can use different URLs for production
- [ ] No localhost hardcoded anywhere

## Final Checklist ✓

- [ ] 2+ browsers can track each other in real-time
- [ ] Location updates appear within 100ms
- [ ] Can handle 5+ concurrent users
- [ ] Connection auto-recovers after disconnect
- [ ] Error messages are helpful
- [ ] Documentation is complete
- [ ] No console warnings or errors
- [ ] Code is clean and readable

## Troubleshooting Guide ✓

If any item failed:

| Issue                   | Solution                                    |
| ----------------------- | ------------------------------------------- |
| WebSocket won't connect | Check CORS_ORIGIN in .env                   |
| "Auth error"            | Verify JWT token valid after login          |
| No location updates     | Call joinTrackingRoom first                 |
| Slow updates            | Check network latency, try wired connection |
| Memory leak             | Check for old listeners, use cleanup        |
| Frequent disconnects    | Check network stability                     |

## Sign-Off

```
✅ All items checked
✅ WebSocket working in development
✅ Ready for testing with team
✅ Ready for staging deployment
✅ Ready for production deployment

Date: ___________
Verified by: ___________
```

---

## Quick Verification Command

Run these commands to verify everything:

```bash
# Backend
cd backend
npm run dev &

# Frontend (in another terminal)
cd frontend
npm run dev

# Wait for both to start
# Open http://localhost:3000
# Login and test tracking
# Check Network > WS tab in DevTools
```

Expected result:

- ✅ No errors
- ✅ WebSocket connected
- ✅ Location updates in real-time

---

**Last Updated**: April 2026
**Version**: 1.0.0
