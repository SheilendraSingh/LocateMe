"use client";

import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";

export default function SettingsPage() {
    const { user, isLoading } = useAuth();
    const router = useRouter();
    const [isDarkMode, setIsDarkMode] = useState(false);

    useEffect(() => {
        if (!isLoading && !user) {
            toast.error("Please log in to access settings");
            router.push("/auth/login");
        }
    }, [user, isLoading, router]);

    useEffect(() => {
        const savedTheme = localStorage.getItem("theme");

        // Default theme is dark
        const isDark = savedTheme !== "light";


        if (isDark) {
            document.documentElement.classList.add("dark");
        } else {
            document.documentElement.classList.remove("dark");
        }
    }, []);

    const toggleTheme = () => {
        if (isDarkMode) {
            // switch to light
            document.documentElement.classList.remove("dark");
            localStorage.setItem("theme", "light");
            setIsDarkMode(false);
            toast.success("Switched to light mode");
        } else {
            // switch to dark
            document.documentElement.classList.add("dark");
            localStorage.setItem("theme", "dark");
            setIsDarkMode(true);
            toast.success("Switched to dark mode");
        }
    };

    if (isLoading) {
        return <div className="flex items-center justify-center h-screen text-foreground">Loading...</div>;
    }

    if (!user) {
        return null;
    }

    return (
        <div className="min-h-screen bg-background text-foreground py-8 px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto">
                <h1 className="text-3xl font-bold mb-8">Settings</h1>

                <div className="space-y-8">
                    {/* Theme Settings */}
                    <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6">
                        <h2 className="text-xl font-semibold mb-4">Appearance</h2>
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="font-medium">Theme</h3>
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                    Choose your preferred theme
                                </p>
                            </div>
                            <button
                                onClick={toggleTheme}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                            >
                                {isDarkMode ? "🌙 Dark" : "☀️ Light"}
                            </button>
                        </div>
                    </div>

                    {/* General Settings */}
                    <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6">
                        <h2 className="text-xl font-semibold mb-4">General</h2>
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="font-medium">Account Information</h3>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">
                                        View and manage your account details
                                    </p>
                                </div>
                                <div className="text-right">
                                    <p className="font-medium">{user.name}</p>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">{user.email}</p>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">{user.phone}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Privacy Settings */}
                    <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6">
                        <h2 className="text-xl font-semibold mb-4">Privacy</h2>
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="font-medium">Location Sharing</h3>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">
                                        Control how your location is shared
                                    </p>
                                </div>
                                <span className="text-sm text-gray-500">Coming soon</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}