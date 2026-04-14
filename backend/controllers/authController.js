import User from "../models/User.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";
import { validateStrongPassword } from "../middleware/sanitizeMiddleware.js";

// Generate JWT
const generateToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: "30d" });

//  Email Transporter Configuration with verification and error handling for better reliability and debugging
let transporter;

const createTransporter = () => {
  if (transporter) return transporter;

  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    throw new Error(
      "Email configuration is missing. Please set EMAIL_USER and EMAIL_PASS in your .env file.",
    );
  }

  transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  return transporter;
};

// Email Transporter verification
export const verifyTransporter = async () => {
  try {
    const transporterInstance = createTransporter(); // FIX
    await transporterInstance.verify();
    console.log("✅ Email transporter verified successfully");
  } catch (error) {
    console.error("❌ Email transporter verification failed:", error.message);

    // DO NOT crash server — just warn
    console.warn("⚠️ Email features will not work until fixed.");
  }
};

// Validate email format and password strength for better security and user experience
const validateEmail = (email) => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

const normalizeEmail = (email) => {
  return String(email || "")
    .trim()
    .toLowerCase();
};

// Password must be at least 6 characters long - can be enhanced with more complex rules if needed for better security and user experience
// Helper: Format user response to exclude sensitive info and include token for consistent API responses and better security
const formatUser = (user) => {
  if (!user) return null;

  return {
    _id: user._id,
    name: user.name,
    email: user.email,
    phone: user.phone,
  };
};

const validatePassword = (password) => {
  // Minimum 8 characters for better security
  // Can contain letters, numbers, and special characters
  return password.length >= 8;
};

//REGISTER and LOGIN functions with improved error handling, input validation, and consistent response formatting for better security and user experience
export const registerUser = async (req, res) => {
  try {
    const { name, email, phone, password } = req.body;

    // Validate required fields
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Please provide name, email, and password",
      });
    }

    if (!validateEmail(email)) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid email address",
      });
    }

    if (!validatePassword(password)) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 8 characters long",
      });
    }

    // Check if user already exists
    const userExists = await User.findOne({ email: email.toLowerCase() });
    if (userExists) {
      return res.status(409).json({
        success: false,
        message: "Email already registered. Please login instead.",
      });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create new user
    const user = await User.create({
      name: name.trim(),
      email: email.toLowerCase(),
      phone: phone ? phone.trim() : undefined,
      password: hashedPassword,
    });

    const token = generateToken(user._id);

    console.log(`✅ New user registered: ${email}`);
    res.status(201).json({
      success: true,
      message: "User registered successfully",
      ...formatUser(user),
      token,
    });
  } catch (error) {
    console.error("Registration error:", {
      email: req.body.email,
      error: error.message,
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
    });

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Email already exists",
      });
    }

    res.status(500).json({
      success: false,
      message: "Error registering user. Please try again later.",
    });
  }
};

export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate inputs
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Please provide email and password",
      });
    }

    if (!validateEmail(email)) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid email address",
      });
    }

    // Find user by email
    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      console.warn(`⚠️ Failed login attempt for: ${email}`);
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    const token = generateToken(user._id);

    console.log(`✅ User logged in: ${email}`);
    res.status(200).json({
      success: true,
      message: "Login successful",
      ...formatUser(user),
      token,
    });
  } catch (error) {
    console.error("Login error:", {
      email: req.body.email,
      error: error.message,
    });

    res.status(500).json({
      success: false,
      message: "Error during login. Please try again later.",
    });
  }
};

export const getMe = async (req, res) => {
  res.status(200).json(req.user);
};

// Generate OTP
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Send Email OTP
const sendEmailOTP = async (email, otp, denyLink = null) => {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    throw new Error(
      "Email configuration is missing. Please set EMAIL_USER and EMAIL_PASS in your .env file.",
    );
  }
  const transporter = createTransporter();

  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
      <h2 style="color: #333;">LocateMe Tracking Request</h2>
      <p>Someone wants to track your location. Your OTP is: <strong>${otp}</strong></p>
      <p>This OTP will expire in 10 minutes.</p>
      ${
        denyLink
          ? `<p>If you do not want to be tracked, click the button below:</p>
      <a href="${denyLink}" style="display: inline-block; padding: 10px 20px; background-color: #dc3545; color: white; text-decoration: none; border-radius: 5px; margin-top: 10px;">Deny Tracking Request</a>`
          : ""
      }
      <p style="margin-top: 20px; font-size: 12px; color: #666;">If you did not expect this request, please ignore this email.</p>
    </div>
  `;

  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to: email,
    subject: "Your OTP for LocateMe Tracking Request",
    text: `Your OTP is: ${otp}${
      denyLink
        ? `\n\nIf you want to deny this tracking request, visit: ${denyLink}`
        : ""
    }`,
    html: htmlContent,
  });
};

// Send OTP for tracking consent
export const sendTrackingOTP = async (req, res) => {
  try {
    const { targetEmail } = req.body;
    const user = req.user;
    const normalizedTargetEmail = normalizeEmail(targetEmail);

    if (!normalizedTargetEmail) {
      return res.status(400).json({
        success: false,
        message: "Please provide target email address",
      });
    }

    if (!validateEmail(normalizedTargetEmail)) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid target email address",
      });
    }

    // Check if tracking request already exists (pending or active)
    const existingRequest = user.trackingRequests.find(
      (req) =>
        req.targetEmail === normalizedTargetEmail &&
        (req.status === "pending" || req.status === "active"),
    );

    if (existingRequest) {
      return res.status(400).json({
        success: false,
        message: "Active tracking request already exists for this email",
      });
    }

    const otp = generateOTP();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Create deny token
    const denyToken = jwt.sign(
      { requesterId: user._id, targetEmail: normalizedTargetEmail },
      process.env.JWT_SECRET,
      { expiresIn: "10m" },
    );

    // Create tracking request
    const trackingRequest = {
      targetEmail: normalizedTargetEmail,
      status: "pending",
      requestedAt: new Date(),
    };

    user.trackingRequests.push(trackingRequest);
    user.tempOtp = otp;
    user.tempOtpExpiry = otpExpiry;
    await user.save();

    // Create deny link
    const denyLink = `${
      process.env.BACKEND_URL || "http://localhost:5000"
    }/api/auth/deny-tracking-link/${denyToken}`;

    try {
      await sendEmailOTP(normalizedTargetEmail, otp, denyLink);
      console.log(`✅ Tracking OTP sent to: ${normalizedTargetEmail}`);
      res.status(200).json({
        success: true,
        message: "OTP sent successfully. User has 10 minutes to respond.",
      });
    } catch (emailError) {
      console.error("Email sending failed:", emailError.message);

      // Clean up failed request
      user.trackingRequests = user.trackingRequests.filter(
        (r) => r.targetEmail !== normalizedTargetEmail,
      );
      user.tempOtp = undefined;
      user.tempOtpExpiry = undefined;
      await user.save();

      return res.status(500).json({
        success: false,
        message:
          "Failed to send OTP. Check email configuration or try again later.",
        error:
          process.env.NODE_ENV === "development"
            ? emailError.message
            : undefined,
      });
    }
  } catch (error) {
    console.error("OTP sending error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to send OTP",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

// Verify OTP
export const verifyOTP = async (req, res) => {
  try {
    const { otp, targetEmail } = req.body;
    const user = req.user;
    const normalizedTargetEmail = targetEmail
      ? normalizeEmail(targetEmail)
      : undefined;

    if (!otp) {
      return res.status(400).json({
        success: false,
        message: "Please provide the OTP",
      });
    }

    if (user.tempOtp !== otp) {
      return res.status(400).json({
        success: false,
        message: "Invalid OTP",
      });
    }

    if (!user.tempOtpExpiry || user.tempOtpExpiry < new Date()) {
      return res.status(400).json({
        success: false,
        message: "OTP has expired. Please request a new one.",
      });
    }

    // Find the pending tracking request and mark it as active
    const pendingRequest = user.trackingRequests.find(
      (req) =>
        req.status === "pending" &&
        (!normalizedTargetEmail || req.targetEmail === normalizedTargetEmail),
    );

    if (!pendingRequest) {
      return res.status(404).json({
        success: false,
        message: "No pending tracking request found",
      });
    }

    pendingRequest.status = "active";

    user.tempOtp = undefined;
    user.tempOtpExpiry = undefined;
    await user.save();

    console.log(`✅ OTP verified for tracking: ${pendingRequest.targetEmail}`);
    res.status(200).json({
      success: true,
      message: "OTP verified successfully. Tracking is now active.",
    });
  } catch (error) {
    console.error("OTP verification error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to verify OTP",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

// Deny tracking request
export const denyTracking = async (req, res) => {
  try {
    const { otp } = req.body;
    const user = req.user;

    if (user.tempOtp !== otp || user.tempOtpExpiry < new Date()) {
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }

    // Find the pending tracking request and mark it as denied
    const pendingRequest = user.trackingRequests.find(
      (req) => req.status === "pending",
    );
    if (pendingRequest) {
      pendingRequest.status = "denied";
      pendingRequest.deniedAt = new Date();
      pendingRequest.deniedReason = "User denied tracking request";
    }

    user.tempOtp = undefined;
    user.tempOtpExpiry = undefined;
    await user.save();

    res.status(200).json({ message: "Tracking request denied" });
  } catch (error) {
    res.status(500).json({ message: "Failed to deny tracking" });
  }
};

// Update location for active tracking
export const updateLocation = async (req, res) => {
  try {
    const { targetEmail, latitude, longitude, address, method } = req.body;
    const user = req.user;
    const normalizedTargetEmail = normalizeEmail(targetEmail);

    if (!normalizedTargetEmail) {
      return res.status(400).json({
        success: false,
        message: "Please provide target email",
      });
    }

    if (!validateEmail(normalizedTargetEmail)) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid target email address",
      });
    }

    if (latitude === undefined || longitude === undefined) {
      return res.status(400).json({
        success: false,
        message: "Invalid location data. Latitude and longitude required.",
      });
    }

    // Validate coordinates
    if (
      latitude < -90 ||
      latitude > 90 ||
      longitude < -180 ||
      longitude > 180
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid coordinates. Latitude must be between -90 and 90, longitude between -180 and 180",
      });
    }

    const trackingRequest = user.trackingRequests.find(
      (req) =>
        req.targetEmail === normalizedTargetEmail &&
        req.status === "active",
    );

    if (!trackingRequest) {
      return res.status(404).json({
        success: false,
        message: "Active tracking not found for this email",
      });
    }

    const locationData = {
      latitude: Number(latitude),
      longitude: Number(longitude),
      address: address || "Unknown location",
      method: method || "geolocation",
      timestamp: new Date(),
    };

    trackingRequest.lastLocation = locationData;
    trackingRequest.locationHistory.push(locationData);

    // Keep only last 100 location updates (increased from 50)
    if (trackingRequest.locationHistory.length > 100) {
      trackingRequest.locationHistory =
        trackingRequest.locationHistory.slice(-100);
    }

    await user.save();

    console.log(
      `✅ Location updated for: ${normalizedTargetEmail} at ${latitude}, ${longitude}`,
    );
    res.status(200).json({
      success: true,
      message: "Location updated successfully",
    });
  } catch (error) {
    console.error("Location update error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update location",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

// Get tracking status
export const getTrackingStatus = async (req, res) => {
  try {
    const user = req.user;

    const trackingStats = {
      pending: user.trackingRequests.filter((req) => req.status === "pending")
        .length,
      active: user.trackingRequests.filter((req) => req.status === "active")
        .length,
      denied: user.trackingRequests.filter((req) => req.status === "denied")
        .length,
      total: user.trackingRequests.length,
    };

    const trackingDetails = {
      pending: user.trackingRequests
        .filter((req) => req.status === "pending")
        .map((r) => ({
          ...r,
          requestedAtTime: new Date(r.requestedAt).toISOString(),
        })),
      active: user.trackingRequests
        .filter((req) => req.status === "active")
        .map((r) => ({
          ...r,
          activeSince: new Date(r.requestedAt).toISOString(),
        })),
      denied: user.trackingRequests
        .filter((req) => req.status === "denied")
        .map((r) => ({
          ...r,
          deniedAtTime: new Date(r.deniedAt).toISOString(),
        })),
    };

    res.status(200).json({
      success: true,
      stats: trackingStats,
      details: trackingDetails,
    });
  } catch (error) {
    console.error("Get tracking status error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get tracking status",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

// Close tracking session
export const closeTracking = async (req, res) => {
  try {
    const { targetEmail } = req.body;
    const user = req.user;
    const normalizedTargetEmail = normalizeEmail(targetEmail);
    const legacyTargetEmail = normalizedTargetEmail.replace(/\./g, "");
    const matchesTargetEmail = (email) =>
      email === normalizedTargetEmail || email === legacyTargetEmail;

    if (!normalizedTargetEmail) {
      return res.status(400).json({ message: "Target email is required" });
    }

    const trackingRequest = (user.trackingRequests || []).find(
      (req) =>
        matchesTargetEmail(req.targetEmail) &&
        (req.status === "active" || req.status === "pending"),
    );

    if (!trackingRequest) {
      return res.status(404).json({ message: "Tracking request not found" });
    }

    // Remove the tracking request entirely
    user.trackingRequests = (user.trackingRequests || []).filter(
      (req) =>
        !(
          matchesTargetEmail(req.targetEmail) &&
          (req.status === "active" || req.status === "pending")
        ),
    );

    // Clear temp OTP if it's a pending request
    if (trackingRequest.status === "pending") {
      user.tempOtp = undefined;
      user.tempOtpExpiry = undefined;
    }

    await user.save();

    res.status(200).json({ message: "Tracking closed successfully" });
  } catch (error) {
    res.status(500).json({ message: "Failed to close tracking" });
  }
};

// Deny tracking request via email link
export const denyTrackingViaLink = async (req, res) => {
  try {
    const { token } = req.params;

    // Verify the token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const { requesterId, targetEmail } = decoded;

    // Find the requester user
    const user = await User.findById(requesterId);
    if (!user) {
      return res.status(404).json({ message: "Requester not found" });
    }

    // Find all pending tracking requests for this email
    const pendingRequests = user.trackingRequests.filter(
      (req) => req.targetEmail === targetEmail && req.status === "pending",
    );

    if (pendingRequests.length === 0) {
      return res
        .status(404)
        .json({ message: "No pending tracking requests found for this email" });
    }

    // Deny all pending requests
    pendingRequests.forEach((request) => {
      request.status = "denied";
      request.deniedAt = new Date();
      request.deniedReason = "User denied tracking request via email";
    });

    // Clear temp OTP
    user.tempOtp = undefined;
    user.tempOtpExpiry = undefined;

    await user.save();

    // Redirect to a success page or show a message
    res.send(`
      <div style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
        <h2>Tracking Request Denied</h2>
        <p>You have successfully denied the tracking request.</p>
        <p>You can close this window now.</p>
      </div>
    `);
  } catch (error) {
    console.error("Deny tracking via link error:", error);
    if (
      error.name === "JsonWebTokenError" ||
      error.name === "TokenExpiredError"
    ) {
      return res.status(400).send(`
        <div style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
          <h2>Invalid or Expired Link</h2>
          <p>The link is invalid or has expired.</p>
        </div>
      `);
    }
    res.status(500).send(`
      <div style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
        <h2>Error</h2>
        <p>An error occurred while processing your request.</p>
      </div>
    `);
  }
};
