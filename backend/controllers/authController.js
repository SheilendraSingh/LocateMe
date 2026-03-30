import User from "../models/User.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";

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
  return password.length >= 6;
};

//REGISTER and LOGIN functions with improved error handling, input validation, and consistent response formatting for better security and user experience
export const registerUser = async (req, res) => {
  try {
    const { name, email, phone, password } = req.body;

    if (!name || !email || !password) {
      return res
        .status(400)
        .json({ message: "Please fill all required fields" });
    }

    if (!validateEmail(email)) {
      return res.status(400).json({ message: "Invalid email format" });
    }

    if (!validatePassword(password)) {
      return res
        .status(400)
        .json({ message: "Password must be at least 6 characters" });
    }

    const userExists = await User.findOne({ email });
    if (userExists)
      return res.status(400).json({ message: "User already exists" });

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = await User.create({
      name,
      email,
      phone,
      password: hashedPassword,
    });

    const token = generateToken(user._id);
    res.json({ ...formatUser(user), token });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Server error during registration" });
  }
};

export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password required" });
    }

    const user = await User.findOne({ email });

    if (user && (await bcrypt.compare(password, user.password))) {
      const token = generateToken(user._id);
      res.json({ ...formatUser(user), token });
    } else {
      return res.status(401).json({ message: "Invalid credentials" });
    }
  } catch (error) {
    return res.status(500).json({ message: "Server error during login" });
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

    if (!targetEmail) {
      return res
        .status(400)
        .json({ message: "Please provide an email address" });
    }

    // Check if tracking request already exists (pending or active)
    const existingRequest = user.trackingRequests.find(
      (req) =>
        req.targetEmail === targetEmail &&
        (req.status === "pending" || req.status === "active"),
    );

    if (existingRequest) {
      return res
        .status(400)
        .json({ message: "Tracking request already exists for this email" });
    }

    const otp = generateOTP();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Create deny token
    const denyToken = jwt.sign(
      { requesterId: user._id, targetEmail },
      process.env.JWT_SECRET,
      { expiresIn: "10m" },
    );

    // Create tracking request
    const trackingRequest = {
      targetEmail,
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

    let emailSent = false;

    try {
      await sendEmailOTP(targetEmail, otp, denyLink);
      emailSent = true;
    } catch (emailError) {
      console.error("Email sending failed:", emailError);
    }

    if (!emailSent) {
      return res.status(500).json({
        message: "Failed to send OTP. Please check your email configuration.",
      });
    }

    res.status(200).json({ message: "OTP sent via email" });
  } catch (error) {
    console.error("OTP sending error:", error);
    if (error.name === "ValidationError") {
      return res.status(400).json({
        message: "Validation error",
        details: Object.values(error.errors)
          .map((err) => err.message)
          .join(", "),
      });
    }
    res.status(500).json({ message: "Failed to send OTP" });
  }
};

// Verify OTP
export const verifyOTP = async (req, res) => {
  try {
    const { otp } = req.body;
    const user = req.user;

    if (user.tempOtp !== otp || user.tempOtpExpiry < new Date()) {
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }

    // Find the pending tracking request and mark it as active
    const pendingRequest = user.trackingRequests.find(
      (req) => req.status === "pending",
    );
    if (pendingRequest) {
      pendingRequest.status = "active";
    }

    user.tempOtp = undefined;
    user.tempOtpExpiry = undefined;
    await user.save();

    res.status(200).json({ message: "OTP verified" });
  } catch (error) {
    res.status(500).json({ message: "Failed to verify OTP" });
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

    const trackingRequest = user.trackingRequests.find(
      (req) => req.targetEmail === targetEmail && req.status === "active",
    );

    if (!trackingRequest) {
      return res.status(404).json({ message: "Active tracking not found" });
    }

    if (!latitude || !longitude) {
      return res.status(400).json({ message: "Invalid location data" });
    }

    const locationData = {
      latitude,
      longitude,
      address,
      method,
      timestamp: new Date(),
    };

    trackingRequest.lastLocation = locationData;
    trackingRequest.locationHistory.push(locationData);

    // Keep only last 50 location updates
    if (trackingRequest.locationHistory.length > 50) {
      trackingRequest.locationHistory =
        trackingRequest.locationHistory.slice(-50);
    }

    await user.save();

    res.status(200).json({ message: "Location updated successfully" });
  } catch (error) {
    res.status(500).json({ message: "Failed to update location" });
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
      pending: user.trackingRequests.filter((req) => req.status === "pending"),
      active: user.trackingRequests.filter((req) => req.status === "active"),
      denied: user.trackingRequests.filter((req) => req.status === "denied"),
    };

    res.status(200).json({
      stats: trackingStats,
      details: trackingDetails,
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to get tracking status" });
  }
};

// Close tracking session
export const closeTracking = async (req, res) => {
  try {
    const { targetEmail } = req.body;
    const user = req.user;

    const trackingRequest = (user.trackingRequests || []).find(
      (req) =>
        req.targetEmail === targetEmail &&
        (req.status === "active" || req.status === "pending"),
    );

    if (!trackingRequest) {
      return res.status(404).json({ message: "Tracking request not found" });
    }

    // Remove the tracking request entirely
    user.trackingRequests = (user.trackingRequests || []).filter(
      (req) =>
        !(
          req.targetEmail === targetEmail &&
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
