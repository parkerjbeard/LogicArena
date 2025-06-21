'use client';

import { useEffect, useState, useRef, useCallback } from 'react';

interface DuelMessage {
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
}

interface NotificationMessage {
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

export function useDuelWebSocket(gameId: number, userId: number) {
  const [isConnected, setIsConnected] = useState(false);
  const [messages, setMessages] = useState<DuelMessage[]>([]);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;
  const reconnectDelay = 3000; // 3 seconds
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const startHeartbeat = useCallback(() => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
    }
    
    heartbeatIntervalRef.current = setInterval(() => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          type: 'ping',
          timestamp: Date.now()
        }));
      }
    }, 30000); // Ping every 30 seconds
  }, []);

  const stopHeartbeat = useCallback(() => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }
  }, []);

  const connect = useCallback(() => {
    if (!gameId || !userId) return;

    try {
      const token = localStorage.getItem('access_token') || localStorage.getItem('token');
      if (!token) {
        setConnectionError('No authentication token found');
        return;
      }

      const wsUrl = `ws://localhost:8000/ws/duel/${gameId}?token=${encodeURIComponent(token)}`;
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log('WebSocket connected for duel');
        setIsConnected(true);
        setConnectionError(null);
        reconnectAttempts.current = 0;
        startHeartbeat();
      };

      ws.onmessage = (event) => {
        try {
          const message: DuelMessage = JSON.parse(event.data);
          
          // Handle pong responses (don't add to messages)
          if (message.type === 'pong') {
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

      ws.onclose = () => {
        console.log('WebSocket disconnected from duel');
        setIsConnected(false);
        wsRef.current = null;
        stopHeartbeat();

        // Attempt to reconnect if we haven't exceeded max attempts
        if (reconnectAttempts.current < maxReconnectAttempts) {
          reconnectAttempts.current++;
          reconnectTimeoutRef.current = setTimeout(() => {
            console.log(`Attempting to reconnect... (${reconnectAttempts.current}/${maxReconnectAttempts})`);
            connect();
          }, reconnectDelay);
        } else {
          setConnectionError('Failed to reconnect after multiple attempts');
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        setConnectionError('WebSocket connection error');
      };

      wsRef.current = ws;
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      setConnectionError('Failed to create WebSocket connection');
    }
  }, [gameId, userId, startHeartbeat, stopHeartbeat]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    stopHeartbeat();
    
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    
    setIsConnected(false);
    reconnectAttempts.current = maxReconnectAttempts; // Prevent reconnection
  }, [stopHeartbeat]);

  const sendMessage = useCallback((message: Omit<DuelMessage, 'timestamp'>) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      const messageWithTimestamp = {
        ...message,
        timestamp: Date.now()
      };
      wsRef.current.send(JSON.stringify(messageWithTimestamp));
    } else {
      console.warn('WebSocket is not connected. Cannot send message:', message);
    }
  }, []);

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

  return {
    isConnected,
    messages,
    connectionError,
    sendMessage,
    submitProof,
    updateTime,
    sendChatMessage,
    surrender,
    reconnect: connect,
    disconnect
  };
}

export function useNotificationsWebSocket(userId: number) {
  const [isConnected, setIsConnected] = useState(false);
  const [notifications, setNotifications] = useState<NotificationMessage[]>([]);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;
  const reconnectDelay = 3000;
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const startHeartbeat = useCallback(() => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
    }
    
    heartbeatIntervalRef.current = setInterval(() => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          type: 'ping',
          timestamp: Date.now()
        }));
      }
    }, 30000);
  }, []);

  const stopHeartbeat = useCallback(() => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }
  }, []);

  const connect = useCallback(() => {
    if (!userId) return;

    try {
      const token = localStorage.getItem('access_token') || localStorage.getItem('token');
      if (!token) {
        setConnectionError('No authentication token found');
        return;
      }

      const wsUrl = `ws://localhost:8000/ws/notifications/${userId}?token=${encodeURIComponent(token)}`;
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log('WebSocket connected for notifications');
        setIsConnected(true);
        setConnectionError(null);
        reconnectAttempts.current = 0;
        startHeartbeat();
      };

      ws.onmessage = (event) => {
        try {
          const notification: NotificationMessage = JSON.parse(event.data);
          
          // Handle pong responses
          if (notification.type === 'pong') {
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

      ws.onclose = () => {
        console.log('WebSocket disconnected from notifications');
        setIsConnected(false);
        wsRef.current = null;
        stopHeartbeat();

        if (reconnectAttempts.current < maxReconnectAttempts) {
          reconnectAttempts.current++;
          reconnectTimeoutRef.current = setTimeout(() => {
            console.log(`Attempting to reconnect notifications... (${reconnectAttempts.current}/${maxReconnectAttempts})`);
            connect();
          }, reconnectDelay);
        } else {
          setConnectionError('Failed to reconnect notifications after multiple attempts');
        }
      };

      ws.onerror = (error) => {
        console.error('Notifications WebSocket error:', error);
        setConnectionError('Notifications WebSocket connection error');
      };

      wsRef.current = ws;
    } catch (error) {
      console.error('Failed to create notifications WebSocket connection:', error);
      setConnectionError('Failed to create notifications WebSocket connection');
    }
  }, [userId, startHeartbeat, stopHeartbeat]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    stopHeartbeat();
    
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    
    setIsConnected(false);
    reconnectAttempts.current = maxReconnectAttempts;
  }, [stopHeartbeat]);

  const sendMessage = useCallback((message: Omit<NotificationMessage, 'timestamp'>) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      const messageWithTimestamp = {
        ...message,
        timestamp: Date.now()
      };
      wsRef.current.send(JSON.stringify(messageWithTimestamp));
    }
  }, []);

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

  return {
    isConnected,
    notifications,
    connectionError,
    sendMessage,
    markNotificationsRead,
    reconnect: connect,
    disconnect
  };
}