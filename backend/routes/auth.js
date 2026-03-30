import express from "express";
import {
  registerUser,
  loginUser,
  getMe,
  sendTrackingOTP,
  verifyOTP,
  denyTracking,
  updateLocation,
  getTrackingStatus,
  closeTracking,
  denyTrackingViaLink,
} from "../controllers/authController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/register", registerUser);
router.post("/login", loginUser);
router.get("/me", protect, getMe);
router.post("/send-tracking-otp", protect, sendTrackingOTP);
router.post("/verify-otp", protect, verifyOTP);
router.post("/deny-tracking", protect, denyTracking);
router.post("/update-location", protect, updateLocation);
router.get("/tracking-status", protect, getTrackingStatus);
router.post("/close-tracking", protect, closeTracking);
router.get("/deny-tracking-link/:token", denyTrackingViaLink);

export default router;
