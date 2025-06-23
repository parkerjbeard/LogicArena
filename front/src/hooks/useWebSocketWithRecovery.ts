'use client';

import { useEffect, useRef } from 'react';
import { ConnectionState } from '../lib/websocket';

interface RecoveryData {
  lastConnectionTime: number;
  lastGameId?: number;
  unsentMessages: any[];
}

const RECOVERY_STORAGE_KEY = 'websocket_recovery';
const RECOVERY_TIMEOUT = 5 * 60 * 1000; // 5 minutes

export function useWebSocketWithRecovery(
  connectionState: ConnectionState,
  gameId?: number,
  onRecover?: (data: RecoveryData) => void
) {
  const hasRecoveredRef = useRef(false);

  useEffect(() => {
    // Save connection state when connected
    if (connectionState === ConnectionState.CONNECTED && gameId) {
      const recoveryData: RecoveryData = {
        lastConnectionTime: Date.now(),
        lastGameId: gameId,
        unsentMessages: []
      };
      localStorage.setItem(RECOVERY_STORAGE_KEY, JSON.stringify(recoveryData));
    }
  }, [connectionState, gameId]);

  useEffect(() => {
    // Check for recovery data on mount
    if (!hasRecoveredRef.current && onRecover) {
      try {
        const savedData = localStorage.getItem(RECOVERY_STORAGE_KEY);
        if (savedData) {
          const recoveryData: RecoveryData = JSON.parse(savedData);
          
          // Check if recovery data is still valid
          const timeSinceLastConnection = Date.now() - recoveryData.lastConnectionTime;
          if (timeSinceLastConnection < RECOVERY_TIMEOUT) {
            onRecover(recoveryData);
          }
          
          // Clear recovery data after use
          localStorage.removeItem(RECOVERY_STORAGE_KEY);
        }
      } catch (error) {
        console.error('Failed to recover WebSocket state:', error);
      }
      
      hasRecoveredRef.current = true;
    }
  }, [onRecover]);

  // Function to save unsent messages for recovery
  const saveUnsentMessages = (messages: any[]) => {
    try {
      const savedData = localStorage.getItem(RECOVERY_STORAGE_KEY);
      if (savedData) {
        const recoveryData: RecoveryData = JSON.parse(savedData);
        recoveryData.unsentMessages = messages;
        localStorage.setItem(RECOVERY_STORAGE_KEY, JSON.stringify(recoveryData));
      }
    } catch (error) {
      console.error('Failed to save unsent messages:', error);
    }
  };

  return { saveUnsentMessages };
}