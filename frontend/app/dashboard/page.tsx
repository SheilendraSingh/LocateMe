"use client";

import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import toast, { Toaster } from "react-hot-toast";
import Link from "next/link";

interface TrackingStats {
    pending: number;
    active: number;
    denied: number;
    total: number;
}

export default function Dashboard() {
    const { user, isLoading, token } = useAuth();
    const router = useRouter();
    const [trackingStats, setTrackingStats] = useState<TrackingStats>({
        pending: 0,
        active: 0,
        denied: 0,
        total: 0,
    });

    const fetchTrackingStats = useCallback(async () => {
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
            }
        } catch (error) {
            console.error("Failed to fetch tracking stats:", error);
        }
    }, [token]);

    useEffect(() => {
        if (!isLoading && !user) {
            toast.error("Please log in to access the dashboard");
            router.push("/auth/login");
        }
    }, [user, isLoading, router]);

    useEffect(() => {
        if (user && token) {
            fetchTrackingStats();
            // Set up real-time updates every 30 seconds
            const interval = setInterval(fetchTrackingStats, 30000);
            return () => clearInterval(interval);
        }
    }, [user, token, fetchTrackingStats]);

    if (isLoading) {
        return <div className="flex items-center justify-center h-screen text-foreground">Loading...</div>;
    }

    if (!user) {
        return null;
    }

    const shareMyLocation = async () => {
        if (!navigator.geolocation) {
            toast.error("Geolocation is not supported by this browser");
            return;
        }

        try {
            const position = await new Promise<GeolocationPosition>((resolve, reject) => {
                navigator.geolocation.getCurrentPosition(resolve, reject, {
                    enableHighAccuracy: true,
                    timeout: 10000,
                    maximumAge: 300000, // 5 minutes
                });
            });

            const { latitude, longitude } = position.coords;

            // Reverse geocode to get address
            const address = await reverseGeocode(latitude, longitude);

            // Copy location to clipboard
            const locationText = `My current location: ${address} (Lat: ${latitude.toFixed(6)}, Lng: ${longitude.toFixed(6)})`;
            await navigator.clipboard.writeText(locationText);

            toast.success("Location copied to clipboard!");
        } catch (error) {
            console.error("Error getting location:", error);
            toast.error("Failed to get your location");
        }
    };

    const reverseGeocode = async (lat: number, lon: number): Promise<string> => {
        try {
            const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1`);
            const data = await res.json();
            return data && data.display_name ? data.display_name : `${lat.toFixed(6)}, ${lon.toFixed(6)}`;
        } catch (error) {
            console.error("Reverse geocoding failed:", error);
            return `${lat.toFixed(6)}, ${lon.toFixed(6)}`;
        }
    };

    const viewTrackingHistory = () => {
        // Navigate to track page with tracking manager open
        router.push("/track?tab=history");
    };

    return (
        <div className="min-h-screen bg-background text-foreground">
            <Toaster />
            {/* Hero Section */}
            <section className="py-12">
                <h1 className="text-4xl font-bold mb-4">Welcome, {user.name}!</h1>
                <p className="text-lg opacity-75">Monitor your tracking requests and location sharing status.</p>
            </section>

            {/* User Info Card */}
            <section className="mb-12 p-8 bg-gray-800 rounded-lg shadow-md">
                <h2 className="text-2xl font-bold mb-6">Your Account</h2>
                <div className="space-y-4">
                    <div className="flex justify-between items-center border-b border-gray-600 pb-4">
                        <span className="opacity-75">Name:</span>
                        <span className="font-semibold">{user.name}</span>
                    </div>
                    <div className="flex justify-between items-center border-b border-gray-600 pb-4">
                        <span className="opacity-75">Email:</span>
                        <span className="font-semibold">{user.email}</span>
                    </div>
                </div>
            </section>

            {/* Stats Cards */}
            <section className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
                <Link
                    href="/track?tab=pending"
                    className="p-8 bg-yellow-900 hover:bg-yellow-800 rounded-lg shadow-md transition-colors duration-300 cursor-pointer"
                >
                    <h3 className="text-xl font-bold mb-4">Pending Requests</h3>
                    <p className="text-4xl font-bold">{trackingStats.pending}</p>
                    <p className="text-sm opacity-75 mt-2">Location requests waiting for approval</p>
                </Link>

                <Link
                    href="/track?tab=active"
                    className="p-8 bg-green-900 hover:bg-green-800 rounded-lg shadow-md transition-colors duration-300 cursor-pointer"
                >
                    <h3 className="text-xl font-bold mb-4">Active Tracking</h3>
                    <p className="text-4xl font-bold">{trackingStats.active}</p>
                    <p className="text-sm opacity-75 mt-2">Active location share sessions</p>
                </Link>

                <Link
                    href="/track?tab=denied"
                    className="p-8 bg-red-900 hover:bg-red-800 rounded-lg shadow-md transition-colors duration-300 cursor-pointer"
                >
                    <h3 className="text-xl font-bold mb-4">Denied Requests</h3>
                    <p className="text-4xl font-bold">{trackingStats.denied}</p>
                    <p className="text-sm opacity-75 mt-2">Rejected location requests</p>
                </Link>

                <Link
                    href="/track?tab=all"
                    className="p-8 bg-blue-900 hover:bg-blue-800 rounded-lg shadow-md transition-colors duration-300 cursor-pointer"
                >
                    <h3 className="text-xl font-bold mb-4">Total Requests</h3>
                    <p className="text-4xl font-bold">{trackingStats.total}</p>
                    <p className="text-sm opacity-75 mt-2">All tracking requests</p>
                </Link>
            </section>

            {/* Quick Actions */}
            <section className="mb-12">
                <h2 className="text-2xl font-bold mb-6">Quick Actions</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <Link
                        href="/track"
                        className="p-4 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors duration-300 text-center block"
                    >
                        📍 Start Tracking
                    </Link>
                    <button
                        onClick={shareMyLocation}
                        className="p-4 bg-green-600 hover:bg-green-700 rounded-lg transition-colors duration-300"
                    >
                        📤 Share My Location
                    </button>
                    <button
                        onClick={viewTrackingHistory}
                        className="p-4 bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors duration-300"
                    >
                        📊 View Tracking History
                    </button>
                    <Link
                        href="/track?tab=permissions"
                        className="p-4 bg-orange-600 hover:bg-orange-700 rounded-lg transition-colors duration-300 text-center block"
                    >
                        ⚙️ Manage Permissions
                    </Link>
                    <Link
                        href="/track?tab=active"
                        className="p-4 bg-gray-600 hover:bg-gray-700 rounded-lg transition-colors duration-300 text-center block"
                    >
                        📋 Tracking Manager
                    </Link>
                    <button className="p-4 bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors duration-300">
                        ⚙️ Settings
                    </button>
                </div>
            </section>
        </div>
    );
}