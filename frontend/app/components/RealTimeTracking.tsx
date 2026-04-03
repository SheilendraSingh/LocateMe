"use client";

import { useEffect, useState, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import { useLocationTracking } from "@/hooks/useLocationTracking";
import toast from "react-hot-toast";
import Map from "@/components/Map";

// Type definitions for location history
interface LocationHistoryItem {
    latitude: number;
    longitude: number;
    timestamp: Date;
    accuracy?: number;
}

/**
 * Real-time Location Tracking Component with WebSocket and Mapbox
 * Demonstrates how to use the WebSocket hook for live location updates with Mapbox visualization
 */
export default function RealTimeTracking({ targetEmail }: { targetEmail: string }) {
    const { token } = useAuth();
    const {
        isConnected,
        lastLocation,
        locationError,
        activeRooms,
        joinTrackingRoom,
        leaveTrackingRoom,
        sendLocation,
        getActiveTracking,
    } = useLocationTracking(token, true);

    const [isTracking, setIsTracking] = useState(false);
    const [locationHistory, setLocationHistory] = useState<LocationHistoryItem[]>([]);
    const [updateFrequency, setUpdateFrequency] = useState(5); // seconds
    const watchIdRef = useRef<number | null>(null);

    // Show connection status
    useEffect(() => {
        if (isConnected) {
            toast.success("✅ Connected to live tracking");
        } else if (locationError) {
            toast.error(`❌ ${locationError}`);
        }
    }, [isConnected, locationError]);

    // Start live location sharing
    const startLiveTracking = async () => {
        if (!navigator.geolocation) {
            toast.error("Geolocation not supported");
            return;
        }

        try {
            // Join the receiving room first
            joinTrackingRoom(targetEmail);

            // Start watching position
            watchIdRef.current = navigator.geolocation.watchPosition(
                (position) => {
                    const { latitude, longitude, accuracy } = position.coords;

                    // Send location via WebSocket
                    const success = sendLocation(
                        targetEmail,
                        latitude,
                        longitude,
                        `Accuracy: ${Math.round(accuracy)}m`,
                        "geolocation",
                    );

                    if (success) {
                        // Add to history
                        const locationData = {
                            latitude,
                            longitude,
                            timestamp: new Date(),
                            accuracy,
                        };

                        setLocationHistory((prev) => [
                            ...prev.slice(-19), // Keep last 20
                            locationData,
                        ]);
                    }
                },
                (error) => {
                    console.error("Geolocation error:", error);
                    toast.error(`Geolocation error: ${error.message}`);
                    stopLiveTracking();
                },
                {
                    enableHighAccuracy: true,
                    maximumAge: updateFrequency * 1000,
                    timeout: 10000,
                },
            );

            setIsTracking(true);
            toast.success("🔴 Live tracking started");
        } catch (error) {
            console.error("Error starting tracking:", error);
            toast.error("Failed to start tracking");
        }
    };

    // Stop live location sharing
    const stopLiveTracking = () => {
        if (watchIdRef.current !== null) {
            navigator.geolocation.clearWatch(watchIdRef.current);
            watchIdRef.current = null;
        }

        leaveTrackingRoom(targetEmail);
        setIsTracking(false);
        toast.success("⚫ Live tracking stopped");
    };

    // Toggle tracking
    const toggleTracking = () => {
        if (isTracking) {
            stopLiveTracking();
        } else {
            startLiveTracking();
        }
    };

    // Get active tracking rooms
    const handleGetActiveRooms = () => {
        getActiveTracking();
        setTimeout(() => {
            toast.success(`${activeRooms.length} active tracking rooms`);
        }, 500);
    };

    return (
        <div className="w-full max-w-4xl mx-auto p-4 sm:p-6 bg-white dark:bg-gray-900 rounded-lg shadow-lg space-y-4 sm:space-y-6">
            {/* Header */}
            <div className="border-b dark:border-gray-700 pb-3 sm:pb-4">
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
                    📍 Real-Time Location Tracking
                </h2>
                <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mt-1">
                    Track {targetEmail} in real-time via WebSocket with Mapbox visualization
                </p>
            </div>

            {/* Connection Status */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 sm:p-4 bg-gray-100 dark:bg-gray-800 rounded-lg gap-2 sm:gap-0">
                <div className="flex items-center gap-2">
                    <div
                        className={`w-3 h-3 rounded-full ${isConnected ? "bg-green-500" : "bg-red-500"
                            }`}
                    />
                    <span className="font-semibold text-gray-900 dark:text-white text-sm sm:text-base">
                        {isConnected ? "Connected" : "Disconnected"}
                    </span>
                </div>
                <span
                    className={`text-xs sm:text-sm px-2 sm:px-3 py-1 rounded-full self-start sm:self-auto ${isTracking
                        ? "bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200"
                        : "bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200"
                        }`}
                >
                    {isTracking ? "🔴 Tracking Active" : "⚫ Tracking Inactive"}
                </span>
            </div>

            {/* Control Buttons */}
            <div className="flex flex-col sm:flex-row gap-3">
                <button
                    onClick={toggleTracking}
                    disabled={!isConnected}
                    className={`px-4 sm:px-6 py-2 rounded-lg font-semibold transition flex-1 sm:flex-none ${isTracking
                        ? "bg-red-600 hover:bg-red-700 text-white"
                        : "bg-green-600 hover:bg-green-700 text-white"
                        } disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base`}
                >
                    {isTracking ? "🛑 Stop Tracking" : "▶️ Start Tracking"}
                </button>

                <button
                    onClick={handleGetActiveRooms}
                    disabled={!isConnected}
                    className="px-4 sm:px-6 py-2 rounded-lg font-semibold bg-blue-600 hover:bg-blue-700 text-white transition disabled:opacity-50 disabled:cursor-not-allowed flex-1 sm:flex-none text-sm sm:text-base"
                >
                    📊 Active Rooms ({activeRooms.length})
                </button>
            </div>

            {/* Mapbox Map */}
            {lastLocation && (
                <div className="space-y-4">
                    <h3 className="font-semibold text-gray-900 dark:text-white text-lg sm:text-xl">
                        🗺️ Live Location Map
                    </h3>
                    <div className="h-64 sm:h-80 lg:h-96 bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden">
                        <Map
                            latitude={lastLocation.latitude}
                            longitude={lastLocation.longitude}
                            address={lastLocation.address}
                            locationHistory={locationHistory.map(loc => ({
                                latitude: loc.latitude,
                                longitude: loc.longitude,
                                address: `Tracked at ${new Date(loc.timestamp).toLocaleTimeString()}`
                            }))}
                        />
                    </div>
                </div>
            )}

            {/* Last Location */}
            {lastLocation && (
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg space-y-3">
                    <h3 className="font-semibold text-gray-900 dark:text-white text-lg">
                        📌 Latest Location
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-gray-700 dark:text-gray-300">
                        <div className="flex flex-col sm:flex-row sm:justify-between">
                            <span className="font-semibold mb-1 sm:mb-0">Latitude:</span>
                            <span className="font-mono">{lastLocation.latitude.toFixed(6)}</span>
                        </div>
                        <div className="flex flex-col sm:flex-row sm:justify-between">
                            <span className="font-semibold mb-1 sm:mb-0">Longitude:</span>
                            <span className="font-mono">{lastLocation.longitude.toFixed(6)}</span>
                        </div>
                        <div className="col-span-1 sm:col-span-2">
                            <span className="font-semibold">Address:</span>
                            <div className="mt-1 break-words">{lastLocation.address}</div>
                        </div>
                        <div className="col-span-1 sm:col-span-2 flex flex-col sm:flex-row sm:justify-between">
                            <span className="font-semibold mb-1 sm:mb-0">Updated:</span>
                            <span>{lastLocation.timestamp
                                ? new Date(lastLocation.timestamp).toLocaleTimeString()
                                : "Unknown"}</span>
                        </div>
                        {lastLocation.method && (
                            <div className="col-span-1 sm:col-span-2 flex flex-col sm:flex-row sm:justify-between">
                                <span className="font-semibold mb-1 sm:mb-0">Method:</span>
                                <span>{lastLocation.method}</span>
                            </div>
                        )}
                    </div>

                    {/* Mapbox Link */}
                    {lastLocation && (
                        <a
                            href={`https://www.mapbox.com/mapbox-gl-js/example/?lng=${lastLocation.longitude}&lat=${lastLocation.latitude}&zoom=15`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-block mt-3 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded transition"
                        >
                            🗺️ Open in Mapbox
                        </a>
                    )}
                </div>
            )}

            {/* Update Frequency Control */}
            <div className="space-y-2">
                <h3 className="font-semibold text-gray-900 dark:text-white text-sm sm:text-base">
                    ⏱️ Update Frequency
                </h3>
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                    <label htmlFor="update-frequency" className="sr-only">
                        Update Frequency (seconds)
                    </label>
                    <input
                        id="update-frequency"
                        type="range"
                        min="1"
                        max="30"
                        value={updateFrequency}
                        onChange={(e) => setUpdateFrequency(parseInt(e.target.value))}
                        className="flex-1"
                        disabled={isTracking}
                        aria-label={`Update frequency: ${updateFrequency} seconds`}
                    />
                    <span className="text-sm font-semibold text-gray-700 dark:text-gray-300 text-center sm:text-left">
                        {updateFrequency}s
                    </span>
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                    Adjust how often location is updated (1-30 seconds)
                </p>
            </div>

            {/* Location History */}
            {locationHistory.length > 0 && (
                <div className="space-y-2">
                    <h3 className="font-semibold text-gray-900 dark:text-white text-sm sm:text-base">
                        📋 Recent Locations ({locationHistory.length})
                    </h3>
                    <div className="max-h-48 overflow-y-auto space-y-2">
                        {locationHistory.map((loc, idx) => (
                            <div
                                key={idx}
                                className="p-2 sm:p-3 bg-gray-100 dark:bg-gray-800 rounded text-xs sm:text-sm text-gray-700 dark:text-gray-300"
                            >
                                <div className="flex flex-col sm:flex-row sm:justify-between gap-1">
                                    <span className="font-mono break-all">
                                        {loc.latitude.toFixed(4)}, {loc.longitude.toFixed(4)}
                                    </span>
                                    <span className="text-xs text-gray-500 text-right sm:text-left">
                                        {new Date(loc.timestamp).toLocaleTimeString()}
                                    </span>
                                </div>
                                {loc.accuracy && (
                                    <span className="text-xs text-gray-500 block mt-1">
                                        Accuracy: ±{Math.round(loc.accuracy)}m
                                    </span>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Status Messages */}
            {locationError && (
                <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                    <p className="text-red-800 dark:text-red-200">❌ {locationError}</p>
                </div>
            )}

            {isTracking && !lastLocation && (
                <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                    <p className="text-yellow-800 dark:text-yellow-200">
                        ⏳ Waiting for location data...
                    </p>
                </div>
            )}
        </div>
    );
}
