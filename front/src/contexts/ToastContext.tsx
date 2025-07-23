'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
}

interface ToastOptions {
  message: string;
  type?: ToastType;
  duration?: number;
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastType, duration?: number) => void;
  hideToast: () => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

const iconMap = {
  success: CheckCircle,
  error: AlertCircle,
  info: Info,
  warning: AlertTriangle,
};

const colorMap = {
  success: {
    bg: 'bg-green-900/20',
    border: 'border-green-600/30',
    text: 'text-green-400',
    icon: 'text-green-400',
  },
  error: {
    bg: 'bg-red-900/20',
    border: 'border-red-600/30',
    text: 'text-red-400',
    icon: 'text-red-400',
  },
  info: {
    bg: 'bg-blue-900/20',
    border: 'border-blue-600/30',
    text: 'text-blue-400',
    icon: 'text-blue-400',
  },
  warning: {
    bg: 'bg-yellow-900/20',
    border: 'border-yellow-600/30',
    text: 'text-yellow-400',
    icon: 'text-yellow-400',
  },
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: ToastType = 'info', duration: number = 5000) => {
    const id = Date.now().toString();
    const newToast: Toast = { id, message, type, duration };
    
    setToasts((prev) => [...prev, newToast]);

    if (duration > 0) {
      setTimeout(() => {
        setToasts((prev) => prev.filter((toast) => toast.id !== id));
      }, duration);
    }
  }, []);

  const hideToast = useCallback(() => {
    setToasts([]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast, hideToast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 space-y-2" role="region" aria-label="Notifications">
        <AnimatePresence>
          {toasts.map((toast) => {
            const Icon = iconMap[toast.type];
            const colors = colorMap[toast.type];
            
            return (
              <motion.div
                key={toast.id}
                initial={{ opacity: 0, x: 100 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 100 }}
                className={`${colors.bg} backdrop-blur-sm border ${colors.border} rounded-lg p-4 shadow-lg max-w-sm`}
                role="alert"
                aria-live="polite"
              >
                <div className="flex items-start gap-3">
                  <Icon className={`w-5 h-5 ${colors.icon} flex-shrink-0 mt-0.5`} aria-hidden="true" />
                  <p className={`text-sm ${colors.text} flex-1`}>{toast.message}</p>
                  <button
                    onClick={() => removeToast(toast.id)}
                    className="text-gray-400 hover:text-gray-300 transition-colors"
                    aria-label="Dismiss notification"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
};