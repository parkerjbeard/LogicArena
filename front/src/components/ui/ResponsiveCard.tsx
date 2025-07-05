'use client';

import React, { forwardRef } from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';
import { useBreakpoint } from '@/hooks/useResponsive';
import { useInput } from '@/contexts/InputContext';

interface ResponsiveCardProps extends HTMLMotionProps<"div"> {
  variant?: 'default' | 'elevated' | 'outlined' | 'interactive';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  fullHeight?: boolean;
}

export const ResponsiveCard = forwardRef<HTMLDivElement, ResponsiveCardProps>(
  ({ 
    children, 
    variant = 'default', 
    padding = 'md',
    fullHeight = false,
    className = '', 
    ...props 
  }, ref) => {
    const { inputMethod } = useInput();
    const { isMobile } = useBreakpoint();

    const variantStyles = {
      default: 'bg-gray-800/30 backdrop-blur-sm border border-gray-700/50',
      elevated: 'bg-gray-800/50 backdrop-blur-sm shadow-xl border border-gray-700/30',
      outlined: 'bg-transparent border-2 border-gray-700',
      interactive: `
        bg-gray-800/30 backdrop-blur-sm border border-gray-700/50
        ${inputMethod === 'touch' 
          ? 'active:scale-[0.98] active:bg-gray-700/30' 
          : 'hover:bg-gray-700/30 hover:border-gray-600/50 hover:shadow-lg'
        }
        transition-all duration-200 cursor-pointer
      `,
    };

    const paddingStyles = {
      none: '',
      sm: isMobile ? 'p-3' : 'p-2',
      md: isMobile ? 'p-4' : 'p-3',
      lg: isMobile ? 'p-6' : 'p-4',
    };

    const animation = variant === 'interactive' ? {
      whileHover: inputMethod === 'mouse' ? { scale: 1.02 } : undefined,
      whileTap: { scale: 0.98 },
    } : {};

    return (
      <motion.div
        ref={ref}
        className={`
          rounded-lg
          ${variantStyles[variant]}
          ${paddingStyles[padding]}
          ${fullHeight ? 'h-full' : ''}
          ${className}
        `}
        {...animation}
        {...props}
      >
        {children}
      </motion.div>
    );
  }
);

ResponsiveCard.displayName = 'ResponsiveCard';

// Card Header Component
interface CardHeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  className?: string;
}

export const CardHeader: React.FC<CardHeaderProps> = ({ 
  title, 
  subtitle, 
  action,
  className = '' 
}) => {
  const { isMobile } = useBreakpoint();
  
  return (
    <div className={`flex items-start justify-between ${className}`}>
      <div className="flex-1">
        <h3 className={`font-semibold ${isMobile ? 'text-lg' : 'text-base'} text-white`}>
          {title}
        </h3>
        {subtitle && (
          <p className={`mt-1 ${isMobile ? 'text-sm' : 'text-xs'} text-gray-400`}>
            {subtitle}
          </p>
        )}
      </div>
      {action && (
        <div className="ml-4 flex-shrink-0">
          {action}
        </div>
      )}
    </div>
  );
};

// Card Content Component
interface CardContentProps {
  children: React.ReactNode;
  className?: string;
}

export const CardContent: React.FC<CardContentProps> = ({ children, className = '' }) => {
  const { isMobile } = useBreakpoint();
  
  return (
    <div className={`${isMobile ? 'mt-4' : 'mt-3'} ${className}`}>
      {children}
    </div>
  );
};

// Card Footer Component
interface CardFooterProps {
  children: React.ReactNode;
  divider?: boolean;
  className?: string;
}

export const CardFooter: React.FC<CardFooterProps> = ({ 
  children, 
  divider = true,
  className = '' 
}) => {
  const { isMobile } = useBreakpoint();
  
  return (
    <div className={`
      ${isMobile ? 'mt-6 pt-4' : 'mt-4 pt-3'}
      ${divider ? 'border-t border-gray-700/50' : ''}
      ${className}
    `}>
      {children}
    </div>
  );
};