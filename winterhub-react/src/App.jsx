import React, { useState } from "react";
import Navbar from "./components/Navbar";
import ThemeToggle from "./components/ThemeToggle";

const App = () => {
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-r from-blue-900 via-blue-700 to-purple-900 text-white">
      <Navbar />
      <main className="flex-1 flex flex-col items-center justify-center text-center p-6">
        <h1 className="text-5xl font-bold mb-4">WinterHub0019</h1>
        <p className="text-lg mb-6 max-w-2xl">
          Enterprise SEO solutions engineered for SaaS and technology leaders.
          Sustainable organic growth through technical excellence.
        </p>
        <div className="flex gap-4">
          <a
            href="#contact"
            className="px-6 py-3 bg-blue-600 hover:bg-blue-800 transition rounded-lg"
          >
            Request Technical Audit
          </a>
          <a
            href="#results"
            className="px-6 py-3 bg-gray-700 hover:bg-gray-900 transition rounded-lg"
          >
            View Case Studies
          </a>
        </div>
      </main>
      <ThemeToggle />
    </div>
  );
};

export default App;
