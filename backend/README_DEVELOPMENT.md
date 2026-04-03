# LocateMe Backend - Developer Guide

## Overview

LocateMe is a real-time location tracking system with secure authentication, OTP verification, and advanced rate limiting. This guide covers setup, testing, and API usage.

## Prerequisites

- Node.js >= 18
- MongoDB
- npm or yarn

## Installation

1. **Clone and Install Dependencies**

   ```bash
   cd backend
   npm install
   ```

2. **Setup Environment Variables**

   ```bash
   cp .env.example .env
   ```

   Edit `.env` and fill in:
   - `MONGO_URI` - MongoDB connection string
   - `JWT_SECRET` - Secret key for JWT tokens (use a strong random string)
   - `EMAIL_USER` - Gmail address for sending OTPs
   - `EMAIL_PASS` - Gmail app-specific password
   - `BACKEND_URL` - Your backend URL (for email links)

3. **Start Development Server**
   ```bash
   npm run dev
   ```

## Features

### 🔐 Security

- **Rate Limiting**: Protects against brute force attacks
  - Auth endpoints: 5 requests per 15 minutes
  - API endpoints: 100 requests per 15 minutes
- **Input Sanitization**: Prevents NoSQL injection and XSS attacks
  - Removes dangerous characters
  - Limits string length to 1000 characters
- **Password Security**
  - Minimum 8 characters required
  - bcryptjs hashing with salt rounds=10
  - JWT tokens with 30-day expiration

- **CORS Configuration**: Controlled cross-origin requests
- **Helmet Security**: HTTP security headers

### 📍 Location Tracking

- OTP-based verification for privacy
- Real-time location updates (HTTP + WebSocket ready)
- Location history (up to 100 updates per request)
- Multiple active tracking requests per user

### 📧 Email Notifications

- OTP delivery via Gmail
- Tracking request emails with deny links
- Automatic email transporter verification

## Testing

### Run Tests

```bash
npm test                 # Run all tests once
npm run test:watch      # Run tests in watch mode
npm run test:coverage   # Run with coverage report
```

### Test Files

- `__tests__/sanitizeMiddleware.test.js` - Input sanitization tests
- `__tests__/rateLimitMiddleware.test.js` - Rate limiting tests
- `__tests__/authController.test.js` - Authentication tests

### Test Coverage

- Middleware: 100%
- Controllers: Expanding
- Target: 80%+ overall coverage

## API Documentation

### Quick Start

#### 1. Register a New User

```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "+1234567890",
    "password": "SecurePass123!"
  }'
```

**Response:**

```json
{
  "success": true,
  "message": "User registered successfully",
  "_id": "507f1f77bcf86cd799439011",
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "+1234567890",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

#### 2. Login

```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "SecurePass123!"
  }'
```

#### 3. Send Tracking OTP

```bash
curl -X POST http://localhost:5000/api/auth/send-tracking-otp \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "targetEmail": "jane@example.com"
  }'
```

#### 4. Verify OTP

```bash
curl -X POST http://localhost:5000/api/auth/verify-otp \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "otp": "123456",
    "targetEmail": "jane@example.com"
  }'
```

#### 5. Share Location

```bash
curl -X POST http://localhost:5000/api/auth/share-location \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "requesterEmail": "john@example.com",
    "latitude": 40.7128,
    "longitude": -74.0060,
    "address": "New York, USA",
    "method": "geolocation"
  }'
```

#### 6. Get Tracked User Location

```bash
curl -X GET "http://localhost:5000/api/auth/tracked-user-location?targetEmail=jane@example.com" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Full API Reference

See `API_DOCUMENTATION.yaml` for complete OpenAPI 3.0 specification.

To view in Swagger UI:

1. Go to [swagger.io/tools/swagger-editor](https://editor.swagger.io/)
2. Copy contents of `API_DOCUMENTATION.yaml`
3. Paste into the editor

Or use Swagger UI locally:

```bash
npm install -g swagger-ui-express
# Then include in server.js for interactive docs
```

## Architecture

### File Structure

```
backend/
├── config/db.js                          # MongoDB connection
├── controllers/
│   ├── authController.js                 # Auth & tracking logic
│   ├── locationController.js             # Location sharing endpoints
│   └── websocketImplementation.guide.js  # WebSocket setup guide
├── middleware/
│   ├── authMiddleware.js                 # JWT verification
│   ├── rateLimitMiddleware.js            # Request rate limiting
│   └── sanitizeMiddleware.js             # Input validation/sanitization
├── models/User.js                        # User schema with tracking
├── routes/auth.js                        # API routes
├── __tests__/                            # Jest test files
├── server.js                             # Express server setup
├── package.json                          # Dependencies
├── .env.example                          # Environment template
├── jest.config.json                      # Jest configuration
└── API_DOCUMENTATION.yaml                # OpenAPI specification
```

### Data Flow

1. **Authentication**
   - User registers → Password hashed → JWT token generated
   - User login → Password verified → Token returned

2. **Tracking Request**
   - Requester sends OTP → Email sent to target → OTP stored with expiry
   - Target receives email with OTP or deny link
   - Target verifies OTP → Tracking activated

3. **Location Sharing**
   - Target sends location → Updated in requester's tracking request
   - Requester fetches location → Latest location returned
   - Location history maintained (last 100 updates)

## Error Handling

All errors follow standard format:

```json
{
  "success": false,
  "message": "User-friendly error message",
  "error": "Technical error (development only)",
  "details": "Additional context (development only)"
}
```

### Common HTTP Status Codes

- `200` - Success
- `201` - Created
- `400` - Bad Request (validation error)
- `401` - Unauthorized (invalid token)
- `403` - Forbidden (permission denied)
- `404` - Not Found
- `409` - Conflict (duplicate email)
- `429` - Too Many Requests (rate limited)
- `500` - Server Error

## Performance Optimization

### Rate Limiting

- **Per IP tracking**: Uses in-memory Map
- **Automatic cleanup**: Runs every hour
- **Configurable**: Via environment variables

### Database Optimization

- Indexed `email` field for fast lookups
- Indexed `targetEmail` in tracking requests
- Location history capped at 100 entries

### Security Headers

- Helmet.js adds security headers (CSP, HSTS, etc.)
- CORS restricted to configured origins
- Request size limited to 10MB

## Deployment

### Environment Setup

1. Set `NODE_ENV=production`
2. Use strong `JWT_SECRET` (minimum 32 characters)
3. Configure `CORS_ORIGIN` to frontend domain
4. Use MongoDB Atlas for production database
5. Use Gmail App Password (not regular password)

### Health Check

```bash
curl http://localhost:5000/api/health
```

## WebSocket Real-Time Tracking

For true real-time updates (instead of polling), see `websocketImplementation.guide.js` for Socket.IO setup.

## Future Enhancements

- [ ] WebSocket integration for real-time updates
- [ ] Database query optimization with aggregation
- [ ] Push notifications
- [ ] Geofencing alerts
- [ ] Tracking history export (CSV/PDF)
- [ ] Multi-language support
- [ ] Mobile app API
- [ ] Advanced analytics

## Support

For issues or questions:

1. Check `API_DOCUMENTATION.yaml` for endpoint details
2. Review error messages in development mode
3. Check MongoDB connection
4. Verify JWT_SECRET is set correctly

## License

ISC

---

**Last Updated**: April 2026
**Version**: 1.0.0
