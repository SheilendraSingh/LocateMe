// components/Header.tsx
"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function Header() {
    const router = useRouter();
    return (
        <header className="fixed top-0 w-full bg-background shadow-md border-b border-gray-200 dark:border-gray-700">
            {/* Container matches your layout's max-width for consistency */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">
                    {/* Logo Section: Icon + Text */}
                    <div className="flex items-center space-x-2">
                        <i className="fa-solid fa-location-dot text-2xl text-foreground"></i>  {/* Replace with actual icon (e.g., from an icon library) */}
                        <span className="text-xl font-bold text-foreground">LocateMe</span>
                    </div>

                    {/* Navigation Section */}
                    <nav className="hidden md:flex space-x-8">
                        <Link href="/" className="text-white   opacity-50 hover:opacity-100 hover:scale-105 transition-all duration-500">
                            Dashboard
                        </Link>
                        <Link href="/managerequests" className="text-white   opacity-50 hover:opacity-100 hover:scale-105 transition-all duration-500">
                            Manage Requests
                        </Link>
                        <Link href="/grantpermission" className="text-white   opacity-50 hover:opacity-100 hover:scale-105 transition-all duration-500">
                            Grant Permission
                        </Link>
                        <Link href="/permissions" className="text-white   opacity-50 hover:opacity-100 hover:scale-105 transition-all duration-500">
                            Permissions
                        </Link>
                        <button onClick={() => router.push("/login")} className="text-black bg-white px-2 py-1 rounded-lg text-opacity-50 hover:opacity-100 hover:scale-105 transition-all duration-500 cursor-pointer">
                            Log In
                        </button>
                        <button onClick={() => router.push("/signup")} className="text-white bg-gray-700 px-2 py-1 rounded-lg  hover:scale-105 transition-all duration-500 cursor-pointer ">
                            Sign Up
                        </button>
                    </nav>

                    {/* Mobile Menu Button (placeholder; expand with state for a real menu) */}
                    <div className="md:hidden">
                        <button className="text-foreground hover:text-blue-600 dark:hover:text-blue-400">
                            ☰
                        </button>
                    </div>
                </div>
            </div>
        </header>
    );
}