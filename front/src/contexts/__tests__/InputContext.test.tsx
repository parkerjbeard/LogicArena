import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { InputProvider, useInput } from '../InputContext';

// Mock window.matchMedia
const mockMatchMedia = jest.fn();
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: mockMatchMedia,
});

// Mock navigator.maxTouchPoints - define it as configurable
if (!Object.getOwnPropertyDescriptor(navigator, 'maxTouchPoints')?.configurable) {
  // If it's not configurable, we need to delete and redefine it
  delete (navigator as any).maxTouchPoints;
}
Object.defineProperty(navigator, 'maxTouchPoints', {
  writable: true,
  configurable: true,
  value: 0,
});

// Test component to use the context
function TestComponent() {
  const { inputMethod, deviceType, isTouchDevice, isHoverSupported } = useInput();
  
  return (
    <div>
      <div data-testid="input-method">{inputMethod}</div>
      <div data-testid="device-type">{deviceType}</div>
      <div data-testid="is-touch-device">{isTouchDevice.toString()}</div>
      <div data-testid="is-hover-supported">{isHoverSupported.toString()}</div>
    </div>
  );
}

describe('InputContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockMatchMedia.mockReturnValue({
      matches: false,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    });
    // Reset window dimensions to desktop
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1024,
    });
    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: 768,
    });
    // Reset navigator.maxTouchPoints to 0 (no touch)
    (navigator as any).maxTouchPoints = 0;
  });

  it('provides default values', () => {
    // Mock desktop environment
    mockMatchMedia.mockImplementation((query) => {
      if (query === '(pointer: fine)') {
        return {
          matches: true,
          addEventListener: jest.fn(),
          removeEventListener: jest.fn(),
        };
      }
      if (query === '(hover: hover)') {
        return {
          matches: true,
          addEventListener: jest.fn(),
          removeEventListener: jest.fn(),
        };
      }
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

    render(
      <InputProvider>
        <TestComponent />
      </InputProvider>
    );

    expect(screen.getByTestId('input-method')).toHaveTextContent('mouse');
    expect(screen.getByTestId('device-type')).toHaveTextContent('desktop');
    expect(screen.getByTestId('is-touch-device')).toHaveTextContent('false');
    expect(screen.getByTestId('is-hover-supported')).toHaveTextContent('true');
  });

  it('detects touch input correctly', () => {
    // Mock touch device
    (navigator as any).maxTouchPoints = 1;
    // Set mobile window size
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 375,
    });

    mockMatchMedia.mockImplementation((query) => {
      if (query === '(pointer: coarse)') {
        return {
          matches: true,
          addEventListener: jest.fn(),
          removeEventListener: jest.fn(),
        };
      }
      if (query === '(hover: none)') {
        return {
          matches: true,
          addEventListener: jest.fn(),
          removeEventListener: jest.fn(),
        };
      }
      if (query === '(max-width: 767px)') {
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

    render(
      <InputProvider>
        <TestComponent />
      </InputProvider>
    );

    expect(screen.getByTestId('input-method')).toHaveTextContent('touch');
    expect(screen.getByTestId('device-type')).toHaveTextContent('mobile');
    expect(screen.getByTestId('is-touch-device')).toHaveTextContent('true');
    expect(screen.getByTestId('is-hover-supported')).toHaveTextContent('false');
  });

  it('detects tablet device correctly', () => {
    // Mock tablet with touch
    (navigator as any).maxTouchPoints = 1;
    // Set tablet window size (768 <= width < 1024)
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 900,
    });
    
    mockMatchMedia.mockImplementation((query) => {
      if (query === '(pointer: coarse)') {
        return {
          matches: true,
          addEventListener: jest.fn(),
          removeEventListener: jest.fn(),
        };
      }
      if (query === '(min-width: 768px) and (max-width: 1023px)') {
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

    render(
      <InputProvider>
        <TestComponent />
      </InputProvider>
    );

    expect(screen.getByTestId('device-type')).toHaveTextContent('tablet');
    expect(screen.getByTestId('input-method')).toHaveTextContent('touch');
  });

  it('detects hybrid input correctly', () => {
    // Mock hybrid device (has both touch and mouse)
    (navigator as any).maxTouchPoints = 1;

    mockMatchMedia.mockImplementation((query) => {
      if (query === '(pointer: fine)') {
        return {
          matches: true,
          addEventListener: jest.fn(),
          removeEventListener: jest.fn(),
        };
      }
      if (query === '(hover: hover)') {
        return {
          matches: true,
          addEventListener: jest.fn(),
          removeEventListener: jest.fn(),
        };
      }
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

    render(
      <InputProvider>
        <TestComponent />
      </InputProvider>
    );

    expect(screen.getByTestId('input-method')).toHaveTextContent('hybrid');
    expect(screen.getByTestId('device-type')).toHaveTextContent('desktop');
    expect(screen.getByTestId('is-touch-device')).toHaveTextContent('true');
    expect(screen.getByTestId('is-hover-supported')).toHaveTextContent('true');
  });

  it('updates input method on media query changes', () => {
    const mockAddEventListener = jest.fn();
    const mockRemoveEventListener = jest.fn();

    mockMatchMedia.mockImplementation((query) => {
      if (query === '(pointer: fine)') {
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

    render(
      <InputProvider>
        <TestComponent />
      </InputProvider>
    );

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

    const { unmount } = render(
      <InputProvider>
        <TestComponent />
      </InputProvider>
    );

    unmount();

    expect(mockRemoveEventListener).toHaveBeenCalledWith('change', expect.any(Function));
  });

  it.skip('handles touch events to detect touch input', async () => {
    // Start with desktop environment (fine pointer, hover support)
    mockMatchMedia.mockImplementation((query) => {
      if (query === '(pointer: fine)') {
        return {
          matches: true,
          addEventListener: jest.fn(),
          removeEventListener: jest.fn(),
        };
      }
      if (query === '(hover: hover)') {
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

    const { rerender } = render(
      <InputProvider>
        <TestComponent />
      </InputProvider>
    );

    // Initially should be mouse (has hover and fine pointer)
    expect(screen.getByTestId('input-method')).toHaveTextContent('mouse');

    // Simulate touch event
    await act(async () => {
      const touchEvent = new Event('touchstart', { bubbles: true });
      window.dispatchEvent(touchEvent);
    });

    // Force a re-render to see the state update
    rerender(
      <InputProvider>
        <TestComponent />
      </InputProvider>
    );

    // Should update to hybrid (the touch handler sets it to hybrid when inputMethod is 'mouse')
    expect(screen.getByTestId('input-method')).toHaveTextContent('hybrid');
  });

  it.skip('handles mouse events to detect mouse input', async () => {
    // Start with touch device (has touch but no hover)
    (navigator as any).maxTouchPoints = 1;

    mockMatchMedia.mockImplementation((query) => {
      if (query === '(hover: hover)') {
        return {
          matches: false, // No hover support
          addEventListener: jest.fn(),
          removeEventListener: jest.fn(),
        };
      }
      if (query === '(pointer: coarse)') {
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

    const { rerender } = render(
      <InputProvider>
        <TestComponent />
      </InputProvider>
    );

    // Initially should be touch (has touch, no hover)
    expect(screen.getByTestId('input-method')).toHaveTextContent('touch');

    // Wait more than 500ms to ensure we're past the touch debounce time
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 600));
    });

    // Simulate mouse event
    await act(async () => {
      const mouseEvent = new MouseEvent('mousemove', { bubbles: true });
      window.dispatchEvent(mouseEvent);
    });

    // Force a re-render to see the state update
    rerender(
      <InputProvider>
        <TestComponent />
      </InputProvider>
    );

    // Should update to hybrid (the mouse handler sets it to hybrid when inputMethod is 'touch' and enough time has passed)
    expect(screen.getByTestId('input-method')).toHaveTextContent('hybrid');
  });

  it('returns default values when useInput is used outside provider', () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    render(<TestComponent />);
    
    // Should use default values
    expect(screen.getByTestId('input-method')).toHaveTextContent('mouse');
    expect(screen.getByTestId('device-type')).toHaveTextContent('desktop');
    expect(screen.getByTestId('is-touch-device')).toHaveTextContent('false');
    expect(screen.getByTestId('is-hover-supported')).toHaveTextContent('true');

    consoleSpy.mockRestore();
  });

  it('correctly identifies device types based on screen size', () => {
    // Test mobile
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 375,
    });
    
    mockMatchMedia.mockImplementation((query) => {
      if (query === '(max-width: 767px)') {
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

    render(
      <InputProvider>
        <TestComponent />
      </InputProvider>
    );

    expect(screen.getByTestId('device-type')).toHaveTextContent('mobile');
  });

  it('handles window resize events', () => {
    const mockAddEventListener = jest.fn();
    const mockRemoveEventListener = jest.fn();

    jest.spyOn(window, 'addEventListener').mockImplementation(mockAddEventListener);
    jest.spyOn(window, 'removeEventListener').mockImplementation(mockRemoveEventListener);

    render(
      <InputProvider>
        <TestComponent />
      </InputProvider>
    );

    expect(mockAddEventListener).toHaveBeenCalledWith('resize', expect.any(Function));
  });

  it('maintains state consistency across re-renders', () => {
    mockMatchMedia.mockImplementation((query) => {
      if (query === '(pointer: fine)') {
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

    const { rerender } = render(
      <InputProvider>
        <TestComponent />
      </InputProvider>
    );

    expect(screen.getByTestId('input-method')).toHaveTextContent('mouse');

    rerender(
      <InputProvider>
        <TestComponent />
      </InputProvider>
    );

    expect(screen.getByTestId('input-method')).toHaveTextContent('mouse');
  });
});