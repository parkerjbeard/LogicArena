import React from 'react';
import { render, screen, act, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ToastProvider, useToast } from '../ToastContext';

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => <div>{children}</div>,
}));

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  CheckCircle: ({ className }: any) => <div data-testid="check-circle-icon" className={className} />,
  AlertCircle: ({ className }: any) => <div data-testid="alert-circle-icon" className={className} />,
  AlertTriangle: ({ className }: any) => <div data-testid="alert-triangle-icon" className={className} />,
  Info: ({ className }: any) => <div data-testid="info-icon" className={className} />,
  X: ({ className }: any) => <div data-testid="x-icon" className={className} />,
}));

// Test component to use the context
function TestComponent() {
  const { showToast, hideToast } = useToast();
  
  return (
    <div>
      <button onClick={() => showToast('Success message', 'success')}>
        Show Success Toast
      </button>
      <button onClick={() => showToast('Error message', 'error')}>
        Show Error Toast
      </button>
      <button onClick={() => showToast('Warning message', 'warning')}>
        Show Warning Toast
      </button>
      <button onClick={() => showToast('Info message', 'info')}>
        Show Info Toast
      </button>
      <button onClick={() => showToast('Default message')}>
        Show Default Toast
      </button>
      <button onClick={() => hideToast()}>
        Hide Toast
      </button>
    </div>
  );
}

describe('ToastContext', () => {
  const user = userEvent.setup();

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('provides toast functionality', () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    );

    expect(screen.getByText('Show Success Toast')).toBeInTheDocument();
    expect(screen.getByText('Show Error Toast')).toBeInTheDocument();
    expect(screen.getByText('Show Warning Toast')).toBeInTheDocument();
    expect(screen.getByText('Show Info Toast')).toBeInTheDocument();
  });

  it('shows success toast with correct styling', async () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    );

    const successButton = screen.getByText('Show Success Toast');
    await user.click(successButton);

    expect(screen.getByText('Success message')).toBeInTheDocument();
    expect(screen.getByTestId('check-circle-icon')).toBeInTheDocument();

    const toast = screen.getByText('Success message').closest('div');
    expect(toast).toHaveClass('bg-green-800/90');
  });

  it('shows error toast with correct styling', async () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    );

    const errorButton = screen.getByText('Show Error Toast');
    await user.click(errorButton);

    expect(screen.getByText('Error message')).toBeInTheDocument();
    expect(screen.getByTestId('alert-circle-icon')).toBeInTheDocument();

    const toast = screen.getByText('Error message').closest('div');
    expect(toast).toHaveClass('bg-red-800/90');
  });

  it('shows warning toast with correct styling', async () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    );

    const warningButton = screen.getByText('Show Warning Toast');
    await user.click(warningButton);

    expect(screen.getByText('Warning message')).toBeInTheDocument();
    expect(screen.getByTestId('alert-triangle-icon')).toBeInTheDocument();

    const toast = screen.getByText('Warning message').closest('div');
    expect(toast).toHaveClass('bg-yellow-800/90');
  });

  it('shows info toast with correct styling', async () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    );

    const infoButton = screen.getByText('Show Info Toast');
    await user.click(infoButton);

    expect(screen.getByText('Info message')).toBeInTheDocument();
    expect(screen.getByTestId('info-icon')).toBeInTheDocument();

    const toast = screen.getByText('Info message').closest('div');
    expect(toast).toHaveClass('bg-blue-800/90');
  });

  it('shows default toast with correct styling', async () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    );

    const defaultButton = screen.getByText('Show Default Toast');
    await user.click(defaultButton);

    expect(screen.getByText('Default message')).toBeInTheDocument();
    expect(screen.getByTestId('info-icon')).toBeInTheDocument();

    const toast = screen.getByText('Default message').closest('div');
    expect(toast).toHaveClass('bg-gray-800/90');
  });

  it('renders close button on toast', async () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    );

    const successButton = screen.getByText('Show Success Toast');
    await user.click(successButton);

    expect(screen.getByTestId('x-icon')).toBeInTheDocument();
  });

  it('closes toast when close button is clicked', async () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    );

    const successButton = screen.getByText('Show Success Toast');
    await user.click(successButton);

    expect(screen.getByText('Success message')).toBeInTheDocument();

    const closeButton = screen.getByTestId('x-icon').closest('button');
    await user.click(closeButton!);

    expect(screen.queryByText('Success message')).not.toBeInTheDocument();
  });

  it('closes toast when hideToast is called', async () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    );

    const successButton = screen.getByText('Show Success Toast');
    await user.click(successButton);

    expect(screen.getByText('Success message')).toBeInTheDocument();

    const hideButton = screen.getByText('Hide Toast');
    await user.click(hideButton);

    expect(screen.queryByText('Success message')).not.toBeInTheDocument();
  });

  it('auto-hides toast after timeout', async () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    );

    const successButton = screen.getByText('Show Success Toast');
    await user.click(successButton);

    expect(screen.getByText('Success message')).toBeInTheDocument();

    // Fast-forward time to trigger auto-hide
    act(() => {
      jest.advanceTimersByTime(5000);
    });

    await waitFor(() => {
      expect(screen.queryByText('Success message')).not.toBeInTheDocument();
    });
  });

  it('replaces existing toast with new one', async () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    );

    const successButton = screen.getByText('Show Success Toast');
    await user.click(successButton);

    expect(screen.getByText('Success message')).toBeInTheDocument();

    const errorButton = screen.getByText('Show Error Toast');
    await user.click(errorButton);

    expect(screen.queryByText('Success message')).not.toBeInTheDocument();
    expect(screen.getByText('Error message')).toBeInTheDocument();
  });

  it('resets timeout when new toast is shown', async () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    );

    const successButton = screen.getByText('Show Success Toast');
    await user.click(successButton);

    // Advance time partially
    act(() => {
      jest.advanceTimersByTime(3000);
    });

    // Show new toast
    const errorButton = screen.getByText('Show Error Toast');
    await user.click(errorButton);

    // Toast should still be visible because timeout was reset
    expect(screen.getByText('Error message')).toBeInTheDocument();

    // Advance time to complete timeout
    act(() => {
      jest.advanceTimersByTime(5000);
    });

    await waitFor(() => {
      expect(screen.queryByText('Error message')).not.toBeInTheDocument();
    });
  });

  it('handles rapid toast showing/hiding', async () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    );

    const successButton = screen.getByText('Show Success Toast');
    const hideButton = screen.getByText('Hide Toast');

    // Show and hide rapidly
    await user.click(successButton);
    await user.click(hideButton);
    await user.click(successButton);

    expect(screen.getByText('Success message')).toBeInTheDocument();
  });

  it('applies correct positioning classes', async () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    );

    const successButton = screen.getByText('Show Success Toast');
    await user.click(successButton);

    const toastContainer = screen.getByText('Success message').closest('div')?.parentElement;
    expect(toastContainer).toHaveClass('fixed', 'top-4', 'right-4', 'z-50');
  });

  it('applies correct toast styling', async () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    );

    const successButton = screen.getByText('Show Success Toast');
    await user.click(successButton);

    const toast = screen.getByText('Success message').closest('div');
    expect(toast).toHaveClass('backdrop-blur-sm', 'border', 'rounded-lg', 'shadow-lg');
  });

  it('renders toast with proper accessibility attributes', async () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    );

    const successButton = screen.getByText('Show Success Toast');
    await user.click(successButton);

    const toast = screen.getByText('Success message').closest('div');
    expect(toast).toHaveAttribute('role', 'alert');
    expect(toast).toHaveAttribute('aria-live', 'polite');
  });

  it('handles custom duration', async () => {
    function CustomTestComponent() {
      const { showToast } = useToast();
      
      return (
        <button onClick={() => showToast('Custom duration', 'success', 1000)}>
          Show Custom Duration Toast
        </button>
      );
    }

    render(
      <ToastProvider>
        <CustomTestComponent />
      </ToastProvider>
    );

    const button = screen.getByText('Show Custom Duration Toast');
    await user.click(button);

    expect(screen.getByText('Custom duration')).toBeInTheDocument();

    // Fast-forward 1 second
    act(() => {
      jest.advanceTimersByTime(1000);
    });

    await waitFor(() => {
      expect(screen.queryByText('Custom duration')).not.toBeInTheDocument();
    });
  });

  it('prevents timeout when duration is 0', async () => {
    function PersistentTestComponent() {
      const { showToast } = useToast();
      
      return (
        <button onClick={() => showToast('Persistent toast', 'success', 0)}>
          Show Persistent Toast
        </button>
      );
    }

    render(
      <ToastProvider>
        <PersistentTestComponent />
      </ToastProvider>
    );

    const button = screen.getByText('Show Persistent Toast');
    await user.click(button);

    expect(screen.getByText('Persistent toast')).toBeInTheDocument();

    // Fast-forward way past normal timeout
    act(() => {
      jest.advanceTimersByTime(10000);
    });

    // Should still be visible
    expect(screen.getByText('Persistent toast')).toBeInTheDocument();
  });

  it('throws error when useToast is used outside provider', () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => {
      render(<TestComponent />);
    }).toThrow('useToast must be used within a ToastProvider');

    consoleSpy.mockRestore();
  });

  it('cleans up timeouts on unmount', () => {
    const { unmount } = render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    );

    // Should not throw errors
    expect(() => unmount()).not.toThrow();
  });
});