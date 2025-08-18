'use client';

import { useState } from 'react';
import ImprovedCarnapFitchEditor from '@/components/ImprovedCarnapFitchEditor';

export default function TestProofEditor() {
  const [proof, setProof] = useState('');
  const [validationResult, setValidationResult] = useState<any>(null);

  const testPuzzle = {
    id: 1,
    premises: ['P→Q', 'P'],
    conclusion: 'Q',
    difficulty: 1,
    category: 'test'
  };

  const handleSubmit = () => {
    console.log('Submitted proof:', proof);
    // For testing, just show what was submitted
    setValidationResult({
      submitted: proof,
      timestamp: new Date().toISOString()
    });
  };

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <h1 className="text-2xl font-bold mb-4">Test Proof Editor</h1>
      
      <div className="mb-4 p-4 bg-gray-100 dark:bg-gray-800 rounded">
        <h2 className="font-semibold mb-2">Test Puzzle:</h2>
        <p>Premises: {testPuzzle.premises.join(', ')}</p>
        <p>Conclusion: {testPuzzle.conclusion}</p>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          Try typing: P→Q :PR, then Enter for new line, P :PR, then Enter, Q :MP 1,2
        </p>
      </div>

      <ImprovedCarnapFitchEditor
        premises={testPuzzle.premises.join(', ')}
        onSubmit={handleSubmit}
        onChange={setProof}
        value={proof}
        showSyntaxGuide={true}
      />

      {validationResult && (
        <div className="mt-4 p-4 bg-green-100 dark:bg-green-900 rounded">
          <h3 className="font-semibold mb-2">Submission Result:</h3>
          <pre className="text-sm">{JSON.stringify(validationResult, null, 2)}</pre>
        </div>
      )}

      <div className="mt-8 p-4 bg-blue-100 dark:bg-blue-900 rounded">
        <h3 className="font-semibold mb-2">Features to Test:</h3>
        <ul className="list-disc list-inside text-sm space-y-1">
          <li>Symbol normalization: Type -{'>'} and see it convert to →</li>
          <li>Cursor position: Should stay in place after normalization</li>
          <li>Real-time validation: Errors should appear with debouncing</li>
          <li>Line-specific error messages</li>
          <li>Syntax highlighting for rules and line numbers</li>
        </ul>
      </div>
    </div>
  );
}