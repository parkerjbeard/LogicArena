// WebSocket client for LogicArena
import { useEffect, useRef, useState, useCallback } from 'react';

const WS_URL = process.env.WS_URL || 'ws://localhost:8000';

export type WebSocketMessage = {
  type: string;
  [key: string]: any;
};

// WebSocket hook for duel matches
export const useDuelWebSocket = (gameId: string | number, userId: string | number) => {
  const [isConnected, setIsConnected] = useState(false);
  const [messages, setMessages] = useState<WebSocketMessage[]>([]);
  const socketRef = useRef<WebSocket | null>(null);
  
  // Connect to WebSocket
  const connect = useCallback(() => {
    if (!gameId || !userId) return;
    
    // Close existing connection if any
    if (socketRef.current) {
      socketRef.current.close();
    }
    
    // Create new WebSocket connection
    const socket = new WebSocket(`${WS_URL}/ws/duel/${gameId}`);
    
    // Set up event handlers
    socket.onopen = () => {
      console.log(`WebSocket connected: Game ${gameId}`);
      setIsConnected(true);
      
      // Send initial message to identify user
      socket.send(JSON.stringify({
        type: 'join',
        user_id: userId,
        game_id: gameId,
      }));
    };
    
    socket.onclose = () => {
      console.log(`WebSocket disconnected: Game ${gameId}`);
      setIsConnected(false);
    };
    
    socket.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
    
    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        setMessages((prevMessages) => [...prevMessages, data]);
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };
    
    socketRef.current = socket;
    
    // Clean up on unmount
    return () => {
      if (socket) {
        socket.close();
      }
    };
  }, [gameId, userId]);
  
  // Reconnect on params change
  useEffect(() => {
    connect();
    
    return () => {
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, [connect]);
  
  // Send message through WebSocket
  const sendMessage = useCallback((message: WebSocketMessage) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify(message));
    } else {
      console.error('WebSocket not connected');
    }
  }, []);
  
  return {
    isConnected,
    messages,
    sendMessage,
    connect,
  };
};

// WebSocket hook for notifications
export const useNotificationsWebSocket = (userId: string | number) => {
  const [isConnected, setIsConnected] = useState(false);
  const [notifications, setNotifications] = useState<WebSocketMessage[]>([]);
  const socketRef = useRef<WebSocket | null>(null);
  
  // Connect to WebSocket
  const connect = useCallback(() => {
    if (!userId) return;
    
    // Close existing connection if any
    if (socketRef.current) {
      socketRef.current.close();
    }
    
    // Create new WebSocket connection
    const socket = new WebSocket(`${WS_URL}/ws/notifications/${userId}`);
    
    // Set up event handlers
    socket.onopen = () => {
      console.log(`Notifications WebSocket connected: User ${userId}`);
      setIsConnected(true);
    };
    
    socket.onclose = () => {
      console.log(`Notifications WebSocket disconnected: User ${userId}`);
      setIsConnected(false);
    };
    
    socket.onerror = (error) => {
      console.error('Notifications WebSocket error:', error);
    };
    
    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        setNotifications((prevNotifications) => [...prevNotifications, data]);
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };
    
    socketRef.current = socket;
    
    // Clean up on unmount
    return () => {
      if (socket) {
        socket.close();
      }
    };
  }, [userId]);
  
  // Reconnect on params change
  useEffect(() => {
    connect();
    
    return () => {
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, [connect]);
  
  // Clear notification
  const clearNotification = useCallback((id: string) => {
    setNotifications((prevNotifications) => 
      prevNotifications.filter((notification) => notification.id !== id)
    );
  }, []);
  
  return {
    isConnected,
    notifications,
    clearNotification,
    connect,
  };
};

export default {
  useDuelWebSocket,
  useNotificationsWebSocket,
}; 