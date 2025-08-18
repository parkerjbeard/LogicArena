'use client';

import Link from 'next/link';
import { useState, useEffect, useRef } from 'react';
import { useBreakpoint, useSwipeGesture } from '@/hooks/useResponsive';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Menu, 
  X, 
  Home, 
  Puzzle, 
  Trophy,
  BookOpen,
  User,
  LogOut
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import ThemeToggle from '@/components/ThemeToggle';

export default function ResponsiveNavigation() {
  const { isMobile, isTablet } = useBreakpoint();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const drawerRef = useRef<HTMLDivElement>(null);
  const { user, username, isAuthenticated, signOut } = useAuth();

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
    { href: '/', icon: Home, label: 'Home' },
    { href: '/practice', icon: Puzzle, label: 'Practice' },
    { href: '/tutorial', icon: BookOpen, label: 'Tutorials' },
    { href: '/leaderboard', icon: Trophy, label: 'Rankings' },
  ];

  // Desktop Navigation
  const DesktopNav = () => (
    <nav className="w-full hidden lg:block">
      <div className="z-10 w-full max-w-5xl mx-auto items-center justify-between font-mono text-sm flex px-4">
        <div className="flex items-center justify-between w-full py-6">
          <Link href="/" className="flex items-center">
            <h1 className="text-2xl font-bold">LogicArena-α</h1>
          </Link>
          
          <div className="flex items-center gap-3">
            {mainNavItems.slice(1).map((item) => (
              <Link 
                key={item.href}
                href={item.href}
                className="px-3 py-1.5 text-sm font-medium rounded-md border border-default surface hover:opacity-90 transition-all dark:text-gray-200 text-gray-700"
              >
                {item.label}
              </Link>
            ))}
            <ThemeToggle />
            
            {isAuthenticated ? (
              <>
                <Link 
                  href="/profile"
                  className="px-3 py-1.5 text-sm font-medium rounded-md border border-default surface hover:opacity-90 transition-all dark:text-gray-200 text-gray-700"
                >
                  {username || 'Profile'}
                </Link>
                <button
                  onClick={() => signOut()}
                  className="px-3 py-1.5 text-sm font-medium rounded-md border border-default surface hover:opacity-90 transition-all dark:text-gray-200 text-gray-700"
                >
                  Logout
                </button>
              </>
            ) : (
              <Link 
                href="/login"
                className="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-all"
              >
                Login
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );

  // Mobile Top Bar
  const MobileTopBar = () => (
    <div className="lg:hidden fixed top-0 left-0 right-0 z-40 surface border-b border-default">
      <div className="flex items-center justify-between px-4 py-3">
        <Link href="/" className="flex items-center">
          <h1 className="text-xl font-bold">LogicArena-α</h1>
        </Link>
        <button
          onClick={() => setMobileMenuOpen(true)}
          className="p-2 rounded-lg border border-default surface"
          aria-label="Open menu"
        >
          <Menu className="h-6 w-6" />
        </button>
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
            onClick={() => setMobileMenuOpen(false)}
            className="lg:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
          />
          
          {/* Drawer */}
          <motion.div
            ref={drawerRef}
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="lg:hidden fixed right-0 top-0 h-full w-80 surface border-l border-default z-50 overflow-y-auto"
          >
            <div className="sticky top-0 surface border-b border-default p-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Menu</h2>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-2 rounded-lg border border-default surface"
                aria-label="Close menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <nav className="p-4">
              <div className="space-y-1">
                {mainNavItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-3 px-4 py-3 rounded-lg transition-colors border border-transparent hover:border-default hover:surface"
                  >
                    <item.icon className="h-5 w-5" />
                    <span>{item.label}</span>
                  </Link>
                ))}
              </div>
              
              <div className="mt-6 pt-6 border-t border-default">
                <div className="mb-4">
                  <ThemeToggle />
                </div>
                {isAuthenticated ? (
                  <>
                    <Link
                      href="/profile"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center gap-3 px-4 py-3 rounded-lg transition-colors border border-transparent hover:border-default hover:surface"
                    >
                      <User className="h-5 w-5" />
                      <span>{username || 'Profile'}</span>
                    </Link>
                    <button
                      onClick={() => {
                        setMobileMenuOpen(false);
                        signOut();
                      }}
                      className="w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors border border-transparent hover:border-default hover:surface"
                    >
                      <LogOut className="h-5 w-5" />
                      <span>Logout</span>
                    </button>
                  </>
                ) : (
                  <Link
                    href="/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-3 px-4 py-3 rounded-lg text-white bg-blue-600 hover:bg-blue-700 transition-colors mx-4"
                  >
                    <User className="h-5 w-5" />
                    <span>Login</span>
                  </Link>
                )}
              </div>
            </nav>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );

  // Mobile Bottom Tab Bar
  const MobileTabBar = () => (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 z-30 surface border-t border-default pb-safe-bottom">
      <nav className="flex items-center justify-around">
        {mainNavItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex flex-col items-center gap-1 py-2 px-3 text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white transition-colors"
          >
            <item.icon className="h-6 w-6" />
            <span className="text-xs">{item.label}</span>
          </Link>
        ))}
      </nav>
    </div>
  );

  return (
    <>
      <DesktopNav />
      <MobileTopBar />
      <MobileDrawer />
      <MobileTabBar />
      {/* Spacer for mobile top bar */}
      <div className="lg:hidden h-14" />
    </>
  );
}