'use client';

import React, { useEffect, useRef, ReactNode } from 'react';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { useBreakpoint, useSwipeGesture } from '@/hooks/useResponsive';
import { useInput } from '@/contexts/InputContext';

interface ResponsiveModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  showCloseButton?: boolean;
  closeOnBackdrop?: boolean;
  className?: string;
}

export const ResponsiveModal: React.FC<ResponsiveModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
  showCloseButton = true,
  closeOnBackdrop = true,
  className = '',
}) => {
  const { deviceType, inputMethod } = useInput();
  const { isMobile, isTablet } = useBreakpoint();
  const modalRef = useRef<HTMLDivElement>(null);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Add swipe down to close on mobile
  useSwipeGesture(modalRef, {
    onSwipeDown: () => {
      if (isMobile || isTablet) {
        onClose();
      }
    },
    threshold: 100,
  });

  // Handle ESC key
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    full: 'max-w-full',
  };

  const mobileAnimation = {
    initial: { y: '100%', opacity: 0 },
    animate: { y: 0, opacity: 1 },
    exit: { y: '100%', opacity: 0 },
    transition: { type: 'spring', damping: 30, stiffness: 300 },
  };

  const desktopAnimation = {
    initial: { scale: 0.95, opacity: 0 },
    animate: { scale: 1, opacity: 1 },
    exit: { scale: 0.95, opacity: 0 },
    transition: { duration: 0.2 },
  };

  const animation = isMobile || isTablet ? mobileAnimation : desktopAnimation;

  const handleDrag = (event: any, info: PanInfo) => {
    // Only allow dragging down on mobile
    if ((isMobile || isTablet) && info.offset.y > 100 && info.velocity.y > 0) {
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm"
            onClick={closeOnBackdrop ? onClose : undefined}
          />

          {/* Modal */}
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
            <motion.div
              ref={modalRef}
              {...animation}
              drag={isMobile || isTablet ? 'y' : false}
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={{ top: 0, bottom: 0.3 }}
              onDragEnd={handleDrag}
              className={`
                relative w-full
                ${isMobile || isTablet ? 'min-h-[50vh] max-h-[90vh]' : 'max-h-[85vh]'}
                ${isMobile || isTablet ? '' : sizeClasses[size]}
                bg-gray-900 
                ${isMobile || isTablet ? 'rounded-t-2xl' : 'rounded-2xl'}
                shadow-2xl overflow-hidden flex flex-col
                ${className}
              `}
            >
              {/* Drag indicator for mobile */}
              {(isMobile || isTablet) && (
                <div className="absolute top-2 left-1/2 -translate-x-1/2 w-12 h-1 bg-gray-600 rounded-full" />
              )}

              {/* Header */}
              {(title || showCloseButton) && (
                <div className={`
                  flex items-center justify-between 
                  ${isMobile ? 'p-4 pt-6' : 'p-6'} 
                  border-b border-gray-800
                `}>
                  {title && (
                    <h2 className={`${isMobile ? 'text-xl' : 'text-2xl'} font-bold text-white`}>
                      {title}
                    </h2>
                  )}
                  {showCloseButton && (
                    <button
                      onClick={onClose}
                      className={`
                        ${title ? 'ml-auto' : ''}
                        p-2 text-gray-400 hover:text-white 
                        hover:bg-gray-800 rounded-lg transition-colors
                      `}
                      aria-label="Close modal"
                    >
                      <XMarkIcon className={`${isMobile ? 'w-6 h-6' : 'w-5 h-5'}`} />
                    </button>
                  )}
                </div>
              )}

              {/* Content */}
              <div className={`
                flex-1 overflow-y-auto 
                ${isMobile ? 'p-4' : 'p-6'}
                ${isMobile || isTablet ? 'safe-bottom' : ''}
              `}>
                {children}
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
};

// Sheet variant for mobile-first design
export const ResponsiveSheet: React.FC<ResponsiveModalProps & {
  side?: 'left' | 'right' | 'top' | 'bottom';
}> = ({
  isOpen,
  onClose,
  title,
  children,
  side = 'bottom',
  showCloseButton = true,
  closeOnBackdrop = true,
  className = '',
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const { isMobile } = useBreakpoint();

  // Prevent body scroll
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const animations = {
    left: {
      initial: { x: '-100%' },
      animate: { x: 0 },
      exit: { x: '-100%' },
    },
    right: {
      initial: { x: '100%' },
      animate: { x: 0 },
      exit: { x: '100%' },
    },
    top: {
      initial: { y: '-100%' },
      animate: { y: 0 },
      exit: { y: '-100%' },
    },
    bottom: {
      initial: { y: '100%' },
      animate: { y: 0 },
      exit: { y: '100%' },
    },
  };

  const positionClasses = {
    left: 'left-0 top-0 bottom-0 w-80 max-w-[85vw]',
    right: 'right-0 top-0 bottom-0 w-80 max-w-[85vw]',
    top: 'top-0 left-0 right-0 h-80 max-h-[85vh]',
    bottom: 'bottom-0 left-0 right-0 h-auto max-h-[85vh]',
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
            onClick={closeOnBackdrop ? onClose : undefined}
          />

          {/* Sheet */}
          <motion.div
            ref={modalRef}
            {...animations[side]}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className={`
              fixed z-50 bg-gray-900 shadow-2xl
              ${positionClasses[side]}
              ${side === 'left' || side === 'right' ? 'safe-top safe-bottom' : ''}
              ${side === 'top' || side === 'bottom' ? 'safe-left safe-right' : ''}
              ${className}
            `}
          >
            {/* Header */}
            {(title || showCloseButton) && (
              <div className={`
                flex items-center justify-between 
                p-4 border-b border-gray-800
              `}>
                {title && <h3 className="text-lg font-semibold">{title}</h3>}
                {showCloseButton && (
                  <button
                    onClick={onClose}
                    className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
                  >
                    <XMarkIcon className="w-5 h-5" />
                  </button>
                )}
              </div>
            )}

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4">
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};