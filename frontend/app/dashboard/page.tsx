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
            <section className="py-10 sm:py-14 px-4 sm:px-6 lg:px-8">
                <div className="max-w-6xl mx-auto rounded-4xl border border-slate-200/70 bg-slate-50/90 p-8 shadow-xl shadow-slate-900/5 dark:border-slate-700/80 dark:bg-slate-950/70">
                    <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                        <div className="space-y-4">
                            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight">Welcome back, {user.name}!</h1>
                            <p className="max-w-3xl text-base sm:text-lg text-slate-600 dark:text-slate-300">
                                Monitor your tracking requests and location sharing status from one central dashboard.
                            </p>
                        </div>
                        <div className="flex flex-wrap gap-3">
                            <button
                                onClick={shareMyLocation}
                                className="rounded-full bg-green-600 px-5 py-3 text-sm font-semibold text-white hover:bg-green-500 transition-all duration-300"
                            >
                                📤 Share My Location
                            </button>
                            <button
                                onClick={viewTrackingHistory}
                                className="rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-700 transition-all duration-300"
                            >
                                📊 View History
                            </button>
                        </div>
                    </div>
                </div>
            </section>

            {/* User Info Card */}
            <section className="mb-10 sm:mb-14 px-4 sm:px-6 lg:px-8">
                <div className="max-w-6xl mx-auto">
                    <div className="rounded-[1.75rem] border border-slate-200/70 bg-white/90 p-6 sm:p-8 shadow-lg shadow-slate-900/5 dark:border-slate-700/80 dark:bg-slate-900/95">
                        <h2 className="text-2xl sm:text-3xl font-bold mb-5">Your Account</h2>
                        <div className="space-y-4 sm:space-y-5">
                            <div className="flex flex-col gap-2 sm:flex-row sm:justify-between sm:items-center border-b border-slate-200/70 pb-4">
                                <span className="opacity-75 text-sm sm:text-base">Name:</span>
                                <span className="font-semibold text-sm sm:text-base">{user.name}</span>
                            </div>
                            <div className="flex flex-col gap-2 sm:flex-row sm:justify-between sm:items-center border-b border-slate-200/70 pb-4">
                                <span className="opacity-75 text-sm sm:text-base">Email:</span>
                                <span className="font-semibold text-sm sm:text-base break-all">{user.email}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Stats Cards */}
            <section className="mb-10 sm:mb-14 px-4 sm:px-6 lg:px-8">
                <div className="max-w-6xl mx-auto">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                        <Link
                            href="/track?tab=pending"
                            className="rounded-3xl bg-linear-to-br from-yellow-700 to-yellow-800 p-6 sm:p-8 text-white shadow-lg shadow-yellow-500/10 transition hover:scale-[1.01]"
                        >
                            <h3 className="text-lg sm:text-xl font-semibold mb-3">Pending Requests</h3>
                            <p className="text-3xl sm:text-4xl font-bold">{trackingStats.pending}</p>
                            <p className="mt-3 text-sm opacity-80">Requests waiting for approval</p>
                        </Link>

                        <Link
                            href="/track?tab=active"
                            className="rounded-3xl bg-linear-to-br from-emerald-700 to-emerald-800 p-6 sm:p-8 text-white shadow-lg shadow-emerald-500/10 transition hover:scale-[1.01]"
                        >
                            <h3 className="text-lg sm:text-xl font-semibold mb-3">Active Tracking</h3>
                            <p className="text-3xl sm:text-4xl font-bold">{trackingStats.active}</p>
                            <p className="mt-3 text-sm opacity-80">Active location share sessions</p>
                        </Link>

                        <Link
                            href="/track?tab=denied"
                            className="rounded-3xl bg-linear-to-br from-red-700 to-red-800 p-6 sm:p-8 text-white shadow-lg shadow-red-500/10 transition hover:scale-[1.01]"
                        >
                            <h3 className="text-lg sm:text-xl font-semibold mb-3">Denied Requests</h3>
                            <p className="text-3xl sm:text-4xl font-bold">{trackingStats.denied}</p>
                            <p className="mt-3 text-sm opacity-80">Rejected location requests</p>
                        </Link>

                        <Link
                            href="/track?tab=all"
                            className="rounded-3xl bg-linear-to-br from-sky-700 to-sky-800 p-6 sm:p-8 text-white shadow-lg shadow-sky-500/10 transition hover:scale-[1.01]"
                        >
                            <h3 className="text-lg sm:text-xl font-semibold mb-3">Total Requests</h3>
                            <p className="text-3xl sm:text-4xl font-bold">{trackingStats.total}</p>
                            <p className="mt-3 text-sm opacity-80">All tracking requests</p>
                        </Link>
                    </div>
                </div>
            </section>

            {/* Quick Actions */}
            <section className="mb-10 sm:mb-14 px-4 sm:px-6 lg:px-8">
                <div className="max-w-6xl mx-auto">
                    <h2 className="text-2xl sm:text-3xl font-bold mb-5">Quick Actions</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                        <Link
                            href="/track"
                            className="rounded-2xl bg-blue-600 px-5 py-5 text-center text-sm font-semibold text-white transition hover:bg-blue-500"
                        >
                            📍 Start Tracking
                        </Link>
                        <button
                            onClick={shareMyLocation}
                            className="rounded-2xl bg-green-600 px-5 py-5 text-sm font-semibold text-white transition hover:bg-green-500"
                        >
                            📤 Share My Location
                        </button>
                        <button
                            onClick={viewTrackingHistory}
                            className="rounded-2xl bg-purple-600 px-5 py-5 text-sm font-semibold text-white transition hover:bg-purple-500"
                        >
                            📊 View Tracking History
                        </button>
                        <Link
                            href="/track?tab=realtime"
                            className="rounded-2xl bg-violet-600 px-5 py-5 text-center text-sm font-semibold text-white transition hover:bg-violet-500"
                        >
                            ⚡ Real-Time Tracking
                        </Link>
                        <Link
                            href="/track?tab=active"
                            className="rounded-2xl bg-slate-600 px-5 py-5 text-center text-sm font-semibold text-white transition hover:bg-slate-500"
                        >
                            📋 Tracking Manager
                        </Link>
                        <button
                            onClick={() => router.push("/settings")}
                            className="rounded-2xl bg-indigo-600 px-5 py-5 text-sm font-semibold text-white transition hover:bg-indigo-500 col-span-full cursor-pointer">
                            ⚙️ Settings
                        </button>
                    </div>
                </div>
            </section>
        </div>
    );
}