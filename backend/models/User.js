import mongoose from "mongoose";

const trackingSchema = new mongoose.Schema({
  targetEmail: { type: String, required: true, index: true },
  targetUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  status: {
    type: String,
    enum: ["pending", "active", "denied"],
    default: "pending",
  },
  requestedAt: { type: Date, default: Date.now },
  lastLocation: {
    latitude: Number,
    longitude: Number,
    address: String,
    method: String,
    timestamp: { type: Date, default: Date.now },
  },
  locationHistory: {
    type: [
      {
        latitude: Number,
        longitude: Number,
        address: String,
        method: String,
        timestamp: { type: Date, default: Date.now },
      },
    ],
    default: [],
  },
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hrs
  },
  deniedAt: Date,
  deniedReason: String,
});

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    phone: { type: String }, // Optional for now - only email OTP
    password: { type: String, required: true },

    tempOtp: { type: String, default: null }, // For tracking OTP
    tempOtpExpiry: { type: Date, default: null },
    trackingRequests: {
      type: [trackingSchema],
      default: [],
    }, // Pending, active, and denied tracking requests
  },
  { timestamps: true },
);

export default mongoose.model("User", userSchema);
