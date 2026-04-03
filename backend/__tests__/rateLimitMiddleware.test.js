import { rateLimit } from "../middleware/rateLimitMiddleware.js";
import { describe, it, expect, beforeEach } from "@jest/globals";

/**
 * Tests for Rate Limiting Middleware
 */
describe("Rate Limiting Middleware", () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      ip: "192.168.1.1",
      connection: {
        remoteAddress: "192.168.1.1",
      },
      headers: {},
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    next = jest.fn();
  });

  it("should allow requests under the limit", () => {
    const middleware = rateLimit(60000, 15); // 15 requests per minute

    for (let i = 0; i < 5; i++) {
      middleware(req, res, next);
    }

    expect(next).toHaveBeenCalledTimes(5);
    expect(res.status).not.toHaveBeenCalled();
  });

  it("should reject requests over the limit", () => {
    const middleware = rateLimit(60000, 2); // 2 requests per minute

    // Make 3 requests
    middleware(req, res, next);
    middleware(req, res, next);
    middleware(req, res, next);

    expect(next).toHaveBeenCalledTimes(2);
    expect(res.status).toHaveBeenCalledWith(429);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining("Too many requests"),
      }),
    );
  });

  it("should track different IPs separately", () => {
    const middleware = rateLimit(60000, 2);

    // Request from IP 1
    middleware(req, res, next);
    middleware(req, res, next);

    // Request from IP 2
    req.ip = "192.168.1.2";
    middleware(req, res, next);

    expect(next).toHaveBeenCalledTimes(3);
    expect(res.status).not.toHaveBeenCalled();
  });

  it("should reset after time window expires", async () => {
    const middleware = rateLimit(100, 1); // 1 request per 100ms

    // First request (should pass)
    middleware(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);

    // Second request (should be blocked)
    middleware(req, res, next);
    expect(res.status).toHaveBeenCalledWith(429);

    // Wait for window to expire
    await new Promise((resolve) => setTimeout(resolve, 150));

    // Reset mocks
    next.mockClear();
    res.status.mockClear();

    // Third request (should pass after window expires)
    middleware(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
  });

  it("should use X-Forwarded-For header for client IP", () => {
    req.headers['x-forwarded-for'] = '203.0.113.1, 198.51.100.1';
    const middleware = rateLimit(60000, 5);

    middleware(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    // The middleware should use '203.0.113.1' as the client IP
  });

  it("should use X-Real-IP header for client IP", () => {
    req.headers['x-real-ip'] = '203.0.113.2';
    const middleware = rateLimit(60000, 5);

    middleware(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
  });

  it("should use X-Client-IP header for client IP", () => {
    req.headers['x-client-ip'] = '203.0.113.3';
    const middleware = rateLimit(60000, 5);

    middleware(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
  });

  it("should use CF-Connecting-IP header for client IP (Cloudflare)", () => {
    req.headers['cf-connecting-ip'] = '203.0.113.4';
    const middleware = rateLimit(60000, 5);

    middleware(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
  });

  it("should handle multiple IPs in X-Forwarded-For correctly", () => {
    req.headers['x-forwarded-for'] = '203.0.113.5, 198.51.100.2, 192.168.1.1';
    const middleware = rateLimit(60000, 5);

    middleware(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    // Should use the first IP: '203.0.113.5'
  });

  it("should track different IPs from headers separately", () => {
    const middleware = rateLimit(60000, 2);

    // First IP via X-Forwarded-For
    req.headers['x-forwarded-for'] = '203.0.113.10';
    middleware(req, res, next);
    middleware(req, res, next);
    middleware(req, res, next); // Should be blocked

    // Reset mocks
    next.mockClear();
    res.status.mockClear();

    // Second IP via X-Real-IP (should not be blocked)
    req.headers['x-real-ip'] = '203.0.113.11';
    delete req.headers['x-forwarded-for'];
    middleware(req, res, next);

    expect(next).toHaveBeenCalledTimes(1); // Second IP should be allowed
    expect(res.status).toHaveBeenCalledTimes(1); // First IP was blocked
  });
});
