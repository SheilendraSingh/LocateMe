// components/Header.tsx
"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";

export default function Header() {
    const router = useRouter();
    const { user, logout, isLoading } = useAuth();
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") setIsMenuOpen(false);
        };
        const handleClickOutside = (e: MouseEvent) => {
            if (!(e.target as HTMLElement).closest(".mobile-menu")) setIsMenuOpen(false);
        };
        if (isMenuOpen) {
            document.addEventListener("keydown", handleKeyDown);
            document.addEventListener("click", handleClickOutside);
        }
        return () => {
            document.removeEventListener("keydown", handleKeyDown);
            document.removeEventListener("click", handleClickOutside);
        };
    }, [isMenuOpen]);

    const handleLogout = () => {
        logout();
        router.push("/");
        setIsMenuOpen(false);
    };

    return (
        <header className="fixed top-0 w-full bg-background shadow-md border-b border-gray-200 dark:border-gray-700 z-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">
                    {/* Logo Section */}
                    <div className="flex items-center space-x-2">
                        <i className="fa-solid fa-location-dot text-2xl text-foreground"></i>
                        <Link href="/" className="text-xl font-bold text-foreground">LocateMe</Link>
                    </div>

                    {/* Navigation Section */}
                    <nav className="hidden md:flex space-x-8">
                        <Link href="/dashboard" className="text-foreground opacity-50 hover:opacity-100 hover:scale-105 transition-all duration-500">
                            Dashboard
                        </Link>
                        <Link href="/track" className="text-foreground opacity-50 hover:opacity-100 hover:scale-105 transition-all duration-500">
                            Track
                        </Link>

                        {isLoading ? (
                            <div className="text-foreground opacity-50">Loading...</div>
                        ) : user ? (
                            <>
                                <span className="text-foreground opacity-75">{user.name}</span>
                                <button
                                    onClick={handleLogout}
                                    className="text-black bg-gray-300 px-2 py-1 rounded-lg hover:bg-white hover:scale-110 transition-all duration-500 cursor-pointer"
                                >
                                    Log Out
                                </button>
                            </>
                        ) : (
                            <>
                                <Link href="/auth/login" className="text-black bg-gray-300 px-2 py-1 rounded-lg hover:bg-white hover:scale-110 transition-all duration-500 cursor-pointer">
                                    Log In
                                </Link>
                                <Link href="/auth/signup" className="text-white bg-gray-700 px-2 py-1 rounded-lg hover:scale-110 transition-all duration-500 cursor-pointer">
                                    Sign Up
                                </Link>
                            </>
                        )}
                    </nav>

                    {/* Mobile Menu Button */}
                    <div className="md:hidden mobile-menu">
                        <button
                            onClick={() => setIsMenuOpen(!isMenuOpen)}
                            className="text-foreground hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer focus:outline-none"
                            aria-label="Toggle mobile menu"
                        >
                            {isMenuOpen ? "✕" : "☰"}
                        </button>
                    </div>
                </div>

                {/* Mobile Menu */}
                {isMenuOpen && (
                    <div className="md:hidden bg-background border-t border-gray-200 dark:border-gray-700 z-50 mobile-menu">
                        <nav className="flex flex-col space-y-4 py-4 px-4">
                            <Link
                                href="/"
                                className="text-foreground opacity-50 hover:opacity-100 hover:scale-105 transition-all duration-500 cursor-pointer"
                                onClick={() => setIsMenuOpen(false)}
                            >
                                Home
                            </Link>
                            <Link
                                href="/dashboard"
                                className="text-foreground opacity-50 hover:opacity-100 hover:scale-105 transition-all duration-500 cursor-pointer"
                                onClick={() => setIsMenuOpen(false)}
                            >
                                Dashboard
                            </Link>
                            <Link
                                href="/track"
                                className="text-foreground opacity-50 hover:opacity-100 hover:scale-105 transition-all duration-500 cursor-pointer"
                                onClick={() => setIsMenuOpen(false)}
                            >
                                Track
                            </Link>

                            {isLoading ? (
                                <div className="text-foreground opacity-50">Loading...</div>
                            ) : user ? (
                                <>
                                    <span className="text-foreground opacity-75">{user.name}</span>
                                    <button
                                        onClick={handleLogout}
                                        className="text-white bg-red-600 px-2 py-1 rounded-lg hover:bg-red-700 transition-all duration-500 cursor-pointer text-left"
                                    >
                                        Log Out
                                    </button>
                                </>
                            ) : (
                                <>
                                    <Link
                                        href="/auth/login"
                                        className="text-black bg-gray-300 px-2 py-1 rounded-lg hover:bg-white transition-all duration-500 cursor-pointer"
                                        onClick={() => setIsMenuOpen(false)}
                                    >
                                        Log In
                                    </Link>
                                    <Link
                                        href="/auth/signup"
                                        className="text-white bg-gray-700 px-2 py-1 rounded-lg hover:bg-gray-600 transition-all duration-500 cursor-pointer"
                                        onClick={() => setIsMenuOpen(false)}
                                    >
                                        Sign Up
                                    </Link>
                                </>
                            )}
                        </nav>
                    </div>
                )}
            </div>
        </header>
    );
}