import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CarnapFitchEditor from '../CarnapFitchEditor';

describe('CarnapFitchEditor', () => {
  const defaultProps = {
    value: '',
    onChange: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders without crashing', () => {
    render(<CarnapFitchEditor {...defaultProps} />);
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('displays line numbers correctly', () => {
    const multilineValue = 'Line 1\nLine 2\nLine 3';
    render(<CarnapFitchEditor {...defaultProps} value={multilineValue} />);
    
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('handles auto-indentation after show lines', async () => {
    const onChange = jest.fn();
    render(<CarnapFitchEditor {...defaultProps} value="Show P→Q" onChange={onChange} />);
    
    const textarea = screen.getByRole('textbox') as HTMLTextAreaElement;
    
    // Position cursor at end of "Show P→Q"
    textarea.selectionStart = textarea.selectionEnd = 9;
    
    // Press Enter
    fireEvent.keyDown(textarea, { key: 'Enter', code: 'Enter' });
    
    // Should add newline with indentation
    expect(onChange).toHaveBeenCalledWith('Show P→Q\n    ');
  });

  it('handles tab key for indentation', () => {
    const onChange = jest.fn();
    render(<CarnapFitchEditor {...defaultProps} value="Test" onChange={onChange} />);
    
    const textarea = screen.getByRole('textbox');
    
    // Press Tab
    fireEvent.keyDown(textarea, { key: 'Tab', code: 'Tab' });
    
    // Should add 4 spaces at cursor position
    expect(onChange).toHaveBeenCalledWith('    Test');
  });

  it('shows syntax preview when button is clicked', async () => {
    const user = userEvent.setup();
    render(<CarnapFitchEditor {...defaultProps} value="P→Q :PR" showSyntaxGuide={true} />);
    
    // Open syntax guide
    await user.click(screen.getByText(/Show Syntax Guide/i));
    
    // Click syntax colors button
    await user.click(screen.getByText(/Show Syntax Colors/i));
    
    // Should show syntax preview
    expect(screen.getByText('Syntax-highlighted preview:')).toBeInTheDocument();
  });

  it('highlights inference rules correctly in preview', async () => {
    const user = userEvent.setup();
    render(<CarnapFitchEditor {...defaultProps} value="P→Q :PR" showSyntaxGuide={true} />);
    
    // Open syntax guide and preview
    await user.click(screen.getByText(/Show Syntax Guide/i));
    await user.click(screen.getByText(/Show Syntax Colors/i));
    
    // Should show PR with correct color class
    const prElement = screen.getByText('PR');
    expect(prElement).toHaveClass('text-green-400');
  });

  it('preserves cursor position when typing', async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();
    const { rerender } = render(<CarnapFitchEditor {...defaultProps} onChange={onChange} />);
    
    const textarea = screen.getByRole('textbox') as HTMLTextAreaElement;
    
    // Type some text
    await user.type(textarea, 'Test');
    
    // Update component with new value
    rerender(<CarnapFitchEditor value="Test" onChange={onChange} />);
    
    // Cursor should be at end of text
    expect(textarea.selectionStart).toBe(4);
    expect(textarea.selectionEnd).toBe(4);
  });
});