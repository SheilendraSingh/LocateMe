import { sanitizeInput } from "../middleware/sanitizeMiddleware.js";
import { describe, it, expect, beforeEach } from "@jest/globals";

/**
 * Tests for Input Sanitization Middleware
 */
describe("Sanitization Middleware", () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      body: {},
      query: {},
      params: {},
    };
    res = {};
    next = jest.fn();
  });

  it("should remove $ signs from object values", () => {
    req.body = { name: "John$Doe", email: "test@example.com" };
    sanitizeInput(req, res, next);

    expect(req.body.name).toBe("JohnDoe");
    expect(next).toHaveBeenCalled();
  });

  it("should remove dots from object values", () => {
    req.body = { email: "test.example.com" };
    sanitizeInput(req, res, next);

    expect(req.body.email).toBe("testexamplecom");
    expect(next).toHaveBeenCalled();
  });

  it("should remove curly braces", () => {
    req.body = { data: "{test}" };
    sanitizeInput(req, res, next);

    expect(req.body.data).toBe("test");
    expect(next).toHaveBeenCalled();
  });

  it("should handle nested objects", () => {
    req.body = {
      user: {
        name: "John$Doe",
        details: { email: "test.example.com" },
      },
    };
    sanitizeInput(req, res, next);

    expect(req.body.user.name).toBe("JohnDoe");
    expect(req.body.user.details.email).toBe("testexamplecom");
    expect(next).toHaveBeenCalled();
  });

  it("should handle arrays", () => {
    req.body = { names: ["John$", "Jane.Doe"] };
    sanitizeInput(req, res, next);

    expect(req.body.names[0]).toBe("John");
    expect(req.body.names[1]).toBe("JaneDoe");
    expect(next).toHaveBeenCalled();
  });

  it("should limit string length to 1000 characters", () => {
    const longString = "a".repeat(2000);
    req.body = { text: longString };
    sanitizeInput(req, res, next);

    expect(req.body.text).toHaveLength(1000);
    expect(next).toHaveBeenCalled();
  });

  it("should handle non-object types", () => {
    req.body = null;
    sanitizeInput(req, res, next);

    expect(next).toHaveBeenCalled();
  });
});
