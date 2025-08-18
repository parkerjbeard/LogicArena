'use client';

import React, { forwardRef } from 'react';
import { useAdaptiveClick, useAdaptiveStyles } from '@/hooks/useResponsive';
import { useInput } from '@/contexts/InputContext';
import { motion } from 'framer-motion';

interface ResponsiveButtonProps {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg' | 'auto';
  onLongPress?: () => void;
  fullWidth?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  onClick?: (e: React.MouseEvent<HTMLButtonElement> | React.TouchEvent<HTMLButtonElement>) => void;
  children?: React.ReactNode;
  className?: string;
  disabled?: boolean;
  type?: 'button' | 'submit' | 'reset';
  name?: string;
  value?: string | number | readonly string[];
  id?: string;
  'aria-label'?: string;
  'aria-describedby'?: string;
  style?: React.CSSProperties;
}

export const ResponsiveButton = forwardRef<HTMLButtonElement, ResponsiveButtonProps>(
  (
    {
      children,
      variant = 'primary',
      size = 'md',
      onLongPress,
      fullWidth = false,
      icon,
      iconPosition = 'left',
      className = '',
      disabled,
      onClick,
      type = 'button',
      name,
      value,
      id,
      'aria-label': ariaLabel,
      'aria-describedby': ariaDescribedBy,
      style
    },
    ref
  ) => {
    const { inputMethod, deviceType } = useInput();
    const clickHandlers = useAdaptiveClick<HTMLButtonElement>(onClick, onLongPress);

    // Base styles
    const baseStyles = `
      relative inline-flex items-center justify-center
      font-medium rounded-lg transition-all duration-200
      focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900
      disabled:opacity-50 disabled:cursor-not-allowed
      ${fullWidth ? 'w-full' : ''}
    `;

    // Size variants with adaptive sizing
    const sizeStyles = {
      sm: useAdaptiveStyles('text-sm', {
        touch: 'px-4 py-2.5 min-h-[40px]',
        mouse: 'px-3 py-1.5',
        mobile: 'px-4 py-2.5 min-h-[40px]',
        desktop: 'px-3 py-1.5',
      }),
      md: useAdaptiveStyles('text-base', {
        touch: 'px-5 py-3 min-h-[44px]',
        mouse: 'px-4 py-2',
        mobile: 'px-5 py-3 min-h-[44px]',
        desktop: 'px-4 py-2',
      }),
      lg: useAdaptiveStyles('text-lg', {
        touch: 'px-6 py-3.5 min-h-[48px]',
        mouse: 'px-6 py-3',
        mobile: 'px-6 py-3.5 min-h-[48px]',
        desktop: 'px-6 py-3',
      }),
      auto: 'px-4 py-2 sm:px-5 sm:py-2.5 md:px-6 md:py-3',
    };

    // Variant styles
    const variantStyles = {
      primary: `
        bg-blue-600 text-white
        hover:bg-blue-700 active:bg-blue-800
        focus:ring-blue-500
        ${inputMethod === 'touch' ? 'active:scale-[0.97]' : 'can-hover:hover:scale-[1.02]'}
      `,
      secondary: `
        surface border border-default text-gray-700 dark:text-gray-200
        hover:opacity-95 active:opacity-90
        focus:ring-gray-500
        ${inputMethod === 'touch' ? 'active:scale-[0.97]' : 'can-hover:hover:scale-[1.02]'}
      `,
      ghost: `
        text-gray-700 dark:text-gray-300 
        hover:opacity-90
        focus:ring-gray-500
      `,
      danger: `
        bg-red-600 text-white
        hover:bg-red-700 active:bg-red-800
        focus:ring-red-500
        ${inputMethod === 'touch' ? 'active:scale-[0.97]' : 'can-hover:hover:scale-[1.02]'}
      `,
    };

    // Touch feedback animation
    const touchAnimation = inputMethod === 'touch' ? {
      whileTap: { scale: 0.97 },
    } : {
      whileHover: { scale: 1.02 },
      whileTap: { scale: 0.98 },
    };

    const buttonContent = (
      <>
        {icon && iconPosition === 'left' && (
          <span className="mr-2 flex-shrink-0">{icon}</span>
        )}
        {children}
        {icon && iconPosition === 'right' && (
          <span className="ml-2 flex-shrink-0">{icon}</span>
        )}
      </>
    );

    // Add haptic feedback for supported devices
    const handleClick = (e: React.MouseEvent<HTMLButtonElement> | React.TouchEvent<HTMLButtonElement>) => {
      // Trigger haptic feedback on supported devices
      if ('vibrate' in navigator && inputMethod === 'touch') {
        navigator.vibrate(10);
      }
      
      if ('touches' in e) {
        clickHandlers.onTouchEnd?.(e as React.TouchEvent<HTMLButtonElement>);
      } else {
        clickHandlers.onMouseUp?.(e as React.MouseEvent<HTMLButtonElement>);
      }
    };

    return (
      <motion.button
        ref={ref}
        type={type}
        name={name}
        value={value}
        id={id}
        aria-label={ariaLabel}
        aria-describedby={ariaDescribedBy}
        style={style}
        className={`
          ${baseStyles}
          ${sizeStyles[size]}
          ${variantStyles[variant]}
          ${className}
        `}
        disabled={disabled}
        {...touchAnimation}
        {...clickHandlers}
        onClick={handleClick}
      >
        {clickHandlers.isPressed && onLongPress && (
          <motion.div
            className="absolute inset-0 bg-white/10 rounded-lg"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.5 }}
          />
        )}
        {buttonContent}
      </motion.button>
    );
  }
);

ResponsiveButton.displayName = 'ResponsiveButton';