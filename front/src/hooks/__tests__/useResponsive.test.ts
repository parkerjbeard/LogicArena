import { renderHook, act } from '@testing-library/react';
import { useBreakpoint, useAdaptiveClick, useSwipeGesture } from '../useResponsive';

// Mock InputContext
let mockInputMethod = 'mouse';
jest.mock('@/contexts/InputContext', () => ({
  useInput: () => ({
    inputMethod: mockInputMethod,
    deviceType: 'mobile',
    updateInputMethod: jest.fn(),
  }),
}));

// Mock window.matchMedia
const mockMatchMedia = jest.fn();
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: mockMatchMedia,
});

// Helper to set window dimensions
const setWindowDimensions = (width: number, height: number = 768) => {
  Object.defineProperty(window, 'innerWidth', {
    writable: true,
    configurable: true,
    value: width,
  });
  Object.defineProperty(window, 'innerHeight', {
    writable: true,
    configurable: true,
    value: height,
  });
};

describe('useBreakpoint', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockMatchMedia.mockReturnValue({
      matches: false,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    });
  });

  it('returns desktop breakpoint by default', () => {
    // Set window width for lg breakpoint (768 <= width < 1024)
    setWindowDimensions(800);

    const { result } = renderHook(() => useBreakpoint());

    expect(result.current.breakpoint).toBe('lg');
    expect(result.current.isDesktop).toBe(true);
    expect(result.current.isTablet).toBe(false);
    expect(result.current.isMobile).toBe(false);
  });

  it('returns tablet breakpoint for medium screens', () => {
    // Set window width for md breakpoint (640 <= width < 768)
    setWindowDimensions(700);

    const { result } = renderHook(() => useBreakpoint());

    expect(result.current.breakpoint).toBe('md');
    expect(result.current.isDesktop).toBe(false);
    expect(result.current.isTablet).toBe(true);
    expect(result.current.isMobile).toBe(false);
  });

  it('returns mobile breakpoint for small screens', () => {
    // Set window width for sm breakpoint (475 <= width < 640)
    setWindowDimensions(500);

    const { result } = renderHook(() => useBreakpoint());

    expect(result.current.breakpoint).toBe('sm');
    expect(result.current.isDesktop).toBe(false);
    expect(result.current.isTablet).toBe(false);
    expect(result.current.isMobile).toBe(true);
  });

  it('updates breakpoint when screen size changes', () => {
    // Start with lg breakpoint
    setWindowDimensions(800);

    const { result } = renderHook(() => useBreakpoint());
    expect(result.current.breakpoint).toBe('lg');

    // Simulate resize to mobile
    act(() => {
      setWindowDimensions(400);
      window.dispatchEvent(new Event('resize'));
    });

    expect(result.current.breakpoint).toBe('xs');
    expect(result.current.isMobile).toBe(true);
  });

  it('cleans up event listeners on unmount', () => {
    const addEventListenerSpy = jest.spyOn(window, 'addEventListener');
    const removeEventListenerSpy = jest.spyOn(window, 'removeEventListener');

    setWindowDimensions(800);
    const { unmount } = renderHook(() => useBreakpoint());

    expect(addEventListenerSpy).toHaveBeenCalledWith('resize', expect.any(Function));

    unmount();

    expect(removeEventListenerSpy).toHaveBeenCalledWith('resize', expect.any(Function));

    addEventListenerSpy.mockRestore();
    removeEventListenerSpy.mockRestore();
  });
});

describe('useAdaptiveClick', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    mockInputMethod = 'mouse'; // Reset to mouse for most tests
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('returns click handlers for regular and long press', () => {
    const onClick = jest.fn();
    const onLongPress = jest.fn();

    const { result } = renderHook(() => useAdaptiveClick(onClick, onLongPress));

    expect(result.current.onMouseDown).toBeDefined();
    expect(result.current.onMouseUp).toBeDefined();
    expect(result.current.onMouseLeave).toBeDefined();
    expect(result.current.onTouchStart).toBeDefined();
    expect(result.current.onTouchEnd).toBeDefined();
    expect(result.current.isPressed).toBeDefined();
  });

  it('calls onClick on regular click', () => {
    const onClick = jest.fn();
    const onLongPress = jest.fn();

    const { result } = renderHook(() => useAdaptiveClick(onClick, onLongPress));

    const mockEvent = {} as React.MouseEvent<HTMLElement>;

    // Simulate mousedown and mouseup for a click
    act(() => {
      result.current.onMouseDown?.(mockEvent);
    });

    act(() => {
      result.current.onMouseUp?.(mockEvent);
    });

    expect(onClick).toHaveBeenCalledWith(mockEvent);
    expect(onLongPress).not.toHaveBeenCalled();
  });

  it('calls onLongPress on long press for touch input', () => {
    mockInputMethod = 'touch'; // Set to touch for long press to work
    const onClick = jest.fn();
    const onLongPress = jest.fn();

    const { result } = renderHook(() => useAdaptiveClick(onClick, onLongPress));

    act(() => {
      const mockEvent = {} as React.TouchEvent<HTMLElement>;
      result.current.onTouchStart(mockEvent);
    });

    act(() => {
      jest.advanceTimersByTime(600); // Long press threshold (default is 500ms)
    });

    expect(onLongPress).toHaveBeenCalled();
    expect(onClick).not.toHaveBeenCalled();
  });

  it('cancels long press on mouse up', () => {
    const onClick = jest.fn();
    const onLongPress = jest.fn();

    const { result } = renderHook(() => useAdaptiveClick(onClick, onLongPress));

    act(() => {
      const mockEvent = {} as React.MouseEvent<HTMLElement>;
      result.current.onMouseDown?.(mockEvent);
    });

    act(() => {
      jest.advanceTimersByTime(300); // Before long press threshold
    });

    act(() => {
      const mockEvent = {} as React.MouseEvent<HTMLElement>;
      result.current.onMouseUp?.(mockEvent);
    });

    act(() => {
      jest.advanceTimersByTime(300); // Complete the original timeout
    });

    expect(onLongPress).not.toHaveBeenCalled();
  });

  it('cancels long press on mouse leave', () => {
    const onClick = jest.fn();
    const onLongPress = jest.fn();

    const { result } = renderHook(() => useAdaptiveClick(onClick, onLongPress));

    act(() => {
      const mockEvent = {} as React.MouseEvent<HTMLElement>;
      result.current.onMouseDown?.(mockEvent);
    });

    act(() => {
      result.current.onMouseLeave?.();
    });

    act(() => {
      jest.advanceTimersByTime(600);
    });

    expect(onLongPress).not.toHaveBeenCalled();
  });

  it('handles touch events correctly', () => {
    mockInputMethod = 'touch'; // Set to touch for long press to work
    const onClick = jest.fn();
    const onLongPress = jest.fn();

    const { result } = renderHook(() => useAdaptiveClick(onClick, onLongPress));

    act(() => {
      const mockEvent = {} as React.TouchEvent<HTMLElement>;
      result.current.onTouchStart(mockEvent);
    });

    act(() => {
      jest.advanceTimersByTime(600);
    });

    expect(onLongPress).toHaveBeenCalled();
  });

  it('cancels long press on touch end', () => {
    const onClick = jest.fn();
    const onLongPress = jest.fn();

    const { result } = renderHook(() => useAdaptiveClick(onClick, onLongPress));

    act(() => {
      const mockEvent = {} as React.TouchEvent<HTMLElement>;
      result.current.onTouchStart(mockEvent);
    });

    act(() => {
      const mockEvent = {} as React.TouchEvent<HTMLElement>;
      result.current.onTouchEnd(mockEvent);
    });

    act(() => {
      jest.advanceTimersByTime(600);
    });

    expect(onLongPress).not.toHaveBeenCalled();
  });

  it('handles missing onLongPress gracefully', () => {
    const onClick = jest.fn();

    const { result } = renderHook(() => useAdaptiveClick(onClick));

    act(() => {
      const mockEvent = {} as React.MouseEvent<HTMLElement>;
      result.current.onMouseDown?.(mockEvent);
    });

    act(() => {
      jest.advanceTimersByTime(600);
    });

    // Should not throw error
    expect(onClick).not.toHaveBeenCalled();
  });
});

describe('useSwipeGesture', () => {
  let mockRef: { current: HTMLElement | null };

  beforeEach(() => {
    jest.clearAllMocks();
    mockRef = { current: document.createElement('div') };
  });

  it('returns swipe gesture handlers', () => {
    const handlers = {
      onSwipeLeft: jest.fn(),
      onSwipeRight: jest.fn(),
      onSwipeUp: jest.fn(),
      onSwipeDown: jest.fn(),
    };

    renderHook(() => useSwipeGesture(mockRef, handlers));

    // Should not throw and should set up event listeners
    expect(mockRef.current).toBeDefined();
  });

  it('handles swipe left gesture', () => {
    const handlers = {
      onSwipeLeft: jest.fn(),
      onSwipeRight: jest.fn(),
      onSwipeUp: jest.fn(),
      onSwipeDown: jest.fn(),
    };

    renderHook(() => useSwipeGesture(mockRef, handlers));

    const element = mockRef.current!;

    // Simulate touch start
    act(() => {
      const touchStart = new Event('touchstart');
      Object.defineProperty(touchStart, 'touches', {
        value: [{ clientX: 100, clientY: 100 }],
        writable: false,
      });
      element.dispatchEvent(touchStart);
    });

    // Simulate touch end (swipe left)
    act(() => {
      const touchEnd = new Event('touchend');
      Object.defineProperty(touchEnd, 'changedTouches', {
        value: [{ clientX: 20, clientY: 100 }], // Swipe 80px left
        writable: false,
      });
      element.dispatchEvent(touchEnd);
    });

    expect(handlers.onSwipeLeft).toHaveBeenCalled();
    expect(handlers.onSwipeRight).not.toHaveBeenCalled();
  });

  it('handles swipe right gesture', () => {
    const handlers = {
      onSwipeLeft: jest.fn(),
      onSwipeRight: jest.fn(),
      onSwipeUp: jest.fn(),
      onSwipeDown: jest.fn(),
    };

    renderHook(() => useSwipeGesture(mockRef, handlers));

    const element = mockRef.current!;

    // Simulate touch start
    act(() => {
      const touchStart = new Event('touchstart');
      Object.defineProperty(touchStart, 'touches', {
        value: [{ clientX: 100, clientY: 100 }],
        writable: false,
      });
      element.dispatchEvent(touchStart);
    });

    // Simulate touch end (swipe right)
    act(() => {
      const touchEnd = new Event('touchend');
      Object.defineProperty(touchEnd, 'changedTouches', {
        value: [{ clientX: 180, clientY: 100 }], // Swipe 80px right
        writable: false,
      });
      element.dispatchEvent(touchEnd);
    });

    expect(handlers.onSwipeRight).toHaveBeenCalled();
    expect(handlers.onSwipeLeft).not.toHaveBeenCalled();
  });

  it('handles swipe up gesture', () => {
    const handlers = {
      onSwipeLeft: jest.fn(),
      onSwipeRight: jest.fn(),
      onSwipeUp: jest.fn(),
      onSwipeDown: jest.fn(),
    };

    renderHook(() => useSwipeGesture(mockRef, handlers));

    const element = mockRef.current!;

    // Simulate touch start
    act(() => {
      const touchStart = new Event('touchstart');
      Object.defineProperty(touchStart, 'touches', {
        value: [{ clientX: 100, clientY: 100 }],
        writable: false,
      });
      element.dispatchEvent(touchStart);
    });

    // Simulate touch end (swipe up)
    act(() => {
      const touchEnd = new Event('touchend');
      Object.defineProperty(touchEnd, 'changedTouches', {
        value: [{ clientX: 100, clientY: 20 }], // Swipe 80px up
        writable: false,
      });
      element.dispatchEvent(touchEnd);
    });

    expect(handlers.onSwipeUp).toHaveBeenCalled();
  });

  it('handles swipe down gesture', () => {
    const handlers = {
      onSwipeLeft: jest.fn(),
      onSwipeRight: jest.fn(),
      onSwipeUp: jest.fn(),
      onSwipeDown: jest.fn(),
    };

    renderHook(() => useSwipeGesture(mockRef, handlers));

    const element = mockRef.current!;

    // Simulate touch start
    act(() => {
      const touchStart = new Event('touchstart');
      Object.defineProperty(touchStart, 'touches', {
        value: [{ clientX: 100, clientY: 100 }],
        writable: false,
      });
      element.dispatchEvent(touchStart);
    });

    // Simulate touch end (swipe down)
    act(() => {
      const touchEnd = new Event('touchend');
      Object.defineProperty(touchEnd, 'changedTouches', {
        value: [{ clientX: 100, clientY: 180 }], // Swipe 80px down
        writable: false,
      });
      element.dispatchEvent(touchEnd);
    });

    expect(handlers.onSwipeDown).toHaveBeenCalled();
  });

  it('ignores small movements', () => {
    const handlers = {
      onSwipeLeft: jest.fn(),
      onSwipeRight: jest.fn(),
      onSwipeUp: jest.fn(),
      onSwipeDown: jest.fn(),
    };

    renderHook(() => useSwipeGesture(mockRef, handlers));

    const element = mockRef.current!;

    // Simulate touch start
    act(() => {
      const touchStart = new Event('touchstart');
      Object.defineProperty(touchStart, 'touches', {
        value: [{ clientX: 100, clientY: 100 }],
        writable: false,
      });
      element.dispatchEvent(touchStart);
    });

    // Simulate small movement (should not trigger swipe)
    act(() => {
      const touchEnd = new Event('touchend');
      Object.defineProperty(touchEnd, 'changedTouches', {
        value: [{ clientX: 105, clientY: 100 }], // Small 5px movement
        writable: false,
      });
      element.dispatchEvent(touchEnd);
    });

    expect(handlers.onSwipeLeft).not.toHaveBeenCalled();
    expect(handlers.onSwipeRight).not.toHaveBeenCalled();
    expect(handlers.onSwipeUp).not.toHaveBeenCalled();
    expect(handlers.onSwipeDown).not.toHaveBeenCalled();
  });

  it('cleans up event listeners on unmount', () => {
    const handlers = {
      onSwipeLeft: jest.fn(),
      onSwipeRight: jest.fn(),
      onSwipeUp: jest.fn(),
      onSwipeDown: jest.fn(),
    };

    const removeEventListenerSpy = jest.spyOn(mockRef.current!, 'removeEventListener');

    const { unmount } = renderHook(() => useSwipeGesture(mockRef, handlers));

    unmount();

    expect(removeEventListenerSpy).toHaveBeenCalledWith('touchstart', expect.any(Function));
    expect(removeEventListenerSpy).toHaveBeenCalledWith('touchend', expect.any(Function));
  });

  it('handles null ref gracefully', () => {
    const handlers = {
      onSwipeLeft: jest.fn(),
      onSwipeRight: jest.fn(),
      onSwipeUp: jest.fn(),
      onSwipeDown: jest.fn(),
    };

    const nullRef = { current: null };

    expect(() => {
      renderHook(() => useSwipeGesture(nullRef, handlers));
    }).not.toThrow();
  });
});