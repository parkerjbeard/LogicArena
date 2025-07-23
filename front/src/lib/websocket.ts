'use client';

import { useEffect, useState, useRef, useCallback } from 'react';

// Connection states
export enum ConnectionState {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  RECONNECTING = 'reconnecting',
  FAILED = 'failed'
}

export interface DuelMessage {
  type: string;
  user_id?: number;
  game_id?: number;
  data?: any;
  timestamp?: number;
  // Game-specific fields
  round_winner?: number;
  game_winner?: number;
  player_a?: number;
  player_b?: number;
  submission?: any;
  time_left?: number;
  message?: string;
  error?: string;
  round_id?: number;
  player_a_rating_change?: number;
  player_b_rating_change?: number;
}

export interface NotificationMessage {
  type: string;
  user_id?: number;
  data?: any;
  timestamp?: number;
  // Notification-specific fields
  game_id?: number;
  opponent?: {
    id: number;
    handle: string;
  };
  old_rating?: number;
  new_rating?: number;
  change?: number;
}

// Configuration for reconnection logic
interface ReconnectionConfig {
  maxAttempts: number;
  initialDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
}

const defaultReconnectionConfig: ReconnectionConfig = {
  maxAttempts: 10,
  initialDelay: 1000, // 1 second
  maxDelay: 30000, // 30 seconds
  backoffMultiplier: 1.5
};

export function useDuelWebSocket(gameId: number, userId: number, config?: Partial<ReconnectionConfig>) {
  const reconnectConfig = { ...defaultReconnectionConfig, ...config };
  const [connectionState, setConnectionState] = useState<ConnectionState>(ConnectionState.DISCONNECTED);
  const [messages, setMessages] = useState<DuelMessage[]>([]);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttempts = useRef(0);
  const currentReconnectDelay = useRef(reconnectConfig.initialDelay);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const messageQueueRef = useRef<Array<Omit<DuelMessage, 'timestamp'>>>([]);
  const lastHeartbeatRef = useRef<number>(Date.now());
  const missedHeartbeatsRef = useRef(0);
  const intentionalDisconnect = useRef(false);
  
  // Derived state for backwards compatibility
  const isConnected = connectionState === ConnectionState.CONNECTED;

  const startHeartbeat = useCallback(() => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
    }
    
    lastHeartbeatRef.current = Date.now();
    missedHeartbeatsRef.current = 0;
    
    heartbeatIntervalRef.current = setInterval(() => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        const now = Date.now();
        
        // Check if we've missed too many heartbeats
        if (now - lastHeartbeatRef.current > 90000) { // 90 seconds = 3 missed heartbeats
          console.warn('Missed too many heartbeats, forcing reconnection');
          wsRef.current.close();
          return;
        }
        
        wsRef.current.send(JSON.stringify({
          type: 'ping',
          timestamp: now
        }));
        missedHeartbeatsRef.current++;
      }
    }, 30000); // Ping every 30 seconds
  }, []);

  const stopHeartbeat = useCallback(() => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }
  }, []);

  const flushMessageQueue = useCallback(() => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      while (messageQueueRef.current.length > 0) {
        const message = messageQueueRef.current.shift();
        if (message) {
          const messageWithTimestamp = {
            ...message,
            timestamp: Date.now()
          };
          wsRef.current.send(JSON.stringify(messageWithTimestamp));
        }
      }
    }
  }, []);

  const connect = useCallback(() => {
    if (!gameId || !userId) return;
    
    // Don't connect if we're already connecting or connected
    if (connectionState === ConnectionState.CONNECTING || connectionState === ConnectionState.CONNECTED) {
      return;
    }

    try {
      setConnectionState(reconnectAttempts.current > 0 ? ConnectionState.RECONNECTING : ConnectionState.CONNECTING);
      setConnectionError(null);

      const baseUrl = process.env.NEXT_PUBLIC_WS_URL || 
        (process.env.NEXT_PUBLIC_API_URL ? process.env.NEXT_PUBLIC_API_URL.replace(/^http/, 'ws') : 'ws://localhost:8000');
      const wsUrl = `${baseUrl}/ws/duel/${gameId}`;
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log('WebSocket connected for duel');
        setConnectionState(ConnectionState.CONNECTED);
        setConnectionError(null);
        reconnectAttempts.current = 0;
        currentReconnectDelay.current = reconnectConfig.initialDelay;
        startHeartbeat();
        
        // Flush any queued messages
        flushMessageQueue();
      };

      ws.onmessage = (event) => {
        try {
          const message: DuelMessage = JSON.parse(event.data);
          
          // Handle pong responses (don't add to messages)
          if (message.type === 'pong') {
            lastHeartbeatRef.current = Date.now();
            missedHeartbeatsRef.current = 0;
            return;
          }
          
          setMessages(prev => [...prev, message]);
          
          // Handle specific message types
          switch (message.type) {
            case 'round_complete':
              console.log('Round completed:', message);
              break;
            case 'game_complete':
              console.log('Game completed:', message);
              break;
            case 'user_joined':
              console.log('User joined game:', message.user_id);
              break;
            case 'user_left':
              console.log('User left game:', message.user_id);
              break;
            case 'time_update':
              // Handle opponent time updates
              break;
            case 'chat_message':
              console.log('Chat message:', message.message);
              break;
            case 'error':
              console.error('WebSocket error message:', message);
              break;
          }
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      ws.onclose = (event) => {
        console.log('WebSocket disconnected from duel', { code: event.code, reason: event.reason });
        setConnectionState(ConnectionState.DISCONNECTED);
        wsRef.current = null;
        stopHeartbeat();

        // Don't reconnect if it was an intentional disconnect
        if (intentionalDisconnect.current) {
          intentionalDisconnect.current = false;
          return;
        }

        // Attempt to reconnect if we haven't exceeded max attempts
        if (reconnectAttempts.current < reconnectConfig.maxAttempts) {
          reconnectAttempts.current++;
          setConnectionState(ConnectionState.RECONNECTING);
          
          // Calculate exponential backoff delay
          const delay = Math.min(
            currentReconnectDelay.current,
            reconnectConfig.maxDelay
          );
          
          console.log(`Attempting to reconnect in ${delay}ms... (${reconnectAttempts.current}/${reconnectConfig.maxAttempts})`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, delay);
          
          // Increase delay for next attempt
          currentReconnectDelay.current = Math.min(
            currentReconnectDelay.current * reconnectConfig.backoffMultiplier,
            reconnectConfig.maxDelay
          );
        } else {
          setConnectionError('Failed to reconnect after multiple attempts');
          setConnectionState(ConnectionState.FAILED);
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        setConnectionError('WebSocket connection error');
        // The error event is always followed by a close event
      };

      wsRef.current = ws;
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      setConnectionError('Failed to create WebSocket connection');
    }
  }, [gameId, userId, connectionState, startHeartbeat, stopHeartbeat, flushMessageQueue, reconnectConfig]);

  const disconnect = useCallback(() => {
    intentionalDisconnect.current = true;
    
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    stopHeartbeat();
    
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    
    setConnectionState(ConnectionState.DISCONNECTED);
    reconnectAttempts.current = 0;
    currentReconnectDelay.current = reconnectConfig.initialDelay;
    messageQueueRef.current = [];
  }, [stopHeartbeat, reconnectConfig]);

  const sendMessage = useCallback((message: Omit<DuelMessage, 'timestamp'>) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      const messageWithTimestamp = {
        ...message,
        timestamp: Date.now()
      };
      wsRef.current.send(JSON.stringify(messageWithTimestamp));
    } else {
      console.warn('WebSocket is not connected. Queueing message:', message);
      // Queue the message for later delivery
      messageQueueRef.current.push(message);
      
      // If we're disconnected and not already reconnecting, trigger a reconnection
      if (connectionState === ConnectionState.DISCONNECTED || connectionState === ConnectionState.FAILED) {
        connect();
      }
    }
  }, [connectionState, connect]);

  // Helper functions for common message types
  const submitProof = useCallback((proof: any) => {
    sendMessage({
      type: 'proof_submission',
      user_id: userId,
      game_id: gameId,
      data: { proof }
    });
  }, [sendMessage, userId, gameId]);

  const updateTime = useCallback((timeLeft: number) => {
    sendMessage({
      type: 'time_update',
      user_id: userId,
      game_id: gameId,
      data: { time_left: timeLeft }
    });
  }, [sendMessage, userId, gameId]);

  const sendChatMessage = useCallback((messageText: string) => {
    sendMessage({
      type: 'chat_message',
      user_id: userId,
      game_id: gameId,
      data: { message: messageText }
    });
  }, [sendMessage, userId, gameId]);

  const surrender = useCallback(() => {
    sendMessage({
      type: 'surrender',
      user_id: userId,
      game_id: gameId
    });
  }, [sendMessage, userId, gameId]);

  useEffect(() => {
    connect();
    return disconnect;
  }, [connect, disconnect]);

  const resetConnection = useCallback(() => {
    disconnect();
    reconnectAttempts.current = 0;
    currentReconnectDelay.current = reconnectConfig.initialDelay;
    setTimeout(() => connect(), 100);
  }, [disconnect, connect, reconnectConfig]);

  return {
    isConnected,
    connectionState,
    messages,
    connectionError,
    sendMessage,
    submitProof,
    updateTime,
    sendChatMessage,
    surrender,
    reconnect: resetConnection,
    disconnect,
    messageQueueSize: messageQueueRef.current.length
  };
}

export function useNotificationsWebSocket(userId: number, config?: Partial<ReconnectionConfig>) {
  const reconnectConfig = { ...defaultReconnectionConfig, ...config };
  const [connectionState, setConnectionState] = useState<ConnectionState>(ConnectionState.DISCONNECTED);
  const [notifications, setNotifications] = useState<NotificationMessage[]>([]);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttempts = useRef(0);
  const currentReconnectDelay = useRef(reconnectConfig.initialDelay);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const messageQueueRef = useRef<Array<Omit<NotificationMessage, 'timestamp'>>>([]);
  const lastHeartbeatRef = useRef<number>(Date.now());
  const missedHeartbeatsRef = useRef(0);
  const intentionalDisconnect = useRef(false);
  
  // Derived state for backwards compatibility
  const isConnected = connectionState === ConnectionState.CONNECTED;

  const startHeartbeat = useCallback(() => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
    }
    
    lastHeartbeatRef.current = Date.now();
    missedHeartbeatsRef.current = 0;
    
    heartbeatIntervalRef.current = setInterval(() => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        const now = Date.now();
        
        // Check if we've missed too many heartbeats
        if (now - lastHeartbeatRef.current > 90000) { // 90 seconds = 3 missed heartbeats
          console.warn('Missed too many heartbeats, forcing reconnection');
          wsRef.current.close();
          return;
        }
        
        wsRef.current.send(JSON.stringify({
          type: 'ping',
          timestamp: now
        }));
        missedHeartbeatsRef.current++;
      }
    }, 30000);
  }, []);

  const stopHeartbeat = useCallback(() => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }
  }, []);

  const flushMessageQueue = useCallback(() => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      while (messageQueueRef.current.length > 0) {
        const message = messageQueueRef.current.shift();
        if (message) {
          const messageWithTimestamp = {
            ...message,
            timestamp: Date.now()
          };
          wsRef.current.send(JSON.stringify(messageWithTimestamp));
        }
      }
    }
  }, []);

  const connect = useCallback(() => {
    if (!userId) return;
    
    // Don't connect if we're already connecting or connected
    if (connectionState === ConnectionState.CONNECTING || connectionState === ConnectionState.CONNECTED) {
      return;
    }

    try {
      setConnectionState(reconnectAttempts.current > 0 ? ConnectionState.RECONNECTING : ConnectionState.CONNECTING);
      setConnectionError(null);

      const baseUrl = process.env.NEXT_PUBLIC_WS_URL || 
        (process.env.NEXT_PUBLIC_API_URL ? process.env.NEXT_PUBLIC_API_URL.replace(/^http/, 'ws') : 'ws://localhost:8000');
      const wsUrl = `${baseUrl}/ws/notifications/${userId}`;
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log('WebSocket connected for notifications');
        setConnectionState(ConnectionState.CONNECTED);
        setConnectionError(null);
        reconnectAttempts.current = 0;
        currentReconnectDelay.current = reconnectConfig.initialDelay;
        startHeartbeat();
        
        // Flush any queued messages
        flushMessageQueue();
      };

      ws.onmessage = (event) => {
        try {
          const notification: NotificationMessage = JSON.parse(event.data);
          
          // Handle pong responses
          if (notification.type === 'pong') {
            lastHeartbeatRef.current = Date.now();
            missedHeartbeatsRef.current = 0;
            return;
          }
          
          setNotifications(prev => [...prev, notification]);
          
          // Handle specific notification types
          switch (notification.type) {
            case 'match_found':
              console.log('Match found:', notification);
              // Could trigger a browser notification here
              if ('Notification' in window && Notification.permission === 'granted') {
                new Notification('Match Found!', {
                  body: `You've been matched with ${notification.opponent?.handle}`,
                  icon: '/favicon.ico'
                });
              }
              break;
            case 'game_update':
              console.log('Game update:', notification);
              break;
            case 'rating_update':
              console.log('Rating update:', notification);
              break;
            case 'system_announcement':
              console.log('System announcement:', notification);
              break;
          }
        } catch (error) {
          console.error('Failed to parse notification message:', error);
        }
      };

      ws.onclose = (event) => {
        console.log('WebSocket disconnected from notifications', { code: event.code, reason: event.reason });
        setConnectionState(ConnectionState.DISCONNECTED);
        wsRef.current = null;
        stopHeartbeat();

        // Don't reconnect if it was an intentional disconnect
        if (intentionalDisconnect.current) {
          intentionalDisconnect.current = false;
          return;
        }

        // Attempt to reconnect if we haven't exceeded max attempts
        if (reconnectAttempts.current < reconnectConfig.maxAttempts) {
          reconnectAttempts.current++;
          setConnectionState(ConnectionState.RECONNECTING);
          
          // Calculate exponential backoff delay
          const delay = Math.min(
            currentReconnectDelay.current,
            reconnectConfig.maxDelay
          );
          
          console.log(`Attempting to reconnect notifications in ${delay}ms... (${reconnectAttempts.current}/${reconnectConfig.maxAttempts})`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, delay);
          
          // Increase delay for next attempt
          currentReconnectDelay.current = Math.min(
            currentReconnectDelay.current * reconnectConfig.backoffMultiplier,
            reconnectConfig.maxDelay
          );
        } else {
          setConnectionError('Failed to reconnect notifications after multiple attempts');
          setConnectionState(ConnectionState.FAILED);
        }
      };

      ws.onerror = (error) => {
        console.error('Notifications WebSocket error:', error);
        setConnectionError('Notifications WebSocket connection error');
        // The error event is always followed by a close event
      };

      wsRef.current = ws;
    } catch (error) {
      console.error('Failed to create notifications WebSocket connection:', error);
      setConnectionError('Failed to create notifications WebSocket connection');
    }
  }, [userId, connectionState, startHeartbeat, stopHeartbeat, flushMessageQueue, reconnectConfig]);

  const disconnect = useCallback(() => {
    intentionalDisconnect.current = true;
    
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    stopHeartbeat();
    
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    
    setConnectionState(ConnectionState.DISCONNECTED);
    reconnectAttempts.current = 0;
    currentReconnectDelay.current = reconnectConfig.initialDelay;
    messageQueueRef.current = [];
  }, [stopHeartbeat, reconnectConfig]);

  const sendMessage = useCallback((message: Omit<NotificationMessage, 'timestamp'>) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      const messageWithTimestamp = {
        ...message,
        timestamp: Date.now()
      };
      wsRef.current.send(JSON.stringify(messageWithTimestamp));
    } else {
      console.warn('WebSocket is not connected. Queueing message:', message);
      // Queue the message for later delivery
      messageQueueRef.current.push(message);
      
      // If we're disconnected and not already reconnecting, trigger a reconnection
      if (connectionState === ConnectionState.DISCONNECTED || connectionState === ConnectionState.FAILED) {
        connect();
      }
    }
  }, [connectionState, connect]);

  const markNotificationsRead = useCallback((notificationIds: number[]) => {
    sendMessage({
      type: 'mark_read',
      user_id: userId,
      data: { notification_ids: notificationIds }
    });
  }, [sendMessage, userId]);

  useEffect(() => {
    connect();
    return disconnect;
  }, [connect, disconnect]);

  // Request notification permission on first connection
  useEffect(() => {
    if (isConnected && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, [isConnected]);

  const resetConnection = useCallback(() => {
    disconnect();
    reconnectAttempts.current = 0;
    currentReconnectDelay.current = reconnectConfig.initialDelay;
    setTimeout(() => connect(), 100);
  }, [disconnect, connect, reconnectConfig]);

  return {
    isConnected,
    connectionState,
    notifications,
    connectionError,
    sendMessage,
    markNotificationsRead,
    reconnect: resetConnection,
    disconnect,
    messageQueueSize: messageQueueRef.current.length
  };
}