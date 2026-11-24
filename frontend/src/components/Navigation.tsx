import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Heart, LogOut, Menu, PlusCircle, ShoppingBag, User as UserIcon, X } from 'lucide-react';
import { getInitials } from '../lib/api';
import { useAuth } from '../context/AuthContext';

export default function Navigation() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, isLoading } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  const navLinks = [
    { label: 'Browse', href: '/' },
    { label: 'Sell', href: '/sell' },
    ...(user
      ? [
          { label: 'My listings', href: '/my-listings' },
          { label: 'Saved', href: '/favorites' },
        ]
      : []),
  ];

  const handleLogout = async () => {
    await logout();
    setMobileMenuOpen(false);
    navigate('/');
  };

  const initials = user ? getInitials(user.full_name) : '';

  return (
    <header className="bg-white border-b border-gray-100 sticky top-0 z-30">
      <div className="max-w-6xl mx-auto flex items-center justify-between py-3.5 px-4 sm:px-6">
        <Link to="/" className="flex items-center gap-2.5 sm:gap-3 hover:opacity-90 shrink-0">
          <div className="w-8 h-8 bg-blue-600 rounded-lg shadow-sm flex items-center justify-center">
            <ShoppingBag className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-lg sm:text-xl tracking-tight text-gray-900">
            Student Market
          </span>
        </Link>

        {/* Desktop Pill Nav */}
        <nav className="hidden md:flex items-center gap-1 bg-gray-100 p-1 rounded-full">
          {navLinks.map((link) => {
            const isActive = location.pathname === link.href;
            return (
              <Link
                key={link.href}
                to={link.href}
                className={`px-5 py-1.5 text-sm font-medium rounded-full transition-colors ${
                  isActive
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* Desktop Right Actions */}
        <div className="hidden md:flex items-center gap-3">
          {isLoading ? (
            <div className="w-24 h-9 bg-gray-100 rounded-lg animate-pulse" />
          ) : user ? (
            <div className="flex items-center gap-3">
              <Link
                to="/profile"
                className="flex items-center gap-2.5 cursor-pointer hover:opacity-80 transition-opacity"
              >
                <span className="text-sm font-medium text-gray-700 max-w-[140px] truncate">
                  {user.full_name}
                </span>
                <div className="w-9 h-9 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center text-sm font-bold">
                  {initials}
                </div>
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                title="Sign out"
                className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                aria-label="Sign out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                to="/login"
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Sign In
              </Link>
              <Link
                to="/register"
                className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
              >
                Join
              </Link>
            </div>
          )}
        </div>

        {/* Mobile Right Actions + Hamburger */}
        <div className="flex md:hidden items-center gap-2">
          {!isLoading &&
            (user ? (
              <Link
                to="/profile"
                className="w-9 h-9 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center text-xs font-bold"
                aria-label="My profile"
              >
                {initials}
              </Link>
            ) : (
              <Link
                to="/login"
                className="px-3.5 py-2 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-700 transition-colors"
              >
                Sign In
              </Link>
            ))}

          <button
            type="button"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            className="p-2 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
            aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Dropdown Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-gray-100 bg-white px-4 py-3 shadow-sm">
          <nav className="flex flex-col gap-1">
            <Link
              to="/"
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-colors ${
                location.pathname === '/'
                  ? 'bg-blue-50 text-blue-600'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <ShoppingBag className="w-4 h-4" />
              Browse marketplace
            </Link>
            <Link
              to="/sell"
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-colors ${
                location.pathname === '/sell'
                  ? 'bg-blue-50 text-blue-600'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <PlusCircle className="w-4 h-4" />
              Sell an item
            </Link>
            {user && (
              <>
                <Link
                  to="/my-listings"
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-colors ${
                    location.pathname === '/my-listings'
                      ? 'bg-blue-50 text-blue-600'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <ShoppingBag className="w-4 h-4" />
                  My listings
                </Link>
                <Link
                  to="/favorites"
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-colors ${
                    location.pathname === '/favorites'
                      ? 'bg-blue-50 text-blue-600'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <Heart className="w-4 h-4" />
                  Saved items
                </Link>
                <Link
                  to="/profile"
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-colors ${
                    location.pathname === '/profile'
                      ? 'bg-blue-50 text-blue-600'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <UserIcon className="w-4 h-4" />
                  My profile ({user.full_name})
                </Link>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-red-600 hover:bg-red-50 transition-colors text-left"
                >
                  <LogOut className="w-4 h-4" />
                  Sign out
                </button>
              </>
            )}
            {!user && (
              <div className="grid grid-cols-2 gap-2 pt-2 mt-1 border-t border-gray-100">
                <Link
                  to="/login"
                  className="py-2.5 text-center rounded-xl border border-gray-200 text-sm font-bold text-gray-700 hover:bg-gray-50"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  className="py-2.5 text-center rounded-xl bg-blue-600 text-sm font-bold text-white hover:bg-blue-700"
                >
                  Create account
                </Link>
              </div>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
