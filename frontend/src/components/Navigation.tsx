import React from 'react';
import { Link, useLocation } from 'react-router-dom';

export default function Navigation({
  user,
}: {
  user?: { name: string; initials: string } | null;
}) {
  const location = useLocation();

  const navLinks = [
    { label: "Browse", href: "/" },
    { label: "Sell", href: "/sell" },
    { label: "My listings", href: "/my-listings" },
    { label: "Other shit", href: "/other"}
  ];

  return (
    <header className="flex items-center justify-between py-4 px-8 bg-white border-b border-gray-100 sticky top-0 z-10">
      <Link to="/" className="flex items-center gap-3 hover:opacity-90">
        <div className="w-8 h-8 bg-blue-600 rounded-lg shadow-sm"></div>
        <span className="font-bold text-xl tracking-tight text-gray-900">Student Market</span>
      </Link>
      
      <nav className="hidden md:flex items-center gap-1 bg-gray-100 p-1 rounded-full">
        {navLinks.map((link) => {
          const isActive = location.pathname === link.href;
          return (
            <Link
              key={link.label}
              to={link.href}
              className={`px-5 py-1.5 text-sm font-medium rounded-full transition-colors ${
                isActive 
                  ? "bg-white text-blue-600 shadow-sm" 
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              {link.label}
            </Link>
          );
        })}
      </nav>

      <div className="flex items-center gap-3">
        {user ? (
          <Link to="/profile" className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity">
            <span className="text-sm font-medium text-gray-600">{user.name}</span>
            <div className="w-9 h-9 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center text-sm font-bold">
              {user.initials}
            </div>
          </Link>
        ) : (
          <Link to="/login" className="px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors">
            Sign In
          </Link>
        )}
      </div>
    </header>
  );
}