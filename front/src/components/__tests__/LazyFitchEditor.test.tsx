import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { act } from 'react-dom/test-utils';
import LazyFitchEditor from '../LazyFitchEditor';

// Mock next/dynamic
jest.mock('next/dynamic', () => ({
  __esModule: true,
  default: (loadComponent: () => Promise<any>, options?: any) => {
    // Create a component that simulates dynamic loading
    const DynamicComponent = (props: any) => {
      const [Component, setComponent] = React.useState<any>(null);
      const [isLoading, setIsLoading] = React.useState(true);

      React.useEffect(() => {
        // Simulate async loading
        const timer = setTimeout(() => {
          // Mock the actual FitchEditor component
          const MockedFitchEditor = ({ value, onChange, onSubmit, readOnly, height, theme }: any) => (
            <div data-testid="fitch-editor">
              <textarea
                data-testid="editor-textarea"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                readOnly={readOnly}
                style={{ height }}
              />
              {!readOnly && (
                <div>
                  <button data-testid="format-button">Format</button>
                  {onSubmit && <button data-testid="submit-button" onClick={onSubmit}>Submit</button>}
                </div>
              )}
            </div>
          );
          MockedFitchEditor.displayName = 'MockedFitchEditor';
          
          setComponent(() => MockedFitchEditor);
          setIsLoading(false);
        }, 100);

        return () => clearTimeout(timer);
      }, []);

      if (isLoading && options?.loading) {
        const LoadingComponent = options.loading;
        return <LoadingComponent />;
      }

      return Component ? <Component {...props} /> : null;
    };

    DynamicComponent.displayName = 'DynamicComponent';
    return DynamicComponent;
  },
}));

describe('LazyFitchEditor', () => {
  const defaultProps = {
    value: 'test proof',
    onChange: jest.fn(),
    onSubmit: jest.fn(),
    readOnly: false,
    height: '400px',
    theme: 'light' as const,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should show loading skeleton initially', () => {
    render(<LazyFitchEditor {...defaultProps} />);
    
    // Check for skeleton elements
    expect(screen.getByTestId(/border.*animate-pulse/i)).toBeInTheDocument();
    expect(screen.queryByTestId('fitch-editor')).not.toBeInTheDocument();
  });

  it('should load and display the editor after loading', async () => {
    render(<LazyFitchEditor {...defaultProps} />);
    
    // Wait for the editor to load
    await waitFor(() => {
      expect(screen.getByTestId('fitch-editor')).toBeInTheDocument();
    }, { timeout: 200 });
    
    // Check that skeleton is gone
    expect(screen.queryByTestId(/animate-pulse/i)).not.toBeInTheDocument();
  });

  it('should pass all props to the loaded editor', async () => {
    const { rerender } = render(<LazyFitchEditor {...defaultProps} />);
    
    await waitFor(() => {
      expect(screen.getByTestId('fitch-editor')).toBeInTheDocument();
    });
    
    const textarea = screen.getByTestId('editor-textarea') as HTMLTextAreaElement;
    expect(textarea.value).toBe('test proof');
    expect(textarea.readOnly).toBe(false);
    expect(textarea.style.height).toBe('400px');
  });

  it('should handle readOnly mode correctly', async () => {
    render(<LazyFitchEditor {...defaultProps} readOnly={true} />);
    
    await waitFor(() => {
      expect(screen.getByTestId('fitch-editor')).toBeInTheDocument();
    });
    
    const textarea = screen.getByTestId('editor-textarea') as HTMLTextAreaElement;
    expect(textarea.readOnly).toBe(true);
    expect(screen.queryByTestId('format-button')).not.toBeInTheDocument();
    expect(screen.queryByTestId('submit-button')).not.toBeInTheDocument();
  });

  it('should show submit button when onSubmit is provided', async () => {
    render(<LazyFitchEditor {...defaultProps} />);
    
    await waitFor(() => {
      expect(screen.getByTestId('fitch-editor')).toBeInTheDocument();
    });
    
    expect(screen.getByTestId('submit-button')).toBeInTheDocument();
  });

  it('should not show submit button when onSubmit is not provided', async () => {
    const propsWithoutSubmit = { ...defaultProps, onSubmit: undefined };
    render(<LazyFitchEditor {...propsWithoutSubmit} />);
    
    await waitFor(() => {
      expect(screen.getByTestId('fitch-editor')).toBeInTheDocument();
    });
    
    expect(screen.queryByTestId('submit-button')).not.toBeInTheDocument();
  });

  it('should handle onChange events', async () => {
    render(<LazyFitchEditor {...defaultProps} />);
    
    await waitFor(() => {
      expect(screen.getByTestId('fitch-editor')).toBeInTheDocument();
    });
    
    const textarea = screen.getByTestId('editor-textarea') as HTMLTextAreaElement;
    
    act(() => {
      textarea.value = 'new value';
      textarea.dispatchEvent(new Event('change', { bubbles: true }));
    });
    
    expect(defaultProps.onChange).toHaveBeenCalledWith('new value');
  });

  it('should handle onSubmit events', async () => {
    render(<LazyFitchEditor {...defaultProps} />);
    
    await waitFor(() => {
      expect(screen.getByTestId('fitch-editor')).toBeInTheDocument();
    });
    
    const submitButton = screen.getByTestId('submit-button');
    
    act(() => {
      submitButton.click();
    });
    
    expect(defaultProps.onSubmit).toHaveBeenCalled();
  });

  it('should render loading skeleton with correct styling', () => {
    render(<LazyFitchEditor {...defaultProps} />);
    
    const skeleton = screen.getByTestId(/border.*animate-pulse/i);
    expect(skeleton).toHaveClass('border', 'border-gray-300', 'dark:border-gray-700', 'rounded-lg', 'overflow-hidden', 'animate-pulse');
  });

  it('should handle component unmounting during loading', () => {
    const { unmount } = render(<LazyFitchEditor {...defaultProps} />);
    
    // Unmount while still loading
    expect(() => unmount()).not.toThrow();
  });
});