'use client';

import React, { useEffect } from 'react';
import { useDuelWebSocket, ConnectionState } from '../lib/websocket';
import { WebSocketStatus } from './WebSocketStatus';
import { useWebSocketWithRecovery } from '../hooks/useWebSocketWithRecovery';
import { useNetworkStatus } from '../hooks/useNetworkStatus';

interface ExampleWebSocketUsageProps {
  gameId: number;
  userId: number;
}

export function ExampleWebSocketUsage({ gameId, userId }: ExampleWebSocketUsageProps) {
  const {
    isConnected,
    connectionState,
    messages,
    connectionError,
    sendMessage,
    submitProof,
    reconnect,
    messageQueueSize
  } = useDuelWebSocket(gameId, userId, {
    maxAttempts: 15,
    initialDelay: 500,
    maxDelay: 60000,
    backoffMultiplier: 2
  });

  const { isOnline, isSlowConnection } = useNetworkStatus();

  // Handle recovery after page refresh or network issues
  const { saveUnsentMessages } = useWebSocketWithRecovery(
    connectionState,
    gameId,
    (recoveryData) => {
      console.log('Recovering from previous session:', recoveryData);
      // Re-send any unsent messages
      recoveryData.unsentMessages.forEach(msg => sendMessage(msg));
    }
  );

  // React to network status changes
  useEffect(() => {
    if (isOnline && connectionState === ConnectionState.FAILED) {
      console.log('Network is back online, attempting to reconnect...');
      reconnect();
    }
  }, [isOnline, connectionState, reconnect]);

  // Display warnings for slow connections
  useEffect(() => {
    if (isSlowConnection && isConnected) {
      console.warn('Slow network connection detected. Messages may be delayed.');
    }
  }, [isSlowConnection, isConnected]);

  // Handle connection errors
  useEffect(() => {
    if (connectionError) {
      console.error('WebSocket error:', connectionError);
      // You could show a toast notification here
    }
  }, [connectionError]);

  return (
    <div className="space-y-4">
      {/* Connection status indicator */}
      <WebSocketStatus
        connectionState={connectionState}
        onReconnect={reconnect}
      />

      {/* Network status warning */}
      {!isOnline && (
        <div className="bg-red-900/20 backdrop-blur-sm border border-red-600/30 rounded-lg p-4">
          <p className="text-sm text-red-400">
            You are currently offline. Messages will be queued and sent when connection is restored.
          </p>
        </div>
      )}

      {/* Slow connection warning */}
      {isSlowConnection && isOnline && (
        <div className="bg-yellow-900/20 backdrop-blur-sm border border-yellow-600/30 rounded-lg p-4">
          <p className="text-sm text-yellow-400">
            Slow network connection detected. Some features may be delayed.
          </p>
        </div>
      )}

      {/* Message queue indicator */}
      {messageQueueSize > 0 && (
        <div className="bg-blue-900/20 backdrop-blur-sm border border-blue-600/30 rounded-lg p-4">
          <p className="text-sm text-blue-400">
            {messageQueueSize} message{messageQueueSize > 1 ? 's' : ''} waiting to be sent...
          </p>
        </div>
      )}

      {/* Connection details for debugging */}
      <div className="bg-gray-800/30 backdrop-blur-sm border border-gray-700/50 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-gray-300 mb-2">Connection Details</h3>
        <div className="space-y-1 text-xs text-gray-400">
          <p>State: {connectionState}</p>
          <p>Network: {isOnline ? 'Online' : 'Offline'}</p>
          <p>Messages received: {messages.length}</p>
          <p>Queue size: {messageQueueSize}</p>
          {connectionError && <p className="text-red-400">Error: {connectionError}</p>}
        </div>
      </div>

      {/* Example of sending a message with error handling */}
      <button
        onClick={() => {
          try {
            sendMessage({
              type: 'test_message',
              data: { content: 'Hello from client!' }
            });
          } catch (error) {
            console.error('Failed to send message:', error);
          }
        }}
        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        disabled={!isOnline}
      >
        Send Test Message
      </button>
    </div>
  );
}