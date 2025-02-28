import React from "react";

const Navbar = () => {
  return (
    <nav className="w-full py-4 px-6 flex justify-between items-center bg-opacity-90 backdrop-blur-md">
      <a href="/" className="text-2xl font-bold tracking-wide">
        WinterHub0019
      </a>
      <ul className="hidden md:flex gap-6">
        <li>
          <a href="#solutions" className="hover:text-blue-300 transition">
            Solutions
          </a>
        </li>
        <li>
          <a href="#methodology" className="hover:text-blue-300 transition">
            Methodology
          </a>
        </li>
        <li>
          <a href="#results" className="hover:text-blue-300 transition">
            Results
          </a>
        </li>
        <li>
          <a href="#contact" className="hover:text-blue-300 transition">
            Contact
          </a>
        </li>
      </ul>
      <button className="md:hidden p-2 rounded-lg bg-blue-600">
        ☰
      </button>
    </nav>
  );
};

export default Navbar;
