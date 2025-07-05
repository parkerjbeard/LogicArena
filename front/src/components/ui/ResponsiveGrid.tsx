'use client';

import React from 'react';
import { useBreakpoint } from '@/hooks/useResponsive';

interface ResponsiveGridProps {
  children: React.ReactNode;
  cols?: {
    xs?: number;
    sm?: number;
    md?: number;
    lg?: number;
    xl?: number;
  };
  gap?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const ResponsiveGrid: React.FC<ResponsiveGridProps> = ({
  children,
  cols = { xs: 1, sm: 2, md: 2, lg: 3, xl: 4 },
  gap = 'md',
  className = '',
}) => {
  const { breakpoint } = useBreakpoint();

  const gapSizes = {
    sm: 'gap-2 sm:gap-3',
    md: 'gap-3 sm:gap-4 lg:gap-6',
    lg: 'gap-4 sm:gap-6 lg:gap-8',
  };

  const getGridCols = () => {
    const colClasses = [];
    
    if (cols.xs) colClasses.push(`grid-cols-${cols.xs}`);
    if (cols.sm) colClasses.push(`sm:grid-cols-${cols.sm}`);
    if (cols.md) colClasses.push(`md:grid-cols-${cols.md}`);
    if (cols.lg) colClasses.push(`lg:grid-cols-${cols.lg}`);
    if (cols.xl) colClasses.push(`xl:grid-cols-${cols.xl}`);
    
    return colClasses.join(' ');
  };

  return (
    <div className={`
      grid 
      ${getGridCols()}
      ${gapSizes[gap]}
      ${className}
    `}>
      {children}
    </div>
  );
};

// Responsive Stack Component
interface ResponsiveStackProps {
  children: React.ReactNode;
  direction?: 'vertical' | 'horizontal' | 'responsive';
  spacing?: 'sm' | 'md' | 'lg';
  align?: 'start' | 'center' | 'end' | 'stretch';
  className?: string;
}

export const ResponsiveStack: React.FC<ResponsiveStackProps> = ({
  children,
  direction = 'vertical',
  spacing = 'md',
  align = 'stretch',
  className = '',
}) => {
  const { isMobile } = useBreakpoint();

  const spacingStyles = {
    sm: {
      vertical: 'space-y-2',
      horizontal: 'space-x-2',
    },
    md: {
      vertical: 'space-y-4',
      horizontal: 'space-x-4',
    },
    lg: {
      vertical: 'space-y-6',
      horizontal: 'space-x-6',
    },
  };

  const alignStyles = {
    start: 'items-start',
    center: 'items-center',
    end: 'items-end',
    stretch: 'items-stretch',
  };

  const getDirection = () => {
    if (direction === 'responsive') {
      return isMobile ? 'flex-col' : 'flex-row';
    }
    return direction === 'horizontal' ? 'flex-row' : 'flex-col';
  };

  const getSpacing = () => {
    const dir = direction === 'responsive' 
      ? (isMobile ? 'vertical' : 'horizontal')
      : direction === 'horizontal' ? 'horizontal' : 'vertical';
    
    return spacingStyles[spacing][dir];
  };

  return (
    <div className={`
      flex 
      ${getDirection()}
      ${getSpacing()}
      ${alignStyles[align]}
      ${className}
    `}>
      {children}
    </div>
  );
};

// Responsive Container Component
interface ResponsiveContainerProps {
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
  padding?: boolean;
  className?: string;
}

export const ResponsiveContainer: React.FC<ResponsiveContainerProps> = ({
  children,
  maxWidth = 'lg',
  padding = true,
  className = '',
}) => {
  const { isMobile } = useBreakpoint();

  const maxWidthStyles = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    full: 'max-w-full',
  };

  const paddingStyles = padding
    ? isMobile 
      ? 'px-4 py-6' 
      : 'px-6 py-8 lg:px-8 lg:py-12'
    : '';

  return (
    <div className={`
      w-full mx-auto
      ${maxWidthStyles[maxWidth]}
      ${paddingStyles}
      ${className}
    `}>
      {children}
    </div>
  );
};

// Responsive Divider Component
interface ResponsiveDividerProps {
  orientation?: 'horizontal' | 'vertical';
  className?: string;
}

export const ResponsiveDivider: React.FC<ResponsiveDividerProps> = ({
  orientation = 'horizontal',
  className = '',
}) => {
  const baseStyles = 'bg-gray-700/50';
  
  const orientationStyles = orientation === 'horizontal'
    ? 'w-full h-px'
    : 'h-full w-px';

  return (
    <div className={`
      ${baseStyles}
      ${orientationStyles}
      ${className}
    `} />
  );
};

// Responsive Spacer Component
interface ResponsiveSpacerProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
}

export const ResponsiveSpacer: React.FC<ResponsiveSpacerProps> = ({ size = 'md' }) => {
  const { isMobile } = useBreakpoint();

  const sizes = {
    xs: isMobile ? 'h-2' : 'h-1',
    sm: isMobile ? 'h-4' : 'h-2',
    md: isMobile ? 'h-6' : 'h-4',
    lg: isMobile ? 'h-8' : 'h-6',
    xl: isMobile ? 'h-12' : 'h-8',
  };

  return <div className={sizes[size]} />;
};