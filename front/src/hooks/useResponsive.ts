'use client';

import { useEffect, useState, useCallback, RefObject } from 'react';
import { useInput } from '@/contexts/InputContext';

// Hook for responsive breakpoints
export const useBreakpoint = () => {
  const [breakpoint, setBreakpoint] = useState<'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl'>('lg');

  useEffect(() => {
    const checkBreakpoint = () => {
      const width = window.innerWidth;
      if (width < 475) setBreakpoint('xs');
      else if (width < 640) setBreakpoint('sm');
      else if (width < 768) setBreakpoint('md');
      else if (width < 1024) setBreakpoint('lg');
      else if (width < 1280) setBreakpoint('xl');
      else setBreakpoint('2xl');
    };

    checkBreakpoint();
    window.addEventListener('resize', checkBreakpoint);
    return () => window.removeEventListener('resize', checkBreakpoint);
  }, []);

  return {
    breakpoint,
    isMobile: breakpoint === 'xs' || breakpoint === 'sm',
    isTablet: breakpoint === 'md',
    isDesktop: breakpoint === 'lg' || breakpoint === 'xl' || breakpoint === '2xl',
  };
};

// Hook for adaptive click/touch handling
export const useAdaptiveClick = <T extends HTMLElement = HTMLElement>(
  onClick?: (e: React.MouseEvent<T> | React.TouchEvent<T>) => void,
  onLongPress?: () => void,
  delay = 500
) => {
  const { inputMethod } = useInput();
  const [isPressed, setIsPressed] = useState(false);
  const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(null);

  const handleStart = useCallback((e: React.TouchEvent<T> | React.MouseEvent<T>) => {
    setIsPressed(true);
    
    if (onLongPress && inputMethod !== 'mouse') {
      const timer = setTimeout(() => {
        onLongPress();
        setIsPressed(false);
      }, delay);
      setLongPressTimer(timer);
    }
  }, [inputMethod, onLongPress, delay]);

  const handleEnd = useCallback((e: React.TouchEvent<T> | React.MouseEvent<T>) => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
    
    if (isPressed && onClick) {
      onClick(e);
    }
    
    setIsPressed(false);
  }, [isPressed, onClick, longPressTimer]);

  const handleCancel = useCallback(() => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
    setIsPressed(false);
  }, [longPressTimer]);

  return {
    onMouseDown: inputMethod !== 'touch' ? handleStart : undefined,
    onMouseUp: inputMethod !== 'touch' ? handleEnd : undefined,
    onMouseLeave: inputMethod !== 'touch' ? handleCancel : undefined,
    onTouchStart: handleStart,
    onTouchEnd: handleEnd,
    onTouchCancel: handleCancel,
    isPressed,
  };
};

// Hook for swipe gestures
export const useSwipeGesture = (
  ref: RefObject<HTMLElement>,
  options: {
    onSwipeLeft?: () => void;
    onSwipeRight?: () => void;
    onSwipeUp?: () => void;
    onSwipeDown?: () => void;
    threshold?: number;
  }
) => {
  const { threshold = 50 } = options;
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const handleTouchStart = (e: TouchEvent) => {
      setTouchStart({
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
      });
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (!touchStart) return;

      const touchEnd = {
        x: e.changedTouches[0].clientX,
        y: e.changedTouches[0].clientY,
      };

      const dx = touchEnd.x - touchStart.x;
      const dy = touchEnd.y - touchStart.y;
      const absDx = Math.abs(dx);
      const absDy = Math.abs(dy);

      if (Math.max(absDx, absDy) > threshold) {
        if (absDx > absDy) {
          // Horizontal swipe
          if (dx > 0 && options.onSwipeRight) {
            options.onSwipeRight();
          } else if (dx < 0 && options.onSwipeLeft) {
            options.onSwipeLeft();
          }
        } else {
          // Vertical swipe
          if (dy > 0 && options.onSwipeDown) {
            options.onSwipeDown();
          } else if (dy < 0 && options.onSwipeUp) {
            options.onSwipeUp();
          }
        }
      }

      setTouchStart(null);
    };

    element.addEventListener('touchstart', handleTouchStart, { passive: true });
    element.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchend', handleTouchEnd);
    };
  }, [ref, touchStart, threshold, options]);
};

// Hook for viewport safe areas
export const useSafeArea = () => {
  const [safeAreaInsets, setSafeAreaInsets] = useState({
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  });

  useEffect(() => {
    const computeSafeAreaInsets = () => {
      const computedStyle = getComputedStyle(document.documentElement);
      setSafeAreaInsets({
        top: parseInt(computedStyle.getPropertyValue('--sat') || '0', 10),
        right: parseInt(computedStyle.getPropertyValue('--sar') || '0', 10),
        bottom: parseInt(computedStyle.getPropertyValue('--sab') || '0', 10),
        left: parseInt(computedStyle.getPropertyValue('--sal') || '0', 10),
      });
    };

    // Set CSS variables for safe areas
    const style = document.createElement('style');
    style.textContent = `
      :root {
        --sat: env(safe-area-inset-top);
        --sar: env(safe-area-inset-right);
        --sab: env(safe-area-inset-bottom);
        --sal: env(safe-area-inset-left);
      }
    `;
    document.head.appendChild(style);

    computeSafeAreaInsets();
    window.addEventListener('resize', computeSafeAreaInsets);

    return () => {
      window.removeEventListener('resize', computeSafeAreaInsets);
      document.head.removeChild(style);
    };
  }, []);

  return safeAreaInsets;
};

// Hook for adaptive styling based on input method
export const useAdaptiveStyles = (baseClass: string, variants: {
  touch?: string;
  mouse?: string;
  hybrid?: string;
  mobile?: string;
  tablet?: string;
  desktop?: string;
}) => {
  const { inputMethod, deviceType } = useInput();
  
  const classes = [baseClass];
  
  if (variants[inputMethod]) {
    classes.push(variants[inputMethod]!);
  }
  
  if (variants[deviceType]) {
    classes.push(variants[deviceType]!);
  }
  
  return classes.join(' ');
};