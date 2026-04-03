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
import {
  getIncomingTrackingRequests,
  shareLocationWithRequester,
  getTrackedUserLocation,
} from "../controllers/locationController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

// Auth endpoints
router.post("/register", registerUser);
router.post("/login", loginUser);
router.get("/me", protect, getMe);

// Tracking request endpoints
router.post("/send-tracking-otp", protect, sendTrackingOTP);
router.post("/verify-otp", protect, verifyOTP);
router.post("/deny-tracking", protect, denyTracking);
router.post("/close-tracking", protect, closeTracking);
router.get("/deny-tracking-link/:token", denyTrackingViaLink);
router.get("/tracking-status", protect, getTrackingStatus);

// Location sharing endpoints (real-time tracking)
router.get("/incoming-tracking-requests", protect, getIncomingTrackingRequests);
router.post("/share-location", protect, shareLocationWithRequester);
router.get("/tracked-user-location", protect, getTrackedUserLocation);

// Legacy endpoint (kept for backward compatibility)
router.post("/update-location", protect, updateLocation);

export default router;
