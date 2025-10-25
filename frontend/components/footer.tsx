// components/Footer.tsx
export default function Footer() {
    return (
        <footer className="w-full bg-background border-t border-gray-200 dark:border-gray-700 mt-16"> {/* Full-width, theme-aware background, top border, margin-top to avoid header overlap */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4"> {/* Centered container with responsive padding */}
                <div className="flex justify-center items-center"> {/* Center content horizontally and vertically */}
                    <div className="text-foreground text-sm"> {/* Theme-aware text color, small size */}
                        &copy; {new Date().getFullYear()} LocateMe. All rights reserved.
                    </div>
                </div>
            </div>
        </footer>
    );
}
