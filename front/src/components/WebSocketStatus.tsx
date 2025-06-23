'use client';

import React from 'react';
import { ConnectionState } from '../lib/websocket';
import { motion, AnimatePresence } from 'framer-motion';

interface WebSocketStatusProps {
  connectionState: ConnectionState;
  reconnectAttempt?: number;
  maxReconnectAttempts?: number;
  onReconnect?: () => void;
}

export function WebSocketStatus({ 
  connectionState, 
  reconnectAttempt = 0, 
  maxReconnectAttempts = 10,
  onReconnect 
}: WebSocketStatusProps) {
  // Only show status for non-connected states
  if (connectionState === ConnectionState.CONNECTED) {
    return null;
  }

  const getStatusMessage = () => {
    switch (connectionState) {
      case ConnectionState.DISCONNECTED:
        return 'Disconnected from server';
      case ConnectionState.CONNECTING:
        return 'Connecting to server...';
      case ConnectionState.RECONNECTING:
        return `Reconnecting... (${reconnectAttempt}/${maxReconnectAttempts})`;
      case ConnectionState.FAILED:
        return 'Connection failed';
      default:
        return '';
    }
  };

  const getStatusColor = () => {
    switch (connectionState) {
      case ConnectionState.DISCONNECTED:
      case ConnectionState.FAILED:
        return 'border-red-600/30 bg-red-900/20 text-red-400';
      case ConnectionState.CONNECTING:
      case ConnectionState.RECONNECTING:
        return 'border-yellow-600/30 bg-yellow-900/20 text-yellow-400';
      default:
        return 'border-gray-600/30 bg-gray-900/20 text-gray-400';
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="fixed top-4 right-4 z-50"
      >
        <div className={`backdrop-blur-sm border rounded-lg p-4 ${getStatusColor()}`}>
          <div className="flex items-center gap-3">
            <div className="relative">
              {(connectionState === ConnectionState.CONNECTING || 
                connectionState === ConnectionState.RECONNECTING) && (
                <div className="absolute inset-0 animate-ping rounded-full bg-yellow-400 opacity-75" />
              )}
              <div className={`w-3 h-3 rounded-full ${
                connectionState === ConnectionState.FAILED || 
                connectionState === ConnectionState.DISCONNECTED
                  ? 'bg-red-400'
                  : 'bg-yellow-400'
              }`} />
            </div>
            
            <div className="flex flex-col">
              <p className="text-sm font-medium">{getStatusMessage()}</p>
              {connectionState === ConnectionState.FAILED && onReconnect && (
                <button
                  onClick={onReconnect}
                  className="text-xs mt-1 text-blue-400 hover:text-blue-300 transition-colors"
                >
                  Try reconnecting
                </button>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}