"use client";

import { useAuth } from "@/context/AuthContext";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import toast, { Toaster } from "react-hot-toast";
import Map from "@/components/Map";

interface Location {
    latitude: number;
    longitude: number;
    method: string;
    address?: string;
    timestamp?: string;
}

interface TrackingRequest {
    targetEmail: string;
    status: 'pending' | 'active' | 'denied';
    requestedAt: string;
    lastLocation?: {
        latitude: number;
        longitude: number;
        address?: string;
        method: string;
        timestamp: string;
    };
    locationHistory?: Location[];
    deniedAt?: string;
    deniedReason?: string;
}

export default function TrackPage() {
    const { user, isLoading, token } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();
    const [targetEmail, setTargetEmail] = useState("");
    const [otp, setOtp] = useState("");
    const [isOtpSent, setIsOtpSent] = useState(false);
    const [isOtpVerified, setIsOtpVerified] = useState(false);
    const [locationMethod, setLocationMethod] = useState<"geolocation" | "ip">("geolocation");
    const [location, setLocation] = useState<Location | null>(null);
    const [isGettingLocation, setIsGettingLocation] = useState(false);
    const [isRealTimeTracking, setIsRealTimeTracking] = useState(false);
    const [locationHistory, setLocationHistory] = useState<Location[]>([]);
    const [watchId, setWatchId] = useState<number | null>(null);
    const [trackingStats, setTrackingStats] = useState({ pending: 0, active: 0, denied: 0, total: 0 });
    const [trackingDetails, setTrackingDetails] = useState<{
        pending: TrackingRequest[];
        active: TrackingRequest[];
        denied: TrackingRequest[];
    }>({ pending: [], active: [], denied: [] });
    const [showTrackingManager, setShowTrackingManager] = useState(false);

    const fetchTrackingStatus = useCallback(async () => {
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"}/auth/tracking-status`, {
                method: "GET",
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });
            if (res.ok) {
                const data = await res.json();
                setTrackingStats(data.stats);
                setTrackingDetails(data.details);
            }
        } catch (error) {
            console.error("Failed to fetch tracking status:", error);
        }
    }, [token]);

    // Get active tab from URL params
    const getActiveTab = (): 'main' | 'pending' | 'active' | 'denied' | 'all' | 'permissions' | 'history' => {
        const tab = searchParams.get('tab');
        switch (tab) {
            case 'pending':
                return 'pending';
            case 'active':
                return 'active';
            case 'denied':
                return 'denied';
            case 'all':
                return 'all';
            case 'permissions':
                return 'permissions';
            case 'history':
                return 'history';
            default:
                return 'main';
        }
    };

    const activeTab: 'main' | 'pending' | 'active' | 'denied' | 'all' | 'permissions' | 'history' = getActiveTab();

    useEffect(() => {
        if (!isLoading && !user) {
            toast.error("Please log in to access tracking");
            router.push("/auth/login");
        }
    }, [user, isLoading, router]);

    // Cleanup real-time tracking on unmount
    useEffect(() => {
        return () => {
            if (watchId !== null) {
                navigator.geolocation.clearWatch(watchId);
            }
        };
    }, [watchId]);

    if (isLoading) {
        return <div className="flex items-center justify-center h-screen text-foreground">Loading...</div>;
    }

    if (!user) {
        return null;
    }

    const sendOTP = async () => {
        if (!targetEmail) {
            toast.error("Please enter the person's email address");
            return;
        }
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"}/auth/send-tracking-otp`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ targetEmail }),
            });
            if (res.ok) {
                setIsOtpSent(true);
                toast.success("OTP sent via email");
            } else {
                const error = await res.json();
                toast.error(error.message);
            }
        } catch {
            toast.error("Failed to send OTP");
        }
    };

    const verifyOTP = async () => {
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"}/auth/verify-otp`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ otp }),
            });
            if (res.ok) {
                setIsOtpVerified(true);
                toast.success("OTP verified! Choose your location method below.");
            } else {
                const error = await res.json();
                toast.error(error.message);
            }
        } catch {
            toast.error("Failed to verify OTP");
        }
    };

    const getLocation = () => {
        setIsGettingLocation(true);
        if (locationMethod === "geolocation" && navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                async (position) => {
                    const { latitude, longitude } = position.coords;
                    const address = await reverseGeocode(latitude, longitude);
                    setLocation({ latitude, longitude, method: "geolocation", address });
                    setIsGettingLocation(false);
                    toast.success("Location obtained via geolocation");
                },
                (error) => {
                    console.error("Geolocation error:", error);
                    toast.error("Geolocation failed, try IP method instead");
                    setIsGettingLocation(false);
                }
            );
        } else if (locationMethod === "ip") {
            getIPLocation();
        } else {
            // Fallback to IP if geolocation not available
            getIPLocation();
        }
    };

    const getIPLocation = async () => {
        try {
            const res = await fetch("https://ipapi.co/json/");
            const data = await res.json();
            const locationData = { latitude: data.latitude, longitude: data.longitude, method: "ip" };
            const address = await reverseGeocode(data.latitude, data.longitude);
            setLocation({ ...locationData, address });
            setIsGettingLocation(false);
            toast.success("Location obtained via IP address");
        } catch {
            setIsGettingLocation(false);
            toast.error("Failed to get location");
        }
    };

    const startRealTimeTracking = () => {
        if (locationMethod === "geolocation" && navigator.geolocation) {
            setIsRealTimeTracking(true);
            const id = navigator.geolocation.watchPosition(
                async (position) => {
                    const { latitude, longitude } = position.coords;
                    const address = await reverseGeocode(latitude, longitude);
                    const newLocation = { latitude, longitude, method: "geolocation", address };

                    setLocation(newLocation);
                    setLocationHistory(prev => [...prev.slice(-9), newLocation]); // Keep last 10 locations

                    // Update location in backend if we have a target email
                    if (targetEmail) {
                        updateLocationData(targetEmail, newLocation);
                    }
                },
                (error) => {
                    console.error("Real-time geolocation error:", error);
                    toast.error("Real-time tracking failed");
                    stopRealTimeTracking();
                },
                {
                    enableHighAccuracy: true,
                    timeout: 10000,
                    maximumAge: 30000
                }
            );
            setWatchId(id);
            toast.success("Real-time tracking started");
        } else {
            toast.error("Real-time tracking requires GPS location method");
        }
    };

    const stopRealTimeTracking = () => {
        if (watchId !== null) {
            navigator.geolocation.clearWatch(watchId);
            setWatchId(null);
        }
        setIsRealTimeTracking(false);
        toast.success("Real-time tracking stopped");
    };

    const reverseGeocode = async (lat: number, lon: number): Promise<string> => {
        try {
            // Using Nominatim (OpenStreetMap) for reverse geocoding - free and no API key needed
            const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1`);
            const data = await res.json();

            if (data && data.display_name) {
                return data.display_name;
            } else {
                return `${lat.toFixed(6)}, ${lon.toFixed(6)}`;
            }
        } catch (error) {
            console.error("Reverse geocoding failed:", error);
            return `${lat.toFixed(6)}, ${lon.toFixed(6)}`;
        }
    };

    const denyTracking = async () => {
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"}/auth/deny-tracking`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ otp }),
            });
            if (res.ok) {
                setIsOtpVerified(false);
                setIsOtpSent(false);
                setOtp("");
                toast.success("Tracking request denied");
                fetchTrackingStatus();
            } else {
                const error = await res.json();
                toast.error(error.message);
            }
        } catch {
            toast.error("Failed to deny tracking");
        }
    };

    const closeTracking = async (targetEmail: string) => {
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"}/auth/close-tracking`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ targetEmail }),
            });
            if (res.ok) {
                toast.success("Tracking closed successfully");
                fetchTrackingStatus();
            } else {
                const error = await res.json();
                toast.error(error.message);
            }
        } catch {
            toast.error("Failed to close tracking");
        }
    };

    const updateLocationData = async (targetEmail: string, locationData: Location) => {
        try {
            await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"}/auth/update-location`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    targetEmail,
                    latitude: locationData.latitude,
                    longitude: locationData.longitude,
                    address: locationData.address,
                    method: locationData.method
                }),
            });
        } catch (error) {
            console.error("Failed to update location:", error);
        }
    };

    return (
        <div className="min-h-screen bg-background text-foreground p-8">
            <Toaster />
            <section className="py-12">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-4xl font-bold mb-4">Track Locations</h1>
                        <p className="text-lg opacity-75">Request location tracking with user consent via OTP.</p>
                    </div>
                    <button
                        onClick={() => {
                            setShowTrackingManager(!showTrackingManager);
                            if (!showTrackingManager) fetchTrackingStatus();
                        }}
                        className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors duration-200 flex items-center gap-2"
                    >
                        📊 Manage Tracking
                        {trackingStats.total > 0 && (
                            <span className="bg-white text-blue-600 px-2 py-1 rounded-full text-xs font-bold">
                                {trackingStats.total}
                            </span>
                        )}
                    </button>
                </div>
            </section>

            {/* Tracking Manager */}
            {activeTab !== 'main' && (
                <section className="mb-12">
                    <div className="p-8 bg-gray-800 rounded-lg shadow-md">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl font-bold">
                                {activeTab === 'pending' && 'Pending Requests'}
                                {activeTab === 'active' && 'Active Trackings'}
                                {activeTab === 'denied' && 'Denied Requests'}
                                {activeTab === 'all' && 'All Tracking Requests'}
                                {activeTab === 'permissions' && 'Manage Permissions'}
                                {activeTab === 'history' && 'Tracking History'}
                                {activeTab === 'main' && 'Tracking Manager'}
                            </h2>
                            <button
                                onClick={() => router.push('/track')}
                                className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded transition-colors duration-200"
                            >
                                Back to Main
                            </button>
                        </div>

                        {/* Stats Overview */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                            <div className="bg-yellow-600 p-4 rounded-lg text-center">
                                <div className="text-2xl font-bold">{trackingStats.pending}</div>
                                <div className="text-sm">Pending</div>
                            </div>
                            <div className="bg-green-600 p-4 rounded-lg text-center">
                                <div className="text-2xl font-bold">{trackingStats.active}</div>
                                <div className="text-sm">Active</div>
                            </div>
                            <div className="bg-red-600 p-4 rounded-lg text-center">
                                <div className="text-2xl font-bold">{trackingStats.denied}</div>
                                <div className="text-sm">Denied</div>
                            </div>
                            <div className="bg-blue-600 p-4 rounded-lg text-center">
                                <div className="text-2xl font-bold">{trackingStats.total}</div>
                                <div className="text-sm">Total</div>
                            </div>
                        </div>

                        {/* Conditional Content Based on Tab */}
                        {activeTab === 'history' && (
                            <div className="mb-8">
                                <h3 className="text-xl font-semibold mb-4 text-blue-400">Location History</h3>
                                {trackingDetails.active.length > 0 ? (
                                    <div className="space-y-4">
                                        {trackingDetails.active.map((tracking, index) => (
                                            <div key={index} className="p-4 bg-gray-700 rounded-lg">
                                                <h4 className="font-medium mb-2">{tracking.targetEmail}</h4>
                                                {tracking.locationHistory && tracking.locationHistory.length > 0 ? (
                                                    <div className="space-y-2">
                                                        {tracking.locationHistory.slice(-10).reverse().map((loc, locIndex) => (
                                                            <div key={locIndex} className="text-sm bg-gray-600 p-2 rounded">
                                                                <div className="flex justify-between">
                                                                    <span>{loc.timestamp ? new Date(loc.timestamp).toLocaleString() : 'Unknown time'}</span>
                                                                    <span className="text-xs opacity-75">{loc.method}</span>
                                                                </div>
                                                                <div className="mt-1">{loc.address || `${loc.latitude.toFixed(6)}, ${loc.longitude.toFixed(6)}`}</div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <p className="text-sm opacity-75">No location history available</p>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-gray-400">No active trackings with history available</p>
                                )}
                            </div>
                        )}

                        {/* Active Trackings */}
                        {(activeTab === 'main' || activeTab === 'active') && trackingDetails.active.length > 0 && (
                            <div className="mb-8">
                                <h3 className="text-xl font-semibold mb-4 text-green-400">Active Trackings</h3>
                                <div className="space-y-3">
                                    {trackingDetails.active.map((tracking, index) => (
                                        <div key={index} className="flex justify-between items-center p-4 bg-gray-700 rounded-lg">
                                            <div>
                                                <div className="font-medium">{tracking.targetEmail}</div>
                                                <div className="text-sm opacity-75">
                                                    Started: {new Date(tracking.requestedAt).toLocaleDateString()}
                                                    {tracking.lastLocation && (
                                                        <span className="ml-2">
                                                            • Last update: {new Date(tracking.lastLocation.timestamp).toLocaleTimeString()}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => closeTracking(tracking.targetEmail)}
                                                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded transition-colors duration-200"
                                            >
                                                Close
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Pending Requests */}
                        {(activeTab === 'main' || activeTab === 'pending') && trackingDetails.pending.length > 0 && (
                            <div className="mb-8">
                                <h3 className="text-xl font-semibold mb-4 text-yellow-400">Pending Requests</h3>
                                <div className="space-y-3">
                                    {trackingDetails.pending.map((tracking, index) => (
                                        <div key={index} className="flex justify-between items-center p-4 bg-gray-700 rounded-lg">
                                            <div>
                                                <div className="font-medium">{tracking.targetEmail}</div>
                                                <div className="text-sm opacity-75">
                                                    Sent: {new Date(tracking.requestedAt).toLocaleDateString()}
                                                </div>
                                                <div className="text-xs text-yellow-400 mt-1">
                                                    Waiting for user to verify OTP
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => closeTracking(tracking.targetEmail)}
                                                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded transition-colors duration-200"
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Denied Requests */}
                        {(activeTab === 'main' || activeTab === 'denied') && trackingDetails.denied.length > 0 && (
                            <div className="mb-8">
                                <h3 className="text-xl font-semibold mb-4 text-red-400">Denied Requests</h3>
                                <div className="space-y-3">
                                    {trackingDetails.denied.map((tracking, index) => (
                                        <div key={index} className="flex justify-between items-center p-4 bg-gray-700 rounded-lg">
                                            <div>
                                                <div className="font-medium">{tracking.targetEmail}</div>
                                                <div className="text-sm opacity-75">
                                                    Denied: {tracking.deniedAt ? new Date(tracking.deniedAt).toLocaleDateString() : 'Unknown'}
                                                </div>
                                                <div className="text-xs text-red-400 mt-1">
                                                    {tracking.deniedReason}
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => closeTracking(tracking.targetEmail)}
                                                className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded transition-colors duration-200"
                                            >
                                                Remove
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Permissions Management */}
                        {activeTab === 'permissions' && (
                            <div className="mb-8">
                                <h3 className="text-xl font-semibold mb-4 text-orange-400">Manage Permissions</h3>
                                <div className="space-y-4">
                                    {trackingDetails.active.map((tracking, index) => (
                                        <div key={index} className="p-4 bg-gray-700 rounded-lg">
                                            <div className="flex justify-between items-center mb-2">
                                                <div className="font-medium">{tracking.targetEmail}</div>
                                                <div className="text-sm text-green-400">Active</div>
                                            </div>
                                            <div className="text-sm opacity-75 mb-3">
                                                Started: {new Date(tracking.requestedAt).toLocaleDateString()}
                                            </div>
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => closeTracking(tracking.targetEmail)}
                                                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded transition-colors duration-200"
                                                >
                                                    Stop Tracking
                                                </button>
                                                <button
                                                    onClick={() => toast.success("Real-time updates are active")}
                                                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors duration-200"
                                                >
                                                    View Live Location
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                    {trackingDetails.active.length === 0 && (
                                        <p className="text-gray-400">No active permissions to manage</p>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </section>
            )}

            <section className="mb-12">
                <div className="p-8 bg-gray-800 rounded-lg shadow-md max-w-md mx-auto">
                    <h2 className="text-2xl font-bold mb-6">Request Tracking</h2>
                    <p className="text-sm opacity-75 mb-4">Enter the person&apos;s email address to send OTP for location tracking consent.</p>
                    <div className="space-y-4">
                        <div>
                            <label htmlFor="targetEmail" className="block text-sm font-medium mb-2">
                                Person&apos;s Email Address
                            </label>
                            <input
                                id="targetEmail"
                                type="email"
                                value={targetEmail}
                                onChange={(e) => setTargetEmail(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-white-500"
                                placeholder="Enter the person's email"
                            />
                        </div>
                        <button
                            onClick={sendOTP}
                            className="w-full border border-foreground text-foreground hover:bg-foreground hover:text-background px-6 py-3 rounded-lg transition-all duration-500 cursor-pointer"
                        >
                            Send OTP to Confirm Tracking
                        </button>
                        {isOtpSent && !isOtpVerified && (
                            <>
                                <div>
                                    <label htmlFor="otp" className="block text-sm font-medium mb-2">
                                        Enter OTP (from the person)
                                    </label>
                                    <input
                                        id="otp"
                                        type="text"
                                        value={otp}
                                        onChange={(e) => setOtp(e.target.value)}
                                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-white-500"
                                        placeholder="Enter OTP"
                                    />
                                </div>
                                <div className="flex gap-3">
                                    <button
                                        onClick={verifyOTP}
                                        disabled={isGettingLocation}
                                        className="flex-1 border border-green-500 text-green-500 hover:bg-green-500 hover:text-white px-6 py-3 rounded-lg transition-all duration-500 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        ✅ Accept & Track
                                    </button>
                                    <button
                                        onClick={denyTracking}
                                        className="flex-1 border border-red-500 text-red-500 hover:bg-red-500 hover:text-white px-6 py-3 rounded-lg transition-all duration-500 cursor-pointer"
                                    >
                                        ❌ Deny Tracking
                                    </button>
                                </div>
                            </>
                        )}
                        {isOtpVerified && (
                            <div className="space-y-4">
                                <div className="text-center py-4">
                                    <p className="text-green-400 font-semibold">✅ OTP Verified Successfully!</p>
                                    <p className="text-sm opacity-75 mt-2">Choose your preferred location method:</p>
                                </div>

                                <div className="space-y-3">
                                    <label className="flex items-center space-x-3 p-3 border border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700">
                                        <input
                                            type="radio"
                                            name="locationMethod"
                                            value="geolocation"
                                            checked={locationMethod === "geolocation"}
                                            onChange={(e) => setLocationMethod(e.target.value as "geolocation" | "ip")}
                                            className="text-blue-600 focus:ring-blue-500"
                                        />
                                        <div>
                                            <div className="font-medium">GPS Location (Geolocation)</div>
                                            <div className="text-sm opacity-75">More accurate • Requires location permission • Real-time GPS</div>
                                        </div>
                                    </label>

                                    <label className="flex items-center space-x-3 p-3 border border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700">
                                        <input
                                            type="radio"
                                            name="locationMethod"
                                            value="ip"
                                            checked={locationMethod === "ip"}
                                            onChange={(e) => setLocationMethod(e.target.value as "geolocation" | "ip")}
                                            className="text-blue-600 focus:ring-blue-500"
                                        />
                                        <div>
                                            <div className="font-medium">IP Address Location</div>
                                            <div className="text-sm opacity-75">Works everywhere • No permission needed • City-level accuracy</div>
                                        </div>
                                    </label>
                                </div>

                                <button
                                    onClick={getLocation}
                                    disabled={isGettingLocation}
                                    className="w-full border border-foreground text-foreground hover:bg-foreground hover:text-background px-6 py-3 rounded-lg transition-all duration-500 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isGettingLocation ? "Getting Location..." : "Get Location"}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </section>

            {location && (
                <section className="mb-12">
                    <h2 className="text-2xl font-bold mb-6">Location Details</h2>
                    <div className="p-8 bg-gray-800 rounded-lg shadow-md">
                        <p className="text-lg font-semibold mb-2">📍 Address:</p>
                        <p className="text-gray-300 mb-4">{location.address || "Getting address..."}</p>
                        <p className="text-sm text-gray-400">Method: {location.method}</p>
                        <p className="text-sm text-gray-400">Coordinates: {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}</p>

                        {location.method === "geolocation" && (
                            <div className="mt-6 pt-4 border-t border-gray-600">
                                <h3 className="text-lg font-semibold mb-3">Real-Time Tracking</h3>
                                <div className="flex gap-3">
                                    {!isRealTimeTracking ? (
                                        <button
                                            onClick={startRealTimeTracking}
                                            className="flex-1 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors duration-200"
                                        >
                                            ▶️ Start Live Tracking
                                        </button>
                                    ) : (
                                        <button
                                            onClick={stopRealTimeTracking}
                                            className="flex-1 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors duration-200"
                                        >
                                            ⏹️ Stop Live Tracking
                                        </button>
                                    )}
                                </div>
                                {isRealTimeTracking && (
                                    <div className="mt-3 flex items-center gap-2 text-green-400">
                                        <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                                        <span className="text-sm">Live tracking active - Location updates every few seconds</span>
                                    </div>
                                )}
                                {locationHistory.length > 1 && (
                                    <p className="text-xs text-gray-500 mt-2">
                                        📊 {locationHistory.length} location updates recorded
                                    </p>
                                )}
                            </div>
                        )}
                    </div>
                </section>
            )}

            {location && (
                <section className="mb-12">
                    <h2 className="text-2xl font-bold mb-6">Tracking Map</h2>
                    <div className="bg-gray-800 rounded-lg shadow-md p-4">
                        <Map
                            latitude={location.latitude}
                            longitude={location.longitude}
                            address={location.address}
                            locationHistory={locationHistory}
                        />
                    </div>
                </section>
            )}
        </div>
    );
}
