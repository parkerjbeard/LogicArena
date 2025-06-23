import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { act } from 'react-dom/test-utils';
import LazyCarnapFitchEditor from '../LazyCarnapFitchEditor';

// Mock next/dynamic
jest.mock('next/dynamic', () => ({
  __esModule: true,
  default: (loadComponent: () => Promise<any>, options?: any) => {
    const DynamicComponent = (props: any) => {
      const [Component, setComponent] = React.useState<any>(null);
      const [isLoading, setIsLoading] = React.useState(true);

      React.useEffect(() => {
        const timer = setTimeout(() => {
          // Mock the actual CarnapFitchEditor component
          const MockedCarnapFitchEditor = ({ 
            value, 
            onChange, 
            onSubmit, 
            readOnly, 
            height, 
            theme,
            showSyntaxGuide 
          }: any) => (
            <div data-testid="carnap-fitch-editor" className="carnap-fitch-editor-container">
              {showSyntaxGuide && (
                <div data-testid="syntax-guide-header" className="bg-gray-800/50">
                  <span>Carnap-Compatible Fitch Notation</span>
                  <button data-testid="toggle-guide">Show Syntax Guide</button>
                </div>
              )}
              <textarea
                data-testid="editor-textarea"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                readOnly={readOnly}
                style={{ height }}
              />
              {!readOnly && (
                <div>
                  <span>Press Tab for indentation • Ctrl+Enter to submit</span>
                  {onSubmit && <button data-testid="submit-button" onClick={onSubmit}>Submit Proof</button>}
                </div>
              )}
            </div>
          );
          MockedCarnapFitchEditor.displayName = 'MockedCarnapFitchEditor';
          
          setComponent(() => MockedCarnapFitchEditor);
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

// Mock lucide-react
jest.mock('lucide-react', () => ({
  InfoIcon: ({ className }: { className: string }) => (
    <div data-testid="info-icon" className={className}>InfoIcon</div>
  ),
}));

describe('LazyCarnapFitchEditor', () => {
  const defaultProps = {
    value: 'Show P→Q\n    P    :AS\n    Q    :MP 1,2\n:CD 2-3',
    onChange: jest.fn(),
    onSubmit: jest.fn(),
    readOnly: false,
    height: '400px',
    theme: 'dark' as const,
    showSyntaxGuide: true,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should show loading skeleton initially with Carnap-specific styling', () => {
    render(<LazyCarnapFitchEditor {...defaultProps} />);
    
    // Check for Carnap-specific skeleton elements
    const container = screen.getByTestId(/carnap-fitch-editor-container/i);
    expect(container).toBeInTheDocument();
    
    // Should show the syntax guide header in skeleton
    expect(screen.getByTestId('info-icon')).toBeInTheDocument();
    expect(screen.getByText('Carnap-Compatible Fitch Notation')).toBeInTheDocument();
    
    // Should have animate-pulse loading indicators
    const pulsingElements = screen.getAllByTestId(/animate-pulse/i);
    expect(pulsingElements.length).toBeGreaterThan(0);
  });

  it('should load and display the Carnap editor after loading', async () => {
    render(<LazyCarnapFitchEditor {...defaultProps} />);
    
    await waitFor(() => {
      expect(screen.getByTestId('carnap-fitch-editor')).toBeInTheDocument();
    }, { timeout: 200 });
    
    // Check that loading skeleton is gone
    expect(screen.queryByTestId(/animate-pulse/i)).not.toBeInTheDocument();
  });

  it('should display syntax guide when showSyntaxGuide is true', async () => {
    render(<LazyCarnapFitchEditor {...defaultProps} showSyntaxGuide={true} />);
    
    await waitFor(() => {
      expect(screen.getByTestId('carnap-fitch-editor')).toBeInTheDocument();
    });
    
    expect(screen.getByTestId('syntax-guide-header')).toBeInTheDocument();
    expect(screen.getByText('Carnap-Compatible Fitch Notation')).toBeInTheDocument();
    expect(screen.getByTestId('toggle-guide')).toBeInTheDocument();
  });

  it('should not display syntax guide when showSyntaxGuide is false', async () => {
    render(<LazyCarnapFitchEditor {...defaultProps} showSyntaxGuide={false} />);
    
    await waitFor(() => {
      expect(screen.getByTestId('carnap-fitch-editor')).toBeInTheDocument();
    });
    
    expect(screen.queryByTestId('syntax-guide-header')).not.toBeInTheDocument();
  });

  it('should handle Carnap-specific proof notation', async () => {
    const carnapProof = 'Show P→Q\n    P    :AS\n    Q    :MP 1,2\n:CD 2-3';
    render(<LazyCarnapFitchEditor {...defaultProps} value={carnapProof} />);
    
    await waitFor(() => {
      expect(screen.getByTestId('carnap-fitch-editor')).toBeInTheDocument();
    });
    
    const textarea = screen.getByTestId('editor-textarea') as HTMLTextAreaElement;
    expect(textarea.value).toBe(carnapProof);
  });

  it('should show keyboard shortcuts hint in edit mode', async () => {
    render(<LazyCarnapFitchEditor {...defaultProps} readOnly={false} />);
    
    await waitFor(() => {
      expect(screen.getByTestId('carnap-fitch-editor')).toBeInTheDocument();
    });
    
    expect(screen.getByText('Press Tab for indentation • Ctrl+Enter to submit')).toBeInTheDocument();
  });

  it('should not show keyboard shortcuts in readonly mode', async () => {
    render(<LazyCarnapFitchEditor {...defaultProps} readOnly={true} />);
    
    await waitFor(() => {
      expect(screen.getByTestId('carnap-fitch-editor')).toBeInTheDocument();
    });
    
    expect(screen.queryByText('Press Tab for indentation • Ctrl+Enter to submit')).not.toBeInTheDocument();
  });

  it('should render with dark theme styling in loading state', () => {
    render(<LazyCarnapFitchEditor {...defaultProps} theme="dark" />);
    
    // Check for dark theme classes in skeleton
    const darkElements = screen.getAllByTestId(/bg-gray-800|bg-gray-700/i);
    expect(darkElements.length).toBeGreaterThan(0);
  });

  it('should have correct loading skeleton structure', () => {
    render(<LazyCarnapFitchEditor {...defaultProps} />);
    
    // Should have header section
    const header = screen.getByTestId(/bg-gray-800\/50.*border.*rounded-t-lg/i);
    expect(header).toBeInTheDocument();
    
    // Should have main editor section
    const editorSection = screen.getByTestId(/border.*rounded-b-lg.*animate-pulse/i);
    expect(editorSection).toBeInTheDocument();
  });

  it('should handle all props correctly after loading', async () => {
    const customProps = {
      ...defaultProps,
      height: '600px',
      theme: 'light' as const,
      showSyntaxGuide: false,
    };
    
    render(<LazyCarnapFitchEditor {...customProps} />);
    
    await waitFor(() => {
      expect(screen.getByTestId('carnap-fitch-editor')).toBeInTheDocument();
    });
    
    const textarea = screen.getByTestId('editor-textarea') as HTMLTextAreaElement;
    expect(textarea.style.height).toBe('600px');
    expect(screen.queryByTestId('syntax-guide-header')).not.toBeInTheDocument();
  });

  it('should call onChange with Carnap notation', async () => {
    render(<LazyCarnapFitchEditor {...defaultProps} />);
    
    await waitFor(() => {
      expect(screen.getByTestId('carnap-fitch-editor')).toBeInTheDocument();
    });
    
    const textarea = screen.getByTestId('editor-textarea');
    const newProof = 'P :PR\nQ :PR\nP&Q :&I 1,2';
    
    act(() => {
      (textarea as HTMLTextAreaElement).value = newProof;
      textarea.dispatchEvent(new Event('change', { bubbles: true }));
    });
    
    expect(defaultProps.onChange).toHaveBeenCalledWith(newProof);
  });
});