'use client';

import React, { forwardRef, InputHTMLAttributes, TextareaHTMLAttributes, SelectHTMLAttributes } from 'react';
import { useBreakpoint } from '@/hooks/useResponsive';
import { useInput } from '@/contexts/InputContext';
import { motion } from 'framer-motion';

// Responsive Input Component
interface ResponsiveInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  icon?: React.ReactNode;
}

export const ResponsiveInput = forwardRef<HTMLInputElement, ResponsiveInputProps>(
  ({ label, error, hint, icon, className = '', ...props }, ref) => {
    const { inputMethod } = useInput();
    const { isMobile } = useBreakpoint();
    
    const inputClasses = `
      w-full font-sans
      bg-gray-800/50 border rounded-lg
      text-gray-200 placeholder-gray-500
      transition-all duration-200
      focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
      ${error ? 'border-red-600/50' : 'border-gray-700'}
      ${isMobile || inputMethod === 'touch' 
        ? 'px-4 py-3 text-base min-h-[48px]' 
        : 'px-3 py-2 text-sm'
      }
      ${icon ? (isMobile ? 'pl-12' : 'pl-10') : ''}
      ${className}
    `;

    return (
      <div className="space-y-1">
        {label && (
          <label className={`block font-medium ${isMobile ? 'text-base' : 'text-sm'} text-gray-300`}>
            {label}
          </label>
        )}
        <div className="relative">
          {icon && (
            <div className={`absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 ${isMobile ? 'w-6 h-6' : 'w-5 h-5'}`}>
              {icon}
            </div>
          )}
          <input
            ref={ref}
            className={inputClasses}
            {...props}
          />
        </div>
        {error && (
          <motion.p
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            className={`${isMobile ? 'text-sm' : 'text-xs'} text-red-400`}
          >
            {error}
          </motion.p>
        )}
        {hint && !error && (
          <p className={`${isMobile ? 'text-sm' : 'text-xs'} text-gray-500`}>
            {hint}
          </p>
        )}
      </div>
    );
  }
);

ResponsiveInput.displayName = 'ResponsiveInput';

// Responsive Textarea Component
interface ResponsiveTextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const ResponsiveTextarea = forwardRef<HTMLTextAreaElement, ResponsiveTextareaProps>(
  ({ label, error, hint, className = '', ...props }, ref) => {
    const { inputMethod } = useInput();
    const { isMobile } = useBreakpoint();
    
    const textareaClasses = `
      w-full font-sans resize-y
      bg-gray-800/50 border rounded-lg
      text-gray-200 placeholder-gray-500
      transition-all duration-200
      focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
      ${error ? 'border-red-600/50' : 'border-gray-700'}
      ${isMobile || inputMethod === 'touch' 
        ? 'px-4 py-3 text-base min-h-[100px]' 
        : 'px-3 py-2 text-sm min-h-[80px]'
      }
      ${className}
    `;

    return (
      <div className="space-y-1">
        {label && (
          <label className={`block font-medium ${isMobile ? 'text-base' : 'text-sm'} text-gray-300`}>
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          className={textareaClasses}
          {...props}
        />
        {error && (
          <motion.p
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            className={`${isMobile ? 'text-sm' : 'text-xs'} text-red-400`}
          >
            {error}
          </motion.p>
        )}
        {hint && !error && (
          <p className={`${isMobile ? 'text-sm' : 'text-xs'} text-gray-500`}>
            {hint}
          </p>
        )}
      </div>
    );
  }
);

ResponsiveTextarea.displayName = 'ResponsiveTextarea';

// Responsive Select Component
interface ResponsiveSelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  hint?: string;
  options: { value: string; label: string }[];
}

export const ResponsiveSelect = forwardRef<HTMLSelectElement, ResponsiveSelectProps>(
  ({ label, error, hint, options, className = '', ...props }, ref) => {
    const { inputMethod } = useInput();
    const { isMobile } = useBreakpoint();
    
    const selectClasses = `
      w-full font-sans appearance-none cursor-pointer
      bg-gray-800/50 border rounded-lg
      text-gray-200
      transition-all duration-200
      focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
      ${error ? 'border-red-600/50' : 'border-gray-700'}
      ${isMobile || inputMethod === 'touch' 
        ? 'px-4 py-3 pr-10 text-base min-h-[48px]' 
        : 'px-3 py-2 pr-8 text-sm'
      }
      ${className}
    `;

    return (
      <div className="space-y-1">
        {label && (
          <label className={`block font-medium ${isMobile ? 'text-base' : 'text-sm'} text-gray-300`}>
            {label}
          </label>
        )}
        <div className="relative">
          <select
            ref={ref}
            className={selectClasses}
            {...props}
          >
            {options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
            <svg className={`${isMobile ? 'w-5 h-5' : 'w-4 h-4'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
        {error && (
          <motion.p
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            className={`${isMobile ? 'text-sm' : 'text-xs'} text-red-400`}
          >
            {error}
          </motion.p>
        )}
        {hint && !error && (
          <p className={`${isMobile ? 'text-sm' : 'text-xs'} text-gray-500`}>
            {hint}
          </p>
        )}
      </div>
    );
  }
);

ResponsiveSelect.displayName = 'ResponsiveSelect';

// Responsive Checkbox Component
interface ResponsiveCheckboxProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

export const ResponsiveCheckbox = forwardRef<HTMLInputElement, ResponsiveCheckboxProps>(
  ({ label, error, className = '', ...props }, ref) => {
    const { inputMethod } = useInput();
    const { isMobile } = useBreakpoint();
    
    const checkboxSize = isMobile || inputMethod === 'touch' ? 'w-6 h-6' : 'w-4 h-4';
    
    return (
      <div className="space-y-1">
        <label className={`flex items-center gap-3 cursor-pointer ${isMobile ? 'py-2' : 'py-1'}`}>
          <input
            ref={ref}
            type="checkbox"
            className={`
              ${checkboxSize}
              text-blue-600 bg-gray-800/50 border-gray-700 rounded
              focus:ring-2 focus:ring-blue-500 focus:ring-offset-0
              focus:ring-offset-gray-900
              ${className}
            `}
            {...props}
          />
          <span className={`${isMobile ? 'text-base' : 'text-sm'} text-gray-300`}>
            {label}
          </span>
        </label>
        {error && (
          <motion.p
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            className={`${isMobile ? 'text-sm' : 'text-xs'} text-red-400 ml-9`}
          >
            {error}
          </motion.p>
        )}
      </div>
    );
  }
);

ResponsiveCheckbox.displayName = 'ResponsiveCheckbox';

// Form Field Group Component
interface FormFieldGroupProps {
  children: React.ReactNode;
  className?: string;
}

export const FormFieldGroup: React.FC<FormFieldGroupProps> = ({ children, className = '' }) => {
  const { isMobile } = useBreakpoint();
  
  return (
    <div className={`space-y-${isMobile ? '6' : '4'} ${className}`}>
      {children}
    </div>
  );
};

// Form Actions Component (for buttons)
interface FormActionsProps {
  children: React.ReactNode;
  align?: 'left' | 'right' | 'center' | 'between';
  className?: string;
}

export const FormActions: React.FC<FormActionsProps> = ({ 
  children, 
  align = 'right',
  className = '' 
}) => {
  const { isMobile } = useBreakpoint();
  
  const alignmentClasses = {
    left: 'justify-start',
    right: 'justify-end',
    center: 'justify-center',
    between: 'justify-between',
  };
  
  return (
    <div className={`
      flex ${isMobile ? 'flex-col' : 'flex-row'} 
      ${isMobile ? 'space-y-3' : `space-x-3 ${alignmentClasses[align]}`}
      ${className}
    `}>
      {children}
    </div>
  );
};