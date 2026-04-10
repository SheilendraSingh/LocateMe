"use client";

import { useEffect } from "react";

export default function ThemeInitializer() {
    useEffect(() => {
        const savedTheme = localStorage.getItem("theme");

        // Default is dark unless user explicitly selected light
        if (savedTheme === "light") {
            document.documentElement.classList.remove("dark");
        } else {
            document.documentElement.classList.add("dark");
            localStorage.setItem("theme", "dark");
        }
    }, []);

    return null;
}