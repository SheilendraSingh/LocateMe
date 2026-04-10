"use client";

import { useEffect } from "react";

export default function ThemeInitializer() {
    useEffect(() => {
        const savedTheme = localStorage.getItem("theme");
        const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
        if (savedTheme === "dark" || (!savedTheme && prefersDark)) {
            document.documentElement.classList.add("dark");
        }
    }, []);
    return null;
}