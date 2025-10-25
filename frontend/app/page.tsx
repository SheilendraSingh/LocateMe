// app/page.tsx
export default function HomePage() {
  return (
    <div className="min-h-screen bg-background text-foreground"> {/* Full-height, theme-aware background and text */}
      {/* Hero Section */}
      <section className="flex flex-col items-center justify-center text-center py-20 px-4 sm:px-6 lg:px-8">
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-4">
          Welcome to LocateMe
        </h1>
        <p className="text-lg sm:text-xl mb-8 max-w-2xl">
          Track locations effortlessly with our advanced web app. Stay connected and secure wherever you go.
        </p>
        <div className="flex flex-col sm:flex-row gap-4">
          <a href="/signup" className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition-colors duration-200 cursor-pointer">
            Get Started
          </a>
          <a href="/login" className="border border-foreground text-foreground hover:bg-foreground hover:text-background px-6 py-3 rounded-lg transition-colors duration-200 cursor-pointer">
            Log In
          </a>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-gray-50 dark:bg-gray-900"> {/* Alternating background for sections */}
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">Features</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="text-center p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md">
              <i className="fa-solid fa-location-dot text-3xl text-blue-600 mb-4"></i>
              <h3 className="text-xl font-semibold mb-2">Real-Time Tracking</h3>
              <p className="text-foreground">Monitor locations in real-time with precision.</p>
            </div>
            <div className="text-center p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md">
              <i className="fa-solid fa-shield-alt text-3xl text-green-600 mb-4"></i>
              <h3 className="text-xl font-semibold mb-2">Secure & Private</h3>
              <p className="text-foreground">Your data is protected with top-tier security.</p>
            </div>
            <div className="text-center p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md">
              <i className="fa-solid fa-mobile-alt text-3xl text-purple-600 mb-4"></i>
              <h3 className="text-xl font-semibold mb-2">Mobile Friendly</h3>
              <p className="text-foreground">Works seamlessly on all devices.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Call-to-Action Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="text-3xl font-bold mb-4">Ready to Get Started?</h2>
        <p className="text-lg mb-8">Join thousands of users tracking locations with ease.</p>
        <a href="/signup" className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-lg text-lg transition-colors duration-200 cursor-pointer">
          Sign Up Now
        </a>
      </section>
    </div>
  );
}
