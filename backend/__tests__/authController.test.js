import { describe, it, expect, beforeEach, jest } from "@jest/globals";
import {
  registerUser,
  loginUser,
  getMe,
} from "../controllers/authController.js";

// Mock the User model
jest.mock("../models/User.js");

/**
 * Tests for Auth Controller
 */
describe("Auth Controller", () => {
  let req, res;

  beforeEach(() => {
    req = {
      body: {},
      user: {},
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
  });

  describe("registerUser", () => {
    it("should reject registration with missing fields", async () => {
      req.body = { email: "test@example.com" }; // Missing name and password

      await registerUser(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: expect.stringContaining("name, email, and password"),
        }),
      );
    });

    it("should reject invalid email format", async () => {
      req.body = {
        name: "John Doe",
        email: "invalid-email",
        password: "SecurePass123!",
      };

      await registerUser(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: expect.stringContaining("valid email"),
        }),
      );
    });

    it("should reject password less than 8 characters", async () => {
      req.body = {
        name: "John Doe",
        email: "test@example.com",
        password: "short",
      };

      await registerUser(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: expect.stringContaining("8 characters"),
        }),
      );
    });
  });

  describe("getMe", () => {
    it("should return current user info", async () => {
      req.user = {
        _id: "123",
        name: "John Doe",
        email: "john@example.com",
      };

      await getMe(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(req.user);
    });
  });
});
