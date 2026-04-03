"use client";

import Link from "next/link";
import "mapbox-gl/dist/mapbox-gl.css";
import mapboxgl from "mapbox-gl";
import { useEffect, useState, useRef } from "react";
import { useAuth } from "@/context/AuthContext";

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN!;

export default function HomePage() {
  const { user, isLoading } = useAuth();

  const mapRef = useRef<mapboxgl.Map | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;

    // Create map
    mapRef.current = new mapboxgl.Map({
      container,
      style: "mapbox://styles/mapbox/dark-v11",
      center: [78.9629, 20.5937],
      zoom: 1.7,
      fadeDuration: 0,
      interactive: false,
    });

    mapRef.current.on("style.load", () => {
      // Enable globe
      mapRef.current!.setProjection("globe");

      // Remove blue glow
      mapRef.current!.setFog({});

      // Fade-in effect
      container.classList.add("loaded");

      // current location
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude, longitude } = pos.coords;

          mapRef.current?.flyTo({
            center: [longitude, latitude],
            zoom: 2,
            speed: 2,
            curve: 1.5,
            essential: true,
          });
        },
        () => { },
        { enableHighAccuracy: true }
      );

      // Fix resize on refresh
      setTimeout(() => mapRef.current?.resize(), 100);
    });

    return () => mapRef.current?.remove();
  }, []);

  return (
    <div className="relative min-h-screen overflow-hidden">

      {/* FULLSCREEN MAP ALWAYS BEHIND */}
      <div
        id="map"
        ref={containerRef}
        className="fixed inset-0 w-screen h-screen z-0"
      ></div>

      {/* Show NOTHING until contentReady */}

      <div id="hero" className="relative z-20 fade-in max-w-7xl mx-auto">

        {/* HERO SECTION */}
        <section className="flex flex-col items-center justify-center text-center py-16 sm:py-20 lg:py-24 px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-bold mb-4 sm:mb-6">
            Welcome to LocateMe
          </h1>

          <p className="text-base sm:text-lg lg:text-xl mb-6 sm:mb-8 max-w-2xl">
            Track locations effortlessly with our advanced web app.
            Stay connected and secure wherever you go.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
            {user ? (
              <Link
                href="/dashboard"
                className="bg-green-600 hover:bg-green-700 hover:scale-105 text-white px-6 sm:px-8 py-3 sm:py-3.5 rounded-lg transition-all duration-300 cursor-pointer text-center"
              >
                Go to Dashboard
              </Link>
            ) : (
              <>
                <Link
                  href="/auth/signup"
                  className="bg-gray-300 hover:bg-white hover:scale-105 text-black px-6 sm:px-8 py-3 sm:py-3.5 rounded-lg transition-all duration-300 cursor-pointer text-center"
                >
                  Get Started
                </Link>

                <Link
                  href="/auth/login"
                  className="border border-foreground text-foreground hover:bg-foreground hover:text-background hover:scale-105 px-6 sm:px-8 py-3 sm:py-3.5 rounded-lg transition-all duration-300 cursor-pointer text-center"
                >
                  Log In
                </Link>
              </>
            )}
          </div>
        </section>

        {/* FEATURES SECTION */}
        <section className="py-16 px-4 sm:px-6 lg:px-8 bg-gray-50 dark:bg-gray-950">
          <div className="max-w-7xl mx-auto">
            <h2 className="text-3xl font-bold text-center mb-12">
              Features
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              <div className="text-center p-6 bg-white dark:bg-gray-900 rounded-lg shadow-md">
                <i className="fa-solid fa-location-dot text-3xl text-red-600 mb-4"></i>
                <h3 className="text-xl font-semibold mb-2">
                  Real-Time Tracking
                </h3>
                <p className="text-foreground">
                  Monitor locations in real-time with precision.
                </p>
              </div>

              <div className="text-center p-6 bg-white dark:bg-gray-900 rounded-lg shadow-md">
                <i className="fa-solid fa-shield-alt text-3xl text-green-600 mb-4"></i>
                <h3 className="text-xl font-semibold mb-2">
                  Secure & Private
                </h3>
                <p className="text-foreground">
                  Your data is protected with top-tier security.
                </p>
              </div>

              <div className="text-center p-6 bg-white dark:bg-gray-900 rounded-lg shadow-md">
                <i className="fa-solid fa-mobile-alt text-3xl text-purple-600 mb-4"></i>
                <h3 className="text-xl font-semibold mb-2">
                  Mobile Friendly
                </h3>
                <p className="text-foreground">
                  Works seamlessly on all devices.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="flex flex-col py-12 sm:py-16 lg:py-20 px-4 sm:px-6 lg:px-8 justify-center items-center text-center">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-3 sm:mb-4">
            Ready to Get Started?
          </h2>
          <p className="text-base sm:text-lg mb-6 sm:mb-8">
            Join thousands of users tracking locations with ease.
          </p>
          <Link
            href="/auth/signup"
            className="bg-gray-300 hover:bg-white hover:scale-105 text-black px-6 sm:px-8 py-3 sm:py-3.5 rounded-lg text-base sm:text-lg transition-all duration-300 cursor-pointer"
          >
            Sign Up
          </Link>
        </section>

      </div>

    </div>
  );
}
