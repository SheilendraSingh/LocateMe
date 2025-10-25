// layout.tsx (updated)
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "../styles/globals.css";
import Header from "@/components/header";
import Footer from "@/components/footer";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "LocateMe",
  description: "A Location Tracker WebApp",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Header />
        <main className="pt-16 min-h-screen"> {/* Added pt-16 for header spacing; min-h-screen for full-height pages */}
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"> {/* Optional: Container for main content to match header */}
            {children}
          </div>
        </main>
        <Footer />
      </body>
    </html>
  );
}