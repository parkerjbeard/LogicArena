import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { InputProvider, useInput } from '../InputContext';

// Mock window.matchMedia
const mockMatchMedia = jest.fn();
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: mockMatchMedia,
});

// Mock navigator.maxTouchPoints
Object.defineProperty(navigator, 'maxTouchPoints', {
  writable: true,
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
    Object.defineProperty(navigator, 'maxTouchPoints', {
      value: 1,
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
    Object.defineProperty(navigator, 'maxTouchPoints', {
      value: 1,
    });

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

  it('handles touch events to detect touch input', () => {
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

    render(
      <InputProvider>
        <TestComponent />
      </InputProvider>
    );

    // Initially should be mouse
    expect(screen.getByTestId('input-method')).toHaveTextContent('mouse');

    // Simulate touch event
    act(() => {
      const touchEvent = new Event('touchstart');
      document.dispatchEvent(touchEvent);
    });

    // Should update to hybrid (since it has fine pointer + touch)
    expect(screen.getByTestId('input-method')).toHaveTextContent('hybrid');
  });

  it('handles mouse events to detect mouse input', () => {
    // Start with touch device
    Object.defineProperty(navigator, 'maxTouchPoints', {
      value: 1,
    });

    mockMatchMedia.mockImplementation((query) => {
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

    render(
      <InputProvider>
        <TestComponent />
      </InputProvider>
    );

    // Initially should be touch
    expect(screen.getByTestId('input-method')).toHaveTextContent('touch');

    // Simulate mouse event
    act(() => {
      const mouseEvent = new MouseEvent('mousemove');
      document.dispatchEvent(mouseEvent);
    });

    // Should update to hybrid (since it has coarse pointer + mouse)
    expect(screen.getByTestId('input-method')).toHaveTextContent('hybrid');
  });

  it('throws error when useInput is used outside provider', () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => {
      render(<TestComponent />);
    }).toThrow('useInput must be used within an InputProvider');

    consoleSpy.mockRestore();
  });

  it('correctly identifies device types based on screen size', () => {
    // Test mobile
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