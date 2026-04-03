"use client";

import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
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



    useEffect(() => {
        if (!isLoading && !user) {
            toast.error("Please log in to access the dashboard");
            router.push("/auth/login");
        }
    }, [user, isLoading, router]);

    useEffect(() => {
        if (!user || !token) return;

        const loadStats = async () => {
            try {
                const res = await fetch(
                    `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"}/auth/tracking-status`,
                    {
                        method: "GET",
                        headers: {
                            Authorization: `Bearer ${token}`,
                        },
                    }
                );

                if (res.ok) {
                    const data = await res.json();
                    setTrackingStats(data.stats);
                }
            } catch (error) {
                console.error("Failed to fetch tracking stats:", error);
            }
        };

        loadStats();
        const interval = setInterval(loadStats, 30000);

        return () => clearInterval(interval);
    }, [user, token]);

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

            // Copy location to clipboard
            const mapboxLink = `https://www.mapbox.com/mapbox-gl-js/example/?lng=${longitude}&lat=${latitude}&zoom=15`;
            await navigator.clipboard.writeText(mapboxLink);


            toast.success("Mapbox link copied to clipboard!");
        } catch (error) {
            console.error("Error getting location:", error);
            toast.error("Failed to get your location");
        }
    };


    const viewTrackingHistory = () => {
        // Navigate to track page with tracking manager open
        router.push("/track?tab=history");
    };

    return (
        <div className="min-h-screen bg-background text-foreground">
            {/* Hero Section */}
            <section className="py-8 sm:py-12 px-4 sm:px-6 lg:px-8">
                <div className="max-w-7xl mx-auto">
                    <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4">Welcome, {user.name}!</h1>
                    <p className="text-base sm:text-lg opacity-75">Monitor your tracking requests and location sharing status.</p>
                </div>
            </section>

            {/* User Info Card */}
            <section className="mb-8 sm:mb-12 px-4 sm:px-6 lg:px-8">
                <div className="max-w-7xl mx-auto">
                    <div className="p-6 sm:p-8 bg-gray-800 rounded-lg shadow-md">
                        <h2 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6">Your Account</h2>
                        <div className="space-y-3 sm:space-y-4">
                            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center border-b border-gray-600 pb-3 sm:pb-4">
                                <span className="opacity-75 text-sm sm:text-base mb-1 sm:mb-0">Name:</span>
                                <span className="font-semibold text-sm sm:text-base">{user.name}</span>
                            </div>
                            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center border-b border-gray-600 pb-3 sm:pb-4">
                                <span className="opacity-75 text-sm sm:text-base mb-1 sm:mb-0">Email:</span>
                                <span className="font-semibold text-sm sm:text-base break-all">{user.email}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Stats Cards */}
            <section className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 lg:gap-8 mb-8 sm:mb-12 px-4 sm:px-6 lg:px-8">
                <div className="max-w-7xl mx-auto w-full">
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 lg:gap-8">
                        <Link
                            href="/track?tab=pending"
                            className="p-4 sm:p-6 lg:p-8 bg-yellow-900 hover:bg-yellow-800 rounded-lg shadow-md transition-colors duration-300 cursor-pointer block text-center"
                        >
                            <h3 className="text-sm sm:text-base lg:text-xl font-bold mb-2 sm:mb-4">Pending Requests</h3>
                            <p className="text-2xl sm:text-3xl lg:text-4xl font-bold">{trackingStats.pending}</p>
                            <p className="text-xs sm:text-sm opacity-75 mt-1 sm:mt-2">Location requests waiting for approval</p>
                        </Link>

                        <Link
                            href="/track?tab=active"
                            className="p-4 sm:p-6 lg:p-8 bg-green-900 hover:bg-green-800 rounded-lg shadow-md transition-colors duration-300 cursor-pointer block text-center"
                        >
                            <h3 className="text-sm sm:text-base lg:text-xl font-bold mb-2 sm:mb-4">Active Tracking</h3>
                            <p className="text-2xl sm:text-3xl lg:text-4xl font-bold">{trackingStats.active}</p>
                            <p className="text-xs sm:text-sm opacity-75 mt-1 sm:mt-2">Active location share sessions</p>
                        </Link>

                        <Link
                            href="/track?tab=denied"
                            className="p-4 sm:p-6 lg:p-8 bg-red-900 hover:bg-red-800 rounded-lg shadow-md transition-colors duration-300 cursor-pointer block text-center"
                        >
                            <h3 className="text-sm sm:text-base lg:text-xl font-bold mb-2 sm:mb-4">Denied Requests</h3>
                            <p className="text-2xl sm:text-3xl lg:text-4xl font-bold">{trackingStats.denied}</p>
                            <p className="text-xs sm:text-sm opacity-75 mt-1 sm:mt-2">Rejected location requests</p>
                        </Link>

                        <Link
                            href="/track?tab=all"
                            className="p-4 sm:p-6 lg:p-8 bg-blue-900 hover:bg-blue-800 rounded-lg shadow-md transition-colors duration-300 cursor-pointer block text-center col-span-2 lg:col-span-1"
                        >
                            <h3 className="text-sm sm:text-base lg:text-xl font-bold mb-2 sm:mb-4">Total Requests</h3>
                            <p className="text-2xl sm:text-3xl lg:text-4xl font-bold">{trackingStats.total}</p>
                            <p className="text-xs sm:text-sm opacity-75 mt-1 sm:mt-2">All tracking requests</p>
                        </Link>
                    </div>
                </div>
            </section>

            {/* Quick Actions */}
            <section className="mb-8 sm:mb-12 px-4 sm:px-6 lg:px-8">
                <div className="max-w-7xl mx-auto">
                    <h2 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6">Quick Actions</h2>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3 sm:gap-4">
                        <Link
                            href="/track"
                            className="p-3 sm:p-4 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors duration-300 text-center block text-sm sm:text-base"
                        >
                            📍 Start Tracking
                        </Link>
                        <button
                            onClick={shareMyLocation}
                            className="p-3 sm:p-4 bg-green-600 hover:bg-green-700 rounded-lg transition-colors duration-300 cursor-pointer text-sm sm:text-base"
                        >
                            📤 Share My Location
                        </button>
                        <button
                            onClick={viewTrackingHistory}
                            className="p-3 sm:p-4 bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors duration-300 cursor-pointer text-sm sm:text-base"
                        >
                            📊 View Tracking History
                        </button>
                        <Link
                            href="/track?tab=realtime"
                            className="p-3 sm:p-4 bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors duration-300 text-center block text-sm sm:text-base"
                        >
                            ⚡ Real-Time Tracking
                        </Link>
                        <Link
                            href="/track?tab=active"
                            className="p-3 sm:p-4 bg-gray-600 hover:bg-gray-700 rounded-lg transition-colors duration-300 text-center block text-sm sm:text-base"
                        >
                            📋 Tracking Manager
                        </Link>
                        <button className="p-3 sm:p-4 bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors duration-300 cursor-pointer text-sm sm:text-base col-span-2 sm:col-span-3 lg:col-span-4 xl:col-span-6">
                            ⚙️ Settings
                        </button>
                    </div>
                </div>
            </section>
        </div >
    );
}