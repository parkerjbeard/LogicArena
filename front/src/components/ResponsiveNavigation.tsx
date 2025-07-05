'use client';

import Link from 'next/link';
import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/lib/auth/AuthContext';
import { useBreakpoint, useSwipeGesture } from '@/hooks/useResponsive';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Bars3Icon, 
  XMarkIcon, 
  HomeIcon, 
  PuzzlePieceIcon, 
  TrophyIcon,
  BookOpenIcon,
  UserIcon,
  ArrowLeftOnRectangleIcon,
  ArrowRightOnRectangleIcon,
  UserPlusIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline';

export default function ResponsiveNavigation() {
  const { user, isAuthenticated, logout } = useAuth();
  const { isMobile, isTablet } = useBreakpoint();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const drawerRef = useRef<HTMLDivElement>(null);

  // Close menu when switching to desktop
  useEffect(() => {
    if (!isMobile && !isTablet) {
      setMobileMenuOpen(false);
    }
  }, [isMobile, isTablet]);

  // Add swipe gesture to close drawer
  useSwipeGesture(drawerRef, {
    onSwipeLeft: () => setMobileMenuOpen(false),
    threshold: 50,
  });

  // Prevent body scroll when menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileMenuOpen]);

  const mainNavItems = [
    { href: '/', icon: HomeIcon, label: 'Home' },
    { href: '/practice', icon: PuzzlePieceIcon, label: 'Practice' },
    { href: '/duel', icon: TrophyIcon, label: 'Duel' },
    { href: '/tutorial', icon: BookOpenIcon, label: 'Tutorial' },
    { href: '/leaderboard', icon: ChartBarIcon, label: 'Rankings' },
  ];

  const userNavItems = isAuthenticated ? [
    { href: `/profile/${user?.id}`, icon: UserIcon, label: 'Profile' },
    { href: '/account', icon: UserIcon, label: 'Account' },
    { action: logout, icon: ArrowLeftOnRectangleIcon, label: 'Logout' },
  ] : [
    { href: '/login', icon: ArrowRightOnRectangleIcon, label: 'Login' },
    { href: '/register', icon: UserPlusIcon, label: 'Sign Up' },
  ];

  // Desktop Navigation
  const DesktopNav = () => (
    <nav className="w-full hidden lg:block">
      <div className="z-10 w-full max-w-5xl mx-auto items-center justify-between font-mono text-sm flex px-4">
        <div className="flex items-center justify-between w-full py-6">
          <Link href="/" className="flex items-center">
            <h1 className="text-2xl font-bold">LogicArena-α</h1>
          </Link>
          
          <div className="flex items-center gap-4">
            {isAuthenticated && user ? (
              <>
                <div className="flex items-center gap-3">
                  <span className="text-gray-300 text-sm">
                    {user.handle} • Rating: {user.rating}
                  </span>
                  <Link 
                    href={`/profile/${user.id}`}
                    className="px-3 py-1.5 text-sm font-medium text-gray-300 hover:text-white bg-gray-800/50 rounded-md border border-gray-700 hover:bg-gray-700/50 transition-all"
                  >
                    Profile
                  </Link>
                  <Link 
                    href="/account"
                    className="px-3 py-1.5 text-sm font-medium text-gray-300 hover:text-white bg-gray-800/50 rounded-md border border-gray-700 hover:bg-gray-700/50 transition-all"
                  >
                    Account
                  </Link>
                  <button
                    onClick={logout}
                    className="px-3 py-1.5 text-sm font-medium text-gray-300 hover:text-white bg-gray-800/50 rounded-md border border-gray-700 hover:bg-gray-700/50 transition-all"
                  >
                    Logout
                  </button>
                </div>
              </>
            ) : (
              <div className="flex items-center gap-3">
                <Link 
                  href="/login"
                  className="px-3 py-1.5 text-sm font-medium text-gray-300 hover:text-white bg-gray-800/50 rounded-md border border-gray-700 hover:bg-gray-700/50 transition-all"
                >
                  Login
                </Link>
                <Link 
                  href="/register"
                  className="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors"
                >
                  Sign Up
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );

  // Mobile Top Bar
  const MobileTopBar = () => (
    <div className="lg:hidden fixed top-0 left-0 right-0 z-30 bg-gray-900/95 backdrop-blur-lg border-b border-gray-800 safe-top">
      <div className="flex items-center justify-between px-4 py-3">
        <Link href="/" className="flex items-center">
          <h1 className="text-xl font-bold">LogicArena-α</h1>
        </Link>
        <button
          onClick={() => setMobileMenuOpen(true)}
          className="p-2 text-gray-300 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
          aria-label="Open menu"
        >
          <Bars3Icon className="h-6 w-6" />
        </button>
      </div>
    </div>
  );

  // Mobile Bottom Navigation
  const MobileBottomNav = () => (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-gray-900/95 backdrop-blur-lg border-t border-gray-800 safe-bottom">
      <div className="grid grid-cols-5 gap-1 px-2 py-2">
        {mainNavItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex flex-col items-center justify-center py-2 px-1 rounded-lg hover:bg-gray-800 transition-colors"
            >
              <Icon className="h-5 w-5 text-gray-300" />
              <span className="text-xs text-gray-400 mt-1">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );

  // Mobile Drawer Menu
  const MobileDrawer = () => (
    <AnimatePresence>
      {mobileMenuOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="lg:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
            onClick={() => setMobileMenuOpen(false)}
          />
          
          {/* Drawer */}
          <motion.div
            ref={drawerRef}
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'tween', duration: 0.3 }}
            className="lg:hidden fixed right-0 top-0 bottom-0 z-50 w-80 max-w-[85vw] bg-gray-900 shadow-2xl safe-top safe-bottom"
          >
            <div className="flex flex-col h-full">
              {/* Drawer Header */}
              <div className="flex items-center justify-between p-4 border-b border-gray-800">
                <h2 className="text-lg font-semibold">Menu</h2>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-2 text-gray-300 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
                  aria-label="Close menu"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>
              
              {/* User Info */}
              {isAuthenticated && user && (
                <div className="p-4 border-b border-gray-800 bg-gray-800/30">
                  <p className="text-sm text-gray-400">Logged in as</p>
                  <p className="font-medium text-white">{user.handle}</p>
                  <p className="text-sm text-gray-400">Rating: {user.rating}</p>
                </div>
              )}
              
              {/* Navigation Items */}
              <div className="flex-1 overflow-y-auto py-4">
                {/* Main Navigation */}
                <div className="px-2 mb-6">
                  <h3 className="px-3 mb-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Navigation
                  </h3>
                  {mainNavItems.map((item) => {
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setMobileMenuOpen(false)}
                        className="flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-gray-800 transition-colors"
                      >
                        <Icon className="h-5 w-5 text-gray-400" />
                        <span className="text-gray-200">{item.label}</span>
                      </Link>
                    );
                  })}
                </div>
                
                {/* User Navigation */}
                <div className="px-2">
                  <h3 className="px-3 mb-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Account
                  </h3>
                  {userNavItems.map((item, index) => {
                    const Icon = item.icon;
                    if ('action' in item) {
                      return (
                        <button
                          key={index}
                          onClick={() => {
                            item.action?.();
                            setMobileMenuOpen(false);
                          }}
                          className="flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-gray-800 transition-colors w-full text-left"
                        >
                          <Icon className="h-5 w-5 text-gray-400" />
                          <span className="text-gray-200">{item.label}</span>
                        </button>
                      );
                    }
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setMobileMenuOpen(false)}
                        className="flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-gray-800 transition-colors"
                      >
                        <Icon className="h-5 w-5 text-gray-400" />
                        <span className="text-gray-200">{item.label}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );

  return (
    <>
      <DesktopNav />
      <MobileTopBar />
      <MobileBottomNav />
      <MobileDrawer />
      
      {/* Spacer for fixed mobile navigation */}
      {(isMobile || isTablet) && (
        <>
          <div className="h-16 lg:hidden" /> {/* Top spacer */}
          <div className="h-16 lg:hidden" /> {/* Bottom spacer */}
        </>
      )}
    </>
  );
}