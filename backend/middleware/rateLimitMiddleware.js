// Simple in-memory rate limiting middleware
// Tracks requests by client IP address

const requestMap = new Map();

// Helper function to get client IP address
const getClientIP = (req) => {
  // Check for IP from various proxy headers (in order of preference)
  const forwardedFor = req.headers["x-forwarded-for"];
  const realIP = req.headers["x-real-ip"];
  const clientIP = req.headers["x-client-ip"];
  const cfConnectingIP = req.headers["cf-connecting-ip"]; // Cloudflare

  // If behind proxy, use forwarded headers
  if (forwardedFor) {
    // X-Forwarded-For can contain multiple IPs, take the first one (original client)
    return forwardedFor.split(",")[0].trim();
  }

  if (realIP) {
    return realIP;
  }

  if (clientIP) {
    return clientIP;
  }

  if (cfConnectingIP) {
    return cfConnectingIP;
  }

  // Fallback to Express's req.ip (set by trust proxy)
  if (req.ip) {
    return req.ip;
  }

  // Last resort: connection remote address
  return (
    req.connection?.remoteAddress ||
    req.socket?.remoteAddress ||
    req.connection?.socket?.remoteAddress ||
    "unknown"
  );
};

export const rateLimit = (windowMs = 900000, maxRequests = 100) => {
  return (req, res, next) => {
    const clientIP = getClientIP(req);
    const now = Date.now();

    // Log the IP for debugging (remove in production)
    console.log(`Rate limiting check for IP: ${clientIP}`);

    if (!requestMap.has(clientIP)) {
      requestMap.set(clientIP, []);
    }

    const requests = requestMap.get(clientIP);

    // Remove old requests outside the window
    const validRequests = requests.filter((time) => now - time < windowMs);
    requestMap.set(clientIP, validRequests);

    // Check if limit exceeded
    if (validRequests.length >= maxRequests) {
      console.log(`Rate limit exceeded for IP: ${clientIP}`);
      return res.status(429).json({
        message: "Too many requests from this IP. Please try again later.",
        retryAfter: Math.ceil((validRequests[0] + windowMs - now) / 1000),
        clientIP: process.env.NODE_ENV === "development" ? clientIP : undefined, // Only show IP in dev
      });
    }

    // Add current request
    validRequests.push(now);
    next();
  };
};

// Auth-specific rate limiting - stricter for login/register
export const authRateLimit = (windowMs = 900000, maxRequests = 5) => {
  return rateLimit(windowMs, maxRequests);
};

// API rate limiting - general purpose
export const apiRateLimit = (
  windowMs = parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 900000,
  maxRequests = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
) => {
  return rateLimit(windowMs, maxRequests);
};

// Cleanup old entries periodically (every hour)
setInterval(() => {
  const now = Date.now();
  const windowMs = parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 900000;

  for (const [ip, requests] of requestMap) {
    const validRequests = requests.filter((time) => now - time < windowMs);
    if (validRequests.length === 0) {
      requestMap.delete(ip);
    } else {
      requestMap.set(ip, validRequests);
    }
  }
}, 3600000);
