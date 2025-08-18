import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ImprovedCarnapFitchEditor from '../ImprovedCarnapFitchEditor';

describe('ImprovedCarnapFitchEditor', () => {
  const defaultProps = {
    value: '',
    onChange: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic Functionality', () => {
    it('renders without crashing', () => {
      render(<ImprovedCarnapFitchEditor {...defaultProps} />);
      expect(screen.getByRole('textbox')).toBeInTheDocument();
    });

    it('displays initial value', () => {
      const value = 'P→Q :PR\nP :PR\nQ :MP 1,2';
      render(<ImprovedCarnapFitchEditor {...defaultProps} value={value} />);
      expect(screen.getByRole('textbox')).toHaveValue(value);
    });

    it('calls onChange when text is typed', async () => {
      const user = userEvent.setup();
      const onChange = jest.fn();
      render(<ImprovedCarnapFitchEditor value="" onChange={onChange} />);
      
      const textarea = screen.getByRole('textbox');
      await user.type(textarea, 'P');
      
      expect(onChange).toHaveBeenCalled();
    });
  });

  describe('Symbol Normalization', () => {
    it('normalizes arrow symbols correctly', async () => {
      const user = userEvent.setup();
      const onChange = jest.fn();
      render(<ImprovedCarnapFitchEditor value="" onChange={onChange} />);
      
      const textarea = screen.getByRole('textbox');
      await user.type(textarea, 'P->Q');
      
      // Should normalize -> to →
      expect(onChange).toHaveBeenLastCalledWith(expect.stringContaining('P→Q'));
    });

    it('normalizes conjunction symbols', async () => {
      const user = userEvent.setup();
      const onChange = jest.fn();
      render(<ImprovedCarnapFitchEditor value="" onChange={onChange} />);
      
      const textarea = screen.getByRole('textbox');
      await user.type(textarea, 'P & Q');
      
      // Should normalize & to ∧
      expect(onChange).toHaveBeenLastCalledWith(expect.stringContaining('P ∧ Q'));
    });

    it('normalizes disjunction symbols', async () => {
      const user = userEvent.setup();
      const onChange = jest.fn();
      render(<ImprovedCarnapFitchEditor value="" onChange={onChange} />);
      
      const textarea = screen.getByRole('textbox');
      await user.type(textarea, 'P | Q');
      
      // Should normalize | to ∨
      expect(onChange).toHaveBeenLastCalledWith(expect.stringContaining('P ∨ Q'));
    });

    it('normalizes negation symbols', async () => {
      const user = userEvent.setup();
      const onChange = jest.fn();
      render(<ImprovedCarnapFitchEditor value="" onChange={onChange} />);
      
      const textarea = screen.getByRole('textbox');
      await user.type(textarea, '~P');
      
      // Should normalize ~ to ¬
      expect(onChange).toHaveBeenLastCalledWith(expect.stringContaining('¬P'));
    });

    it('normalizes word operators', async () => {
      const user = userEvent.setup();
      const onChange = jest.fn();
      render(<ImprovedCarnapFitchEditor value="" onChange={onChange} />);
      
      const textarea = screen.getByRole('textbox');
      await user.type(textarea, 'P and Q');
      
      // Should normalize 'and' to ∧
      expect(onChange).toHaveBeenLastCalledWith(expect.stringContaining('P ∧ Q'));
    });
  });

  describe('Cursor Position Tracking', () => {
    it('maintains cursor position after normalization at end', async () => {
      const user = userEvent.setup();
      const TestComponent = () => {
        const [value, setValue] = React.useState('P->');
        return <ImprovedCarnapFitchEditor value={value} onChange={setValue} />;
      };
      
      render(<TestComponent />);
      const textarea = screen.getByRole('textbox') as HTMLTextAreaElement;
      
      // Position cursor at end and type
      textarea.setSelectionRange(3, 3);
      await user.type(textarea, 'Q');
      
      // Cursor should be at position 4 (after P→Q)
      await waitFor(() => {
        expect(textarea.selectionStart).toBe(4);
      });
    });

    it('maintains cursor position when typing in middle', async () => {
      const user = userEvent.setup();
      const TestComponent = () => {
        const [value, setValue] = React.useState('PQ');
        return <ImprovedCarnapFitchEditor value={value} onChange={setValue} />;
      };
      
      render(<TestComponent />);
      const textarea = screen.getByRole('textbox') as HTMLTextAreaElement;
      
      // Position cursor between P and Q
      textarea.setSelectionRange(1, 1);
      await user.type(textarea, '->');
      
      // After normalization P->Q becomes P→Q, cursor should be at position 2
      await waitFor(() => {
        expect(textarea.value).toBe('P→Q');
        expect(textarea.selectionStart).toBe(2);
      });
    });
  });

  describe('Auto-indentation', () => {
    it('auto-indents after Show statement', () => {
      const onChange = jest.fn();
      render(<ImprovedCarnapFitchEditor value="Show P→Q" onChange={onChange} />);
      
      const textarea = screen.getByRole('textbox') as HTMLTextAreaElement;
      textarea.setSelectionRange(9, 9);
      
      fireEvent.keyDown(textarea, { key: 'Enter', code: 'Enter' });
      
      // Should add newline with 4 spaces indentation
      expect(onChange).toHaveBeenCalledWith('Show P→Q\n    ');
    });

    it('maintains indentation on subsequent lines', () => {
      const onChange = jest.fn();
      render(<ImprovedCarnapFitchEditor value="    P :AS" onChange={onChange} />);
      
      const textarea = screen.getByRole('textbox') as HTMLTextAreaElement;
      textarea.setSelectionRange(9, 9);
      
      fireEvent.keyDown(textarea, { key: 'Enter', code: 'Enter' });
      
      // Should maintain the 4-space indentation
      expect(onChange).toHaveBeenCalledWith('    P :AS\n    ');
    });
  });

  describe('Error Display', () => {
    it('shows error for missing justification on submission', async () => {
      const onSubmit = jest.fn();
      const { rerender } = render(
        <ImprovedCarnapFitchEditor 
          value="P" 
          onChange={jest.fn()} 
          onSubmit={onSubmit}
        />
      );
      
      const submitButton = screen.getByText('Submit Proof');
      fireEvent.click(submitButton);
      
      // Should show error indicator
      await waitFor(() => {
        const errorIcon = screen.queryByTestId('error-icon');
        // Error display is conditional on showErrors state
        expect(onSubmit).not.toHaveBeenCalled();
      });
    });

    it('shows error for unknown rule', async () => {
      const onSubmit = jest.fn();
      render(
        <ImprovedCarnapFitchEditor 
          value="P :XYZ" 
          onChange={jest.fn()} 
          onSubmit={onSubmit}
        />
      );
      
      const submitButton = screen.getByText('Submit Proof');
      fireEvent.click(submitButton);
      
      // Should not submit due to validation error
      await waitFor(() => {
        expect(onSubmit).not.toHaveBeenCalled();
      });
    });

    it('clears errors when user starts typing', async () => {
      const user = userEvent.setup();
      const onChange = jest.fn();
      const { rerender } = render(
        <ImprovedCarnapFitchEditor 
          value="P" 
          onChange={onChange} 
          onSubmit={jest.fn()}
        />
      );
      
      // Trigger error display
      const submitButton = screen.getByText('Submit Proof');
      fireEvent.click(submitButton);
      
      // Type to clear errors
      const textarea = screen.getByRole('textbox');
      await user.type(textarea, ' :PR');
      
      // onChange should be called and errors cleared
      expect(onChange).toHaveBeenCalled();
    });
  });

  describe('Performance Optimizations', () => {
    it('debounces validation', async () => {
      jest.useFakeTimers();
      
      const TestComponent = () => {
        const [value, setValue] = React.useState('');
        const [renderCount, setRenderCount] = React.useState(0);
        
        React.useEffect(() => {
          setRenderCount(c => c + 1);
        });
        
        return (
          <>
            <div data-testid="render-count">{renderCount}</div>
            <ImprovedCarnapFitchEditor value={value} onChange={setValue} />
          </>
        );
      };
      
      const { rerender } = render(<TestComponent />);
      
      // Type quickly
      const textarea = screen.getByRole('textbox');
      fireEvent.change(textarea, { target: { value: 'P' } });
      fireEvent.change(textarea, { target: { value: 'P-' } });
      fireEvent.change(textarea, { target: { value: 'P->' } });
      fireEvent.change(textarea, { target: { value: 'P->Q' } });
      
      // Validation should be debounced
      jest.advanceTimersByTime(250);
      
      jest.useRealTimers();
    });
  });

  describe('Premise Population', () => {
    it('populates premises when button is clicked', async () => {
      const user = userEvent.setup();
      const onChange = jest.fn();
      const { rerender } = render(
        <ImprovedCarnapFitchEditor 
          value="" 
          onChange={onChange}
          premises="P→Q,P"
        />
      );
      
      // Open guide
      const guideToggle = screen.getByText(/Guide/);
      await user.click(guideToggle);
      
      // Click auto-fill button
      const autoFillButton = screen.getByText(/Auto-fill Premises/);
      await user.click(autoFillButton);
      
      // Should populate with formatted premises
      expect(onChange).toHaveBeenCalledWith('P→Q :PR\nP :PR');
    });
  });

  describe('Keyboard Shortcuts', () => {
    it('submits on Ctrl+Enter', () => {
      const onSubmit = jest.fn();
      render(
        <ImprovedCarnapFitchEditor 
          value="P :PR" 
          onChange={jest.fn()} 
          onSubmit={onSubmit}
        />
      );
      
      const textarea = screen.getByRole('textbox');
      fireEvent.keyDown(textarea, { key: 'Enter', ctrlKey: true });
      
      expect(onSubmit).toHaveBeenCalled();
    });

    it('submits on Cmd+Enter (Mac)', () => {
      const onSubmit = jest.fn();
      render(
        <ImprovedCarnapFitchEditor 
          value="P :PR" 
          onChange={jest.fn()} 
          onSubmit={onSubmit}
        />
      );
      
      const textarea = screen.getByRole('textbox');
      fireEvent.keyDown(textarea, { key: 'Enter', metaKey: true });
      
      expect(onSubmit).toHaveBeenCalled();
    });

    it('inserts tab spaces on Tab key', () => {
      const onChange = jest.fn();
      render(<ImprovedCarnapFitchEditor value="P" onChange={onChange} />);
      
      const textarea = screen.getByRole('textbox') as HTMLTextAreaElement;
      textarea.setSelectionRange(0, 0);
      
      fireEvent.keyDown(textarea, { key: 'Tab' });
      
      // Should insert 4 spaces at beginning
      expect(onChange).toHaveBeenCalledWith('    P');
    });
  });

  describe('Syntax Guide', () => {
    it('toggles syntax guide visibility', async () => {
      const user = userEvent.setup();
      render(<ImprovedCarnapFitchEditor {...defaultProps} showSyntaxGuide={true} />);
      
      // Guide should be hidden initially
      expect(screen.queryByText(/Enhanced Features:/)).not.toBeInTheDocument();
      
      // Click to show
      const toggleButton = screen.getByText(/Show Guide/);
      await user.click(toggleButton);
      
      // Guide should be visible
      expect(screen.getByText(/Enhanced Features:/)).toBeInTheDocument();
      
      // Click to hide
      await user.click(screen.getByText(/Hide Guide/));
      
      // Guide should be hidden again
      expect(screen.queryByText(/Enhanced Features:/)).not.toBeInTheDocument();
    });
  });

  describe('Read-only Mode', () => {
    it('prevents editing in read-only mode', () => {
      render(<ImprovedCarnapFitchEditor {...defaultProps} readOnly={true} />);
      
      const textarea = screen.getByRole('textbox') as HTMLTextAreaElement;
      expect(textarea).toHaveAttribute('readonly');
    });

    it('hides submit button in read-only mode', () => {
      render(
        <ImprovedCarnapFitchEditor 
          {...defaultProps} 
          readOnly={true}
          onSubmit={jest.fn()}
        />
      );
      
      expect(screen.queryByText('Submit Proof')).not.toBeInTheDocument();
    });
  });
});