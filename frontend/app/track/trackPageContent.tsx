"use client";

import { useAuth } from "@/context/AuthContext";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import toast, { Toaster } from "react-hot-toast";
import Map from "@/components/Map";
import RealTimeTracking from "@/app/components/RealTimeTracking";


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

export default function TrackPageContent() {
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

    const isValidEmail = (email: string) => {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    };

    const loadTrackingStatus = useCallback(async () => {
        if (!token) return;

        try {
            const res = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"}/auth/tracking-status`,
                {
                    method: "GET",
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                    cache: "no-store",
                }
            );

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
    type ActiveTab =
        | "main"
        | "pending"
        | "active"
        | "denied"
        | "all"
        | "permissions"
        | "history"
        | "realtime";

    const getActiveTab = (): ActiveTab => {
        const tab = searchParams.get("tab");

        switch (tab) {
            case "pending":
                return "pending";
            case "active":
                return "active";
            case "denied":
                return "denied";
            case "all":
                return "all";
            case "permissions":
                return "permissions";
            case "history":
                return "history";
            case "realtime":
                return "realtime";
            default:
                return "main";
        }
    };

    const activeTab: ActiveTab = getActiveTab();

    useEffect(() => {
        if (activeTab === "main" || !token) return;
        loadTrackingStatus();
    }, [activeTab, token, loadTrackingStatus]);

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
        const normalizedTargetEmail = targetEmail.trim().toLowerCase();

        if (!normalizedTargetEmail) {
            toast.error("Please enter the person's email address");
            return;
        }

        if (!isValidEmail(normalizedTargetEmail)) {
            toast.error("Please enter a valid target email address");
            return;
        }

        if (normalizedTargetEmail !== targetEmail) {
            setTargetEmail(normalizedTargetEmail);
        }

        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"}/auth/send-tracking-otp`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ targetEmail: normalizedTargetEmail }),
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
                        updateLocationData(targetEmail.trim().toLowerCase(), newLocation);
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
        if (watchId !== null && navigator.geolocation) {
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
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"}/auth/deny`, {
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

            } else {
                const error = await res.json();
                toast.error(error.message);
            }
        } catch {
            toast.error("Failed to deny tracking");
        }
    };

    const closeTracking = async (targetEmail: string) => {
        const normalizedTargetEmail = targetEmail.trim().toLowerCase();

        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"}/auth/close-tracking`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ targetEmail: normalizedTargetEmail }),
            });
            if (res.ok) {
                toast.success("Tracking closed successfully");
                await loadTrackingStatus();

            } else {
                const error = await res.json();
                toast.error(error.message);
            }
        } catch {
            toast.error("Failed to close tracking");
        }
    };

    const updateLocationData = async (targetEmail: string, locationData: Location) => {
        const normalizedTargetEmail = targetEmail.trim().toLowerCase();

        try {
            await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"}/auth/update-location`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    targetEmail: normalizedTargetEmail,
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
        <div className="min-h-screen bg-background text-foreground p-4 sm:p-6 lg:p-8">
            <Toaster />
            <section className="py-6 sm:py-8 lg:py-12">
                <div className="max-w-7xl mx-auto">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
                        <div className="flex-1">
                            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-2 sm:mb-4">Track Locations</h1>
                            <p className="text-sm sm:text-base lg:text-lg opacity-75">Request location tracking with user consent via OTP.</p>
                        </div>
                        <button
                            type="button"
                            onClick={() => router.push("/track?tab=all")}
                            className="px-4 py-2 sm:px-6 sm:py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors duration-200 flex items-center gap-2 text-sm sm:text-base self-start sm:self-auto"
                        >
                            📊 Manage Tracking
                            {trackingStats.total > 0 && (
                                <span className="bg-white text-blue-600 px-2 py-1 rounded-full text-xs font-bold">
                                    {trackingStats.total}
                                </span>
                            )}
                        </button>
                    </div>
                </div>
            </section>

            {/* Tracking Manager */}
            {activeTab !== 'main' && (
                <section className="mb-8 sm:mb-12">
                    <div className="p-4 sm:p-6 lg:p-8 bg-gray-800 rounded-lg shadow-md">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                            <h2 className="text-xl sm:text-2xl font-bold">
                                {activeTab === 'pending' ? 'Pending Requests' : null}
                                {activeTab === 'active' ? 'Active Trackings' : null}
                                {activeTab === 'denied' ? 'Denied Requests' : null}
                                {activeTab === 'all' ? 'All Tracking Requests' : null}
                                {activeTab === 'permissions' ? 'Manage Permissions' : null}
                                {activeTab === 'history' ? 'Tracking History' : null}
                                {activeTab === 'realtime' ? 'Real-Time Tracking' : null}
                            </h2>
                            <button
                                onClick={() => router.push('/track')}
                                className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded transition-colors duration-200 text-sm sm:text-base"
                            >
                                Back to Main
                            </button>
                        </div>

                        {/* Stats Overview */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
                            <div className="bg-yellow-600 p-3 sm:p-4 rounded-lg text-center">
                                <div className="text-lg sm:text-2xl font-bold">{trackingStats.pending}</div>
                                <div className="text-xs sm:text-sm">Pending</div>
                            </div>
                            <div className="bg-green-600 p-3 sm:p-4 rounded-lg text-center">
                                <div className="text-lg sm:text-2xl font-bold">{trackingStats.active}</div>
                                <div className="text-xs sm:text-sm">Active</div>
                            </div>
                            <div className="bg-red-600 p-3 sm:p-4 rounded-lg text-center">
                                <div className="text-lg sm:text-2xl font-bold">{trackingStats.denied}</div>
                                <div className="text-xs sm:text-sm">Denied</div>
                            </div>
                            <div className="bg-blue-600 p-3 sm:p-4 rounded-lg text-center">
                                <div className="text-lg sm:text-2xl font-bold">{trackingStats.total}</div>
                                <div className="text-xs sm:text-sm">Total</div>
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
                                                    <div className="space-y-2 max-h-60 overflow-y-auto">
                                                        {tracking.locationHistory.slice(-10).reverse().map((loc, locIndex) => (
                                                            <div key={locIndex} className="text-xs sm:text-sm bg-gray-600 p-2 sm:p-3 rounded">
                                                                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1 sm:gap-2">
                                                                    <span className="text-xs sm:text-sm">{loc.timestamp ? new Date(loc.timestamp).toLocaleString() : 'Unknown time'}</span>
                                                                    <span className="text-xs opacity-75 bg-gray-500 px-2 py-1 rounded">{loc.method}</span>
                                                                </div>
                                                                <div className="mt-1 text-xs sm:text-sm wrap-break-word">{loc.address || `${loc.latitude.toFixed(6)}, ${loc.longitude.toFixed(6)}`}</div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <p className="text-xs sm:text-sm opacity-75">No location history available</p>
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
                        {(activeTab === 'active') && trackingDetails.active.length > 0 && (
                            <div className="mb-6 sm:mb-8">
                                <h3 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4 text-green-400">Active Trackings</h3>
                                <div className="space-y-3 sm:space-y-4">
                                    {trackingDetails.active.map((tracking, index) => (
                                        <div key={index} className="p-3 sm:p-4 bg-gray-700 rounded-lg">
                                            <div className="flex justify-between items-start gap-4">
                                                <div className="flex-1">
                                                    <div className="font-medium text-sm sm:text-base">{tracking.targetEmail}</div>
                                                    <div className="text-xs sm:text-sm opacity-75 mt-1">
                                                        Started: {new Date(tracking.requestedAt).toLocaleDateString()}
                                                        {tracking.lastLocation && (
                                                            <span className="block sm:inline sm:ml-2 mt-1 sm:mt-0">
                                                                • Last update: {new Date(tracking.lastLocation.timestamp).toLocaleTimeString()}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => closeTracking(tracking.targetEmail)}
                                                    className="px-3 py-2 sm:px-4 sm:py-2 bg-red-600 hover:bg-red-700 text-white rounded transition-colors duration-200 text-sm sm:text-base shrink-0"
                                                >
                                                    Close
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Real-Time Tracking */}
                        {activeTab === 'realtime' && (
                            <div className="mb-6 sm:mb-8">
                                <h3 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4 text-purple-400">Real-Time Location Tracking</h3>
                                <p className="text-sm sm:text-base text-gray-300 mb-4">
                                    Select a user from your active trackings below to start real-time tracking with live WebSocket updates.
                                </p>

                                {trackingDetails.active.length > 0 ? (
                                    <div className="space-y-4 sm:space-y-6">
                                        {trackingDetails.active.map((tracking, index) => (
                                            <div key={index} className="p-3 sm:p-4 bg-gray-700 rounded-lg">
                                                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3 sm:gap-4 mb-3 sm:mb-4">
                                                    <div className="flex-1">
                                                        <div className="font-medium text-base sm:text-lg">{tracking.targetEmail}</div>
                                                        <div className="text-xs sm:text-sm opacity-75">
                                                            Active since: {new Date(tracking.requestedAt).toLocaleString()}
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <div className="text-xs sm:text-sm text-green-400 font-semibold">● ACTIVE</div>
                                                        <div className="text-xs opacity-75">Real-time ready</div>
                                                    </div>
                                                </div>

                                                <RealTimeTracking targetEmail={tracking.targetEmail} />
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center p-6 sm:p-8 bg-gray-700 rounded-lg">
                                        <div className="text-3xl sm:text-4xl mb-3 sm:mb-4">📍</div>
                                        <h4 className="text-base sm:text-lg font-semibold mb-2">No Active Trackings</h4>
                                        <p className="text-xs sm:text-sm text-gray-400 mb-4">
                                            You need active tracking permissions to use real-time tracking.
                                        </p>
                                        <button
                                            onClick={() => router.push('/track')}
                                            className="px-4 py-2 sm:px-6 sm:py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors duration-200 text-sm sm:text-base"
                                        >
                                            Start New Tracking Request
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Pending Requests */}
                        {(activeTab === 'pending') && trackingDetails.pending.length > 0 && (
                            <div className="mb-6 sm:mb-8">
                                <h3 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4 text-yellow-400">Pending Requests</h3>
                                <div className="space-y-3 sm:space-y-4">
                                    {trackingDetails.pending.map((tracking, index) => (
                                        <div key={index} className="p-3 sm:p-4 bg-gray-700 rounded-lg">
                                            <div className="flex justify-between items-start gap-4">
                                                <div className="flex-1">
                                                    <div className="font-medium text-sm sm:text-base">{tracking.targetEmail}</div>
                                                    <div className="text-xs sm:text-sm opacity-75 mt-1">
                                                        Sent: {new Date(tracking.requestedAt).toLocaleDateString()}
                                                    </div>
                                                    <div className="text-xs text-yellow-400 mt-1">
                                                        Waiting for user to verify OTP
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => closeTracking(tracking.targetEmail)}
                                                    className="px-3 py-2 sm:px-4 sm:py-2 bg-red-600 hover:bg-red-700 text-white rounded transition-colors duration-200 text-sm sm:text-base shrink-0"
                                                >
                                                    Cancel
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Denied Requests */}
                        {(activeTab === 'denied') && trackingDetails.denied.length > 0 && (
                            <div className="mb-6 sm:mb-8">
                                <h3 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4 text-red-400">Denied Requests</h3>
                                <div className="space-y-3 sm:space-y-4">
                                    {trackingDetails.denied.map((tracking, index) => (
                                        <div key={index} className="p-3 sm:p-4 bg-gray-700 rounded-lg">
                                            <div className="flex justify-between items-start gap-4">
                                                <div className="flex-1">
                                                    <div className="font-medium text-sm sm:text-base">{tracking.targetEmail}</div>
                                                    <div className="text-xs sm:text-sm opacity-75 mt-1">
                                                        Denied: {tracking.deniedAt ? new Date(tracking.deniedAt).toLocaleDateString() : 'Unknown'}
                                                    </div>
                                                    <div className="text-xs text-red-400 mt-1">
                                                        {tracking.deniedReason}
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => closeTracking(tracking.targetEmail)}
                                                    className="px-3 py-2 sm:px-4 sm:py-2 bg-gray-600 hover:bg-gray-700 text-white rounded transition-colors duration-200 text-sm sm:text-base shrink-0"
                                                >
                                                    Remove
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Permissions Management */}
                        {activeTab === 'permissions' && (
                            <div className="mb-6 sm:mb-8">
                                <h3 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4 text-orange-400">Manage Permissions</h3>
                                <div className="space-y-3 sm:space-y-4">
                                    {trackingDetails.active.map((tracking, index) => (
                                        <div key={index} className="p-3 sm:p-4 bg-gray-700 rounded-lg">
                                            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 sm:gap-4 mb-3">
                                                <div className="flex-1">
                                                    <div className="font-medium text-sm sm:text-base">{tracking.targetEmail}</div>
                                                    <div className="text-xs sm:text-sm opacity-75 mb-2 sm:mb-0">
                                                        Started: {new Date(tracking.requestedAt).toLocaleDateString()}
                                                    </div>
                                                </div>
                                                <div className="text-xs sm:text-sm text-green-400 self-start sm:self-auto">Active</div>
                                            </div>
                                            <div className="flex flex-col sm:flex-row gap-2">
                                                <button
                                                    onClick={() => closeTracking(tracking.targetEmail)}
                                                    className="flex-1 px-3 py-2 sm:px-4 sm:py-2 bg-red-600 hover:bg-red-700 text-white rounded transition-colors duration-200 text-sm sm:text-base"
                                                >
                                                    Stop Tracking
                                                </button>
                                                <button
                                                    onClick={() => toast.success("Real-time updates are active")}
                                                    className="flex-1 px-3 py-2 sm:px-4 sm:py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors duration-200 text-sm sm:text-base"
                                                >
                                                    View Live Location
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                    {trackingDetails.active.length === 0 && (
                                        <p className="text-sm sm:text-base text-gray-400">No active permissions to manage</p>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </section>
            )}

            <section className="mb-8 sm:mb-12">
                <div className="max-w-2xl mx-auto p-4 sm:p-6 lg:p-8 bg-gray-800 rounded-lg shadow-md">
                    <h2 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6">Request Tracking</h2>
                    <p className="text-sm sm:text-base opacity-75 mb-4 sm:mb-6">Enter the person&apos;s email address to send OTP for location tracking consent.</p>
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

                                <div className="space-y-3 sm:space-y-4">
                                    <label className="flex items-start space-x-3 p-3 sm:p-4 border border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700">
                                        <input
                                            type="radio"
                                            name="locationMethod"
                                            value="geolocation"
                                            checked={locationMethod === "geolocation"}
                                            onChange={(e) => setLocationMethod(e.target.value as "geolocation" | "ip")}
                                            className="text-blue-600 focus:ring-blue-500 mt-1"
                                        />
                                        <div className="flex-1">
                                            <div className="font-medium text-sm sm:text-base">GPS Location (Geolocation)</div>
                                            <div className="text-xs sm:text-sm opacity-75">More accurate • Requires location permission • Real-time GPS</div>
                                        </div>
                                    </label>

                                    <label className="flex items-start space-x-3 p-3 sm:p-4 border border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700">
                                        <input
                                            type="radio"
                                            name="locationMethod"
                                            value="ip"
                                            checked={locationMethod === "ip"}
                                            onChange={(e) => setLocationMethod(e.target.value as "geolocation" | "ip")}
                                            className="text-blue-600 focus:ring-blue-500 mt-1"
                                        />
                                        <div className="flex-1">
                                            <div className="font-medium text-sm sm:text-base">IP Address Location</div>
                                            <div className="text-xs sm:text-sm opacity-75">Works everywhere • No permission needed • City-level accuracy</div>
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
                <section className="mb-8 sm:mb-12">
                    <h2 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6">Location Details</h2>
                    <div className="p-4 sm:p-6 lg:p-8 bg-gray-800 rounded-lg shadow-md">
                        <p className="text-base sm:text-lg font-semibold mb-2">📍 Address:</p>
                        <p className="text-gray-300 mb-3 sm:mb-4 text-sm sm:text-base">{location.address || "Getting address..."}</p>
                        <p className="text-xs sm:text-sm text-gray-400 mb-2">Method: {location.method}</p>
                        <p className="text-xs sm:text-sm text-gray-400 mb-4">Coordinates: {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}</p>

                        {location.method === "geolocation" && (
                            <div className="mt-4 sm:mt-6 pt-3 sm:pt-4 border-t border-gray-600">
                                <h3 className="text-base sm:text-lg font-semibold mb-3">Real-Time Tracking</h3>
                                <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                                    {!isRealTimeTracking ? (
                                        <button
                                            onClick={startRealTimeTracking}
                                            className="flex-1 bg-green-600 hover:bg-green-700 text-white px-3 py-2 sm:px-4 sm:py-2 rounded-lg transition-colors duration-200 text-sm sm:text-base"
                                        >
                                            ▶️ Start Live Tracking
                                        </button>
                                    ) : (
                                        <button
                                            onClick={stopRealTimeTracking}
                                            className="flex-1 bg-red-600 hover:bg-red-700 text-white px-3 py-2 sm:px-4 sm:py-2 rounded-lg transition-colors duration-200 text-sm sm:text-base"
                                        >
                                            ⏹️ Stop Live Tracking
                                        </button>
                                    )}
                                </div>
                                {isRealTimeTracking && (
                                    <div className="mt-3 flex items-center gap-2 text-green-400">
                                        <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                                        <span className="text-xs sm:text-sm">Live tracking active - Location updates every few seconds</span>
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
                <section className="mb-8 sm:mb-12">
                    <h2 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6">Tracking Map</h2>
                    <div className="bg-gray-800 rounded-lg shadow-md p-2 sm:p-4">
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
