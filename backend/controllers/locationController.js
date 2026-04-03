// Location sharing controller for real-time tracking updates

import User from "../models/User.js";

/**
 * Get all incoming tracking requests for the current user
 * (Requests from others who want to track them)
 */
export const getIncomingTrackingRequests = async (req, res) => {
  try {
    const user = req.user;

    // Find all users who have active tracking requests targeting this email
    const incomingRequests = [];

    const allUsers = await User.find({});

    for (const otherUser of allUsers) {
      const requests = otherUser.trackingRequests?.filter(
        (req) =>
          req.targetEmail === user.email.toLowerCase() &&
          req.status === "active",
      );

      if (requests && requests.length > 0) {
        incomingRequests.push({
          requesterEmail: otherUser.email,
          requesterName: otherUser.name,
          requestedAt: requests[0].requestedAt,
          lastUpdate: requests[0].lastLocation?.timestamp || null,
        });
      }
    }

    res.status(200).json({
      success: true,
      incomingRequests,
      totalRequests: incomingRequests.length,
    });
  } catch (error) {
    console.error("Get incoming tracking requests error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get incoming tracking requests",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

/**
 * Share location with a specific requester
 * Allows the target user to send their location to someone tracking them
 */
export const shareLocationWithRequester = async (req, res) => {
  try {
    const { requesterEmail, latitude, longitude, address, method } = req.body;
    const targetUser = req.user; // User being tracked (sending location)

    if (!requesterEmail) {
      return res.status(400).json({
        success: false,
        message: "Please provide requester email",
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

    // Find the requester user
    const requesterUser = await User.findOne({
      email: requesterEmail.toLowerCase(),
    });

    if (!requesterUser) {
      return res.status(404).json({
        success: false,
        message: "Requester not found",
      });
    }

    // Find the active tracking request in requester's requests
    const trackingRequest = requesterUser.trackingRequests.find(
      (req) =>
        req.targetEmail === targetUser.email.toLowerCase() &&
        req.status === "active",
    );

    if (!trackingRequest) {
      return res.status(404).json({
        success: false,
        message: "No active tracking request found from this requester",
      });
    }

    // Update the location
    const locationData = {
      latitude: Number(latitude),
      longitude: Number(longitude),
      address: address || "Unknown location",
      method: method || "geolocation",
      timestamp: new Date(),
    };

    trackingRequest.lastLocation = locationData;
    trackingRequest.locationHistory.push(locationData);

    // Keep only last 100 location updates
    if (trackingRequest.locationHistory.length > 100) {
      trackingRequest.locationHistory =
        trackingRequest.locationHistory.slice(-100);
    }

    await requesterUser.save();

    console.log(
      `✅ Location shared by: ${targetUser.email} with: ${requesterEmail}`,
    );
    res.status(200).json({
      success: true,
      message: "Location shared successfully",
      locationData,
    });
  } catch (error) {
    console.error("Share location error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to share location",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

/**
 * Get latest location of a tracked user
 * Only works if there's an active tracking request
 */
export const getTrackedUserLocation = async (req, res) => {
  try {
    const { targetEmail } = req.query;
    const requesterUser = req.user; // User making the request

    if (!targetEmail) {
      return res.status(400).json({
        success: false,
        message: "Please provide target email",
      });
    }

    // Verify that there's an active tracking request
    const trackingRequest = requesterUser.trackingRequests.find(
      (req) =>
        req.targetEmail === targetEmail.toLowerCase() &&
        req.status === "active",
    );

    if (!trackingRequest) {
      return res.status(403).json({
        success: false,
        message: "No active tracking permission for this user",
      });
    }

    res.status(200).json({
      success: true,
      targetEmail: targetEmail.toLowerCase(),
      lastLocation: trackingRequest.lastLocation || null,
      locationHistory: trackingRequest.locationHistory.slice(-10) || [], // Last 10 locations
      updatedAt: trackingRequest.lastLocation?.timestamp || null,
    });
  } catch (error) {
    console.error("Get tracked user location error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get location",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};
