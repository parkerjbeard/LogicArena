import { renderHook, act } from '@testing-library/react';
import { useBreakpoint, useAdaptiveClick, useSwipeGesture } from '../useResponsive';

// Mock window.matchMedia
const mockMatchMedia = jest.fn();
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: mockMatchMedia,
});

// Mock window dimensions
const mockWindowDimensions = {
  innerWidth: 1024,
  innerHeight: 768,
};

Object.defineProperty(window, 'innerWidth', {
  writable: true,
  value: mockWindowDimensions.innerWidth,
});

Object.defineProperty(window, 'innerHeight', {
  writable: true,
  value: mockWindowDimensions.innerHeight,
});

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
    // Mock desktop breakpoint
    mockMatchMedia.mockImplementation((query) => {
      if (query === '(min-width: 1024px)') {
        return {
          matches: true,
          addEventListener: jest.fn(),
          removeEventListener: jest.fn(),
        };
      }
      return {
        matches: false,
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
      };
    });

    const { result } = renderHook(() => useBreakpoint());

    expect(result.current.breakpoint).toBe('lg');
    expect(result.current.isDesktop).toBe(true);
    expect(result.current.isTablet).toBe(false);
    expect(result.current.isMobile).toBe(false);
  });

  it('returns tablet breakpoint for medium screens', () => {
    // Mock tablet breakpoint
    mockMatchMedia.mockImplementation((query) => {
      if (query === '(min-width: 768px)') {
        return {
          matches: true,
          addEventListener: jest.fn(),
          removeEventListener: jest.fn(),
        };
      }
      return {
        matches: false,
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
      };
    });

    const { result } = renderHook(() => useBreakpoint());

    expect(result.current.breakpoint).toBe('md');
    expect(result.current.isDesktop).toBe(false);
    expect(result.current.isTablet).toBe(true);
    expect(result.current.isMobile).toBe(false);
  });

  it('returns mobile breakpoint for small screens', () => {
    // Mock mobile breakpoint
    mockMatchMedia.mockImplementation((query) => {
      return {
        matches: false,
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
      };
    });

    const { result } = renderHook(() => useBreakpoint());

    expect(result.current.breakpoint).toBe('sm');
    expect(result.current.isDesktop).toBe(false);
    expect(result.current.isTablet).toBe(false);
    expect(result.current.isMobile).toBe(true);
  });

  it('updates breakpoint when screen size changes', () => {
    const mockAddEventListener = jest.fn();
    const mockRemoveEventListener = jest.fn();

    mockMatchMedia.mockImplementation((query) => {
      if (query === '(min-width: 1024px)') {
        return {
          matches: true,
          addEventListener: mockAddEventListener,
          removeEventListener: mockRemoveEventListener,
        };
      }
      return {
        matches: false,
        addEventListener: mockAddEventListener,
        removeEventListener: mockRemoveEventListener,
      };
    });

    const { result } = renderHook(() => useBreakpoint());

    expect(result.current.breakpoint).toBe('lg');
    expect(mockAddEventListener).toHaveBeenCalledWith('change', expect.any(Function));
  });

  it('cleans up event listeners on unmount', () => {
    const mockAddEventListener = jest.fn();
    const mockRemoveEventListener = jest.fn();

    mockMatchMedia.mockReturnValue({
      matches: false,
      addEventListener: mockAddEventListener,
      removeEventListener: mockRemoveEventListener,
    });

    const { unmount } = renderHook(() => useBreakpoint());

    unmount();

    expect(mockRemoveEventListener).toHaveBeenCalledWith('change', expect.any(Function));
  });
});

describe('useAdaptiveClick', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
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
    expect(result.current.onClick).toBeDefined();
  });

  it('calls onClick on regular click', () => {
    const onClick = jest.fn();
    const onLongPress = jest.fn();

    const { result } = renderHook(() => useAdaptiveClick(onClick, onLongPress));

    act(() => {
      result.current.onClick();
    });

    expect(onClick).toHaveBeenCalled();
    expect(onLongPress).not.toHaveBeenCalled();
  });

  it('calls onLongPress on long press', () => {
    const onClick = jest.fn();
    const onLongPress = jest.fn();

    const { result } = renderHook(() => useAdaptiveClick(onClick, onLongPress));

    act(() => {
      result.current.onMouseDown();
    });

    act(() => {
      jest.advanceTimersByTime(600); // Long press threshold
    });

    expect(onLongPress).toHaveBeenCalled();
    expect(onClick).not.toHaveBeenCalled();
  });

  it('cancels long press on mouse up', () => {
    const onClick = jest.fn();
    const onLongPress = jest.fn();

    const { result } = renderHook(() => useAdaptiveClick(onClick, onLongPress));

    act(() => {
      result.current.onMouseDown();
    });

    act(() => {
      jest.advanceTimersByTime(300); // Before long press threshold
    });

    act(() => {
      result.current.onMouseUp();
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
      result.current.onMouseDown();
    });

    act(() => {
      result.current.onMouseLeave();
    });

    act(() => {
      jest.advanceTimersByTime(600);
    });

    expect(onLongPress).not.toHaveBeenCalled();
  });

  it('handles touch events correctly', () => {
    const onClick = jest.fn();
    const onLongPress = jest.fn();

    const { result } = renderHook(() => useAdaptiveClick(onClick, onLongPress));

    act(() => {
      result.current.onTouchStart();
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
      result.current.onTouchStart();
    });

    act(() => {
      result.current.onTouchEnd();
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
      result.current.onMouseDown();
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
    const touchStart = new TouchEvent('touchstart', {
      touches: [{ clientX: 100, clientY: 100 } as Touch],
    });
    element.dispatchEvent(touchStart);

    // Simulate touch end (swipe left)
    const touchEnd = new TouchEvent('touchend', {
      changedTouches: [{ clientX: 50, clientY: 100 } as Touch],
    });
    element.dispatchEvent(touchEnd);

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
    const touchStart = new TouchEvent('touchstart', {
      touches: [{ clientX: 100, clientY: 100 } as Touch],
    });
    element.dispatchEvent(touchStart);

    // Simulate touch end (swipe right)
    const touchEnd = new TouchEvent('touchend', {
      changedTouches: [{ clientX: 150, clientY: 100 } as Touch],
    });
    element.dispatchEvent(touchEnd);

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
    const touchStart = new TouchEvent('touchstart', {
      touches: [{ clientX: 100, clientY: 100 } as Touch],
    });
    element.dispatchEvent(touchStart);

    // Simulate touch end (swipe up)
    const touchEnd = new TouchEvent('touchend', {
      changedTouches: [{ clientX: 100, clientY: 50 } as Touch],
    });
    element.dispatchEvent(touchEnd);

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
    const touchStart = new TouchEvent('touchstart', {
      touches: [{ clientX: 100, clientY: 100 } as Touch],
    });
    element.dispatchEvent(touchStart);

    // Simulate touch end (swipe down)
    const touchEnd = new TouchEvent('touchend', {
      changedTouches: [{ clientX: 100, clientY: 150 } as Touch],
    });
    element.dispatchEvent(touchEnd);

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
    const touchStart = new TouchEvent('touchstart', {
      touches: [{ clientX: 100, clientY: 100 } as Touch],
    });
    element.dispatchEvent(touchStart);

    // Simulate small movement (should not trigger swipe)
    const touchEnd = new TouchEvent('touchend', {
      changedTouches: [{ clientX: 105, clientY: 100 } as Touch],
    });
    element.dispatchEvent(touchEnd);

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