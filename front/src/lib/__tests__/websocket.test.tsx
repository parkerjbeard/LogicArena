/**
 * @jest-environment jsdom
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { useDuelWebSocket, useNotificationsWebSocket } from '../websocket';

// Mock WebSocket
class MockWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  readyState = MockWebSocket.CONNECTING;
  url: string;
  onopen?: (event: Event) => void;
  onclose?: (event: CloseEvent) => void;
  onmessage?: (event: MessageEvent) => void;
  onerror?: (event: Event) => void;

  constructor(url: string) {
    this.url = url;
    // Simulate async connection opening without scheduling timers
    Promise.resolve().then(() => {
      this.readyState = MockWebSocket.OPEN;
      this.onopen?.(new Event('open'));
    });
  }

  send(data: string) {
    // Mock send method
  }

  close(code?: number, reason?: string) {
    this.readyState = MockWebSocket.CLOSED;
    this.onclose?.(new CloseEvent('close', { code, reason }));
  }

  // Helper method to simulate receiving messages
  simulateMessage(data: any) {
    if (this.readyState === MockWebSocket.OPEN) {
      const event = new MessageEvent('message', {
        data: JSON.stringify(data)
      });
      this.onmessage?.(event);
    }
  }

  // Helper method to simulate errors
  simulateError() {
    this.onerror?.(new Event('error'));
  }
}

// Mock localStorage
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};

// Mock Notification API
const mockNotification = {
  permission: 'granted' as NotificationPermission,
  requestPermission: jest.fn().mockResolvedValue('granted'),
};

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
});

Object.defineProperty(window, 'Notification', {
  value: mockNotification,
  configurable: true,
});

// Store original WebSocket to restore later
const OriginalWebSocket = global.WebSocket;

describe('useDuelWebSocket', () => {
  let mockWebSocket: MockWebSocket;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    mockLocalStorage.getItem.mockReturnValue('fake-token');

    // Mock WebSocket
    global.WebSocket = jest.fn().mockImplementation((url: string) => {
      mockWebSocket = new MockWebSocket(url);
      return mockWebSocket;
    }) as any;

    // Mock timers
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
    global.WebSocket = OriginalWebSocket;
    // Help GC between tests
    // @ts-ignore
    mockWebSocket = undefined;
  });

  it('should connect to WebSocket with correct URL', async () => {
    const { result } = renderHook(() => useDuelWebSocket(123, 1));

    await act(async () => {
      jest.advanceTimersByTime(100);
    });

    expect(global.WebSocket).toHaveBeenCalledWith(
      'ws://localhost:8000/ws/duel/123?token=fake-token'
    );
    expect(result.current.isConnected).toBe(false); // Initially false until connected
  });

  it('should set connected state when WebSocket opens', async () => {
    const { result } = renderHook(() => useDuelWebSocket(123, 1));

    await act(async () => {
      jest.advanceTimersByTime(100);
    });

    await waitFor(() => {
      expect(result.current.isConnected).toBe(true);
    });
  });

  it('should handle received messages', async () => {
    const { result } = renderHook(() => useDuelWebSocket(123, 1));

    await act(async () => {
      jest.advanceTimersByTime(100);
    });

    const testMessage = {
      type: 'round_complete',
      round_winner: 1,
      game_winner: 1,
      timestamp: Date.now(),
    };

    act(() => {
      mockWebSocket.simulateMessage(testMessage);
    });

    expect(result.current.messages).toHaveLength(1);
    expect(result.current.messages[0]).toMatchObject(testMessage);
  });

  it('should filter out pong messages', async () => {
    const { result } = renderHook(() => useDuelWebSocket(123, 1));

    await act(async () => {
      jest.advanceTimersByTime(100);
    });

    act(() => {
      mockWebSocket.simulateMessage({ type: 'pong', timestamp: Date.now() });
      mockWebSocket.simulateMessage({ type: 'test_message', data: 'test' });
    });

    // Should only have the test message, not the pong
    expect(result.current.messages).toHaveLength(1);
    expect(result.current.messages[0].type).toBe('test_message');
  });

  it('should send messages correctly', async () => {
    const sendSpy = jest.spyOn(mockWebSocket, 'send');
    const { result } = renderHook(() => useDuelWebSocket(123, 1));

    await act(async () => {
      jest.advanceTimersByTime(100);
    });

    await waitFor(() => {
      expect(result.current.isConnected).toBe(true);
    });

    act(() => {
      result.current.sendMessage({
        type: 'test',
        user_id: 1,
        data: { test: 'data' },
      });
    });

    expect(sendSpy).toHaveBeenCalled();
    const sentData = JSON.parse(sendSpy.mock.calls[0][0]);
    expect(sentData.type).toBe('test');
    expect(sentData.timestamp).toBeDefined();
  });

  it('should submit proof correctly', async () => {
    const sendSpy = jest.spyOn(mockWebSocket, 'send');
    const { result } = renderHook(() => useDuelWebSocket(123, 1));

    await act(async () => {
      jest.advanceTimersByTime(100);
    });

    await waitFor(() => {
      expect(result.current.isConnected).toBe(true);
    });

    const proof = {
      premises: ['P', 'P → Q'],
      conclusion: 'Q',
      steps: [],
    };

    act(() => {
      result.current.submitProof(proof);
    });

    expect(sendSpy).toHaveBeenCalled();
    const sentData = JSON.parse(sendSpy.mock.calls[0][0]);
    expect(sentData.type).toBe('proof_submission');
    expect(sentData.data.proof).toEqual(proof);
  });

  it('should update time correctly', async () => {
    const sendSpy = jest.spyOn(mockWebSocket, 'send');
    const { result } = renderHook(() => useDuelWebSocket(123, 1));

    await act(async () => {
      jest.advanceTimersByTime(100);
    });

    await waitFor(() => {
      expect(result.current.isConnected).toBe(true);
    });

    act(() => {
      result.current.updateTime(150);
    });

    expect(sendSpy).toHaveBeenCalled();
    const sentData = JSON.parse(sendSpy.mock.calls[0][0]);
    expect(sentData.type).toBe('time_update');
    expect(sentData.data.time_left).toBe(150);
  });

  it('should send chat messages correctly', async () => {
    const sendSpy = jest.spyOn(mockWebSocket, 'send');
    const { result } = renderHook(() => useDuelWebSocket(123, 1));

    await act(async () => {
      jest.advanceTimersByTime(100);
    });

    await waitFor(() => {
      expect(result.current.isConnected).toBe(true);
    });

    act(() => {
      result.current.sendChatMessage('Good luck!');
    });

    expect(sendSpy).toHaveBeenCalled();
    const sentData = JSON.parse(sendSpy.mock.calls[0][0]);
    expect(sentData.type).toBe('chat_message');
    expect(sentData.data.message).toBe('Good luck!');
  });

  it('should surrender correctly', async () => {
    const sendSpy = jest.spyOn(mockWebSocket, 'send');
    const { result } = renderHook(() => useDuelWebSocket(123, 1));

    await act(async () => {
      jest.advanceTimersByTime(100);
    });

    await waitFor(() => {
      expect(result.current.isConnected).toBe(true);
    });

    act(() => {
      result.current.surrender();
    });

    expect(sendSpy).toHaveBeenCalled();
    const sentData = JSON.parse(sendSpy.mock.calls[0][0]);
    expect(sentData.type).toBe('surrender');
  });

  it('should handle connection errors', async () => {
    const { result } = renderHook(() => useDuelWebSocket(123, 1));

    await act(async () => {
      jest.advanceTimersByTime(100);
    });

    act(() => {
      mockWebSocket.simulateError();
    });

    expect(result.current.connectionError).toBe('WebSocket connection error');
  });

  it('should attempt to reconnect on disconnect', async () => {
    const { result } = renderHook(() => useDuelWebSocket(123, 1));

    await act(async () => {
      jest.advanceTimersByTime(100);
    });

    await waitFor(() => {
      expect(result.current.isConnected).toBe(true);
    });

    // Simulate disconnect
    act(() => {
      mockWebSocket.close();
    });

    expect(result.current.isConnected).toBe(false);

    // Should attempt reconnection after delay
    act(() => {
      jest.advanceTimersByTime(3000);
    });

    expect(global.WebSocket).toHaveBeenCalledTimes(2);
  });

  it('should send heartbeat pings', async () => {
    const sendSpy = jest.spyOn(mockWebSocket, 'send');
    const { result } = renderHook(() => useDuelWebSocket(123, 1));

    await act(async () => {
      jest.advanceTimersByTime(100);
    });

    await waitFor(() => {
      expect(result.current.isConnected).toBe(true);
    });

    // Advance time to trigger heartbeat
    act(() => {
      jest.advanceTimersByTime(30000);
    });

    expect(sendSpy).toHaveBeenCalled();
    const sentData = JSON.parse(sendSpy.mock.calls[0][0]);
    expect(sentData.type).toBe('ping');
  });

  it('should not connect without token', () => {
    mockLocalStorage.getItem.mockReturnValue(null);

    const { result } = renderHook(() => useDuelWebSocket(123, 1));

    expect(global.WebSocket).not.toHaveBeenCalled();
    expect(result.current.connectionError).toBe('No authentication token found');
  });

  it('should not connect without gameId or userId', () => {
    const { result } = renderHook(() => useDuelWebSocket(0, 0));

    expect(global.WebSocket).not.toHaveBeenCalled();
  });
});

describe('useNotificationsWebSocket', () => {
  let mockWebSocket: MockWebSocket;

  beforeEach(() => {
    jest.clearAllMocks();
    mockLocalStorage.getItem.mockReturnValue('fake-token');

    global.WebSocket = jest.fn().mockImplementation((url: string) => {
      mockWebSocket = new MockWebSocket(url);
      return mockWebSocket;
    }) as any;

    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
    global.WebSocket = OriginalWebSocket;
  });

  it('should connect to notifications WebSocket', async () => {
    const { result } = renderHook(() => useNotificationsWebSocket(1));

    await act(async () => {
      jest.advanceTimersByTime(100);
    });

    expect(global.WebSocket).toHaveBeenCalledWith(
      'ws://localhost:8000/ws/notifications/1?token=fake-token'
    );
  });

  it('should handle match found notifications', async () => {
    // Mock Notification constructor
    const NotificationConstructor = jest.fn();
    global.Notification = NotificationConstructor as any;
    global.Notification.permission = 'granted';

    const { result } = renderHook(() => useNotificationsWebSocket(1));

    await act(async () => {
      jest.advanceTimersByTime(100);
    });

    const matchNotification = {
      type: 'match_found',
      opponent: { id: 2, handle: 'opponent' },
      game_id: 123,
    };

    act(() => {
      mockWebSocket.simulateMessage(matchNotification);
    });

    expect(result.current.notifications).toHaveLength(1);
    expect(result.current.notifications[0]).toMatchObject(matchNotification);
    
    // Should create browser notification
    expect(NotificationConstructor).toHaveBeenCalledWith(
      'Match Found!',
      expect.objectContaining({
        body: "You've been matched with opponent",
      })
    );
  });

  it('should handle rating update notifications', async () => {
    const { result } = renderHook(() => useNotificationsWebSocket(1));

    await act(async () => {
      jest.advanceTimersByTime(100);
    });

    const ratingNotification = {
      type: 'rating_update',
      old_rating: 1000,
      new_rating: 1025,
      change: 25,
    };

    act(() => {
      mockWebSocket.simulateMessage(ratingNotification);
    });

    expect(result.current.notifications).toHaveLength(1);
    expect(result.current.notifications[0]).toMatchObject(ratingNotification);
  });

  it('should mark notifications as read', async () => {
    const sendSpy = jest.spyOn(mockWebSocket, 'send');
    const { result } = renderHook(() => useNotificationsWebSocket(1));

    await act(async () => {
      jest.advanceTimersByTime(100);
    });

    await waitFor(() => {
      expect(result.current.isConnected).toBe(true);
    });

    act(() => {
      result.current.markNotificationsRead([1, 2, 3]);
    });

    expect(sendSpy).toHaveBeenCalled();
    const sentData = JSON.parse(sendSpy.mock.calls[0][0]);
    expect(sentData.type).toBe('mark_read');
    expect(sentData.data.notification_ids).toEqual([1, 2, 3]);
  });

  it('should request notification permission on first connection', async () => {
    global.Notification = {
      permission: 'default',
      requestPermission: jest.fn().mockResolvedValue('granted'),
    } as any;

    renderHook(() => useNotificationsWebSocket(1));

    await act(async () => {
      jest.advanceTimersByTime(100);
    });

    await waitFor(() => {
      expect(global.Notification.requestPermission).toHaveBeenCalled();
    });
  });

  it('should filter out pong messages from notifications', async () => {
    const { result } = renderHook(() => useNotificationsWebSocket(1));

    await act(async () => {
      jest.advanceTimersByTime(100);
    });

    act(() => {
      mockWebSocket.simulateMessage({ type: 'pong', timestamp: Date.now() });
      mockWebSocket.simulateMessage({ 
        type: 'system_announcement', 
        message: 'Server maintenance' 
      });
    });

    expect(result.current.notifications).toHaveLength(1);
    expect(result.current.notifications[0].type).toBe('system_announcement');
  });

  it('should handle connection cleanup properly', async () => {
    const { result, unmount } = renderHook(() => useNotificationsWebSocket(1));

    await act(async () => {
      jest.advanceTimersByTime(100);
    });

    const closeSpy = jest.spyOn(mockWebSocket, 'close');

    act(() => {
      unmount();
    });

    expect(closeSpy).toHaveBeenCalled();
  });
});

describe('WebSocket Error Handling', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLocalStorage.getItem.mockReturnValue('fake-token');
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
    global.WebSocket = OriginalWebSocket;
  });

  it('should handle JSON parsing errors gracefully', async () => {
    global.WebSocket = jest.fn().mockImplementation((url: string) => {
      const ws = new MockWebSocket(url);
      // Override simulateMessage to send invalid JSON
      ws.simulateMessage = function(data: any) {
        if (this.readyState === MockWebSocket.OPEN) {
          const event = new MessageEvent('message', {
            data: 'invalid-json'
          });
          this.onmessage?.(event);
        }
      };
      return ws;
    }) as any;

    const { result } = renderHook(() => useDuelWebSocket(123, 1));
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

    await act(async () => {
      jest.advanceTimersByTime(100);
    });

    act(() => {
      (result.current as any).mockWebSocket?.simulateMessage('invalid');
    });

    expect(consoleSpy).toHaveBeenCalledWith(
      'Failed to parse WebSocket message:',
      expect.any(Error)
    );

    consoleSpy.mockRestore();
  });

  it('should stop reconnecting after max attempts', async () => {
    let wsInstance: MockWebSocket;
    global.WebSocket = jest.fn().mockImplementation((url: string) => {
      wsInstance = new MockWebSocket(url);
      return wsInstance;
    }) as any;

    const { result } = renderHook(() => useDuelWebSocket(123, 1));

    // Simulate multiple disconnections
    for (let i = 0; i < 6; i++) {
      await act(async () => {
        jest.advanceTimersByTime(100);
      });

      act(() => {
        wsInstance!.close();
      });

      act(() => {
        jest.advanceTimersByTime(3000);
      });
    }

    expect(result.current.connectionError).toBe(
      'Failed to reconnect after multiple attempts'
    );
  });
});