'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, RotateCcw, FastForward } from 'lucide-react';
import { ProofLine } from '@/types/tutorial';

interface AnimatedStep {
  line: ProofLine;
  explanation: string;
  highlightPrevious?: number[];
  duration?: number;
}

interface AnimatedProofConstructionProps {
  steps: AnimatedStep[];
  title?: string;
  onComplete?: () => void;
}

export const AnimatedProofConstruction: React.FC<AnimatedProofConstructionProps> = ({
  steps,
  title,
  onComplete
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [visibleLines, setVisibleLines] = useState<ProofLine[]>([]);
  const [highlightedLines, setHighlightedLines] = useState<number[]>([]);
  const [showExplanation, setShowExplanation] = useState(true);

  const currentStepData = steps[currentStep];
  const progress = ((currentStep + 1) / steps.length) * 100;

  useEffect(() => {
    if (isPlaying && currentStep < steps.length - 1) {
      const timer = setTimeout(() => {
        nextStep();
      }, currentStepData.duration || 3000);

      return () => clearTimeout(timer);
    } else if (isPlaying && currentStep === steps.length - 1) {
      setIsPlaying(false);
      if (onComplete) onComplete();
    }
  }, [isPlaying, currentStep]);

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      const nextStepData = steps[currentStep + 1];
      setVisibleLines([...visibleLines, steps[currentStep].line]);
      setHighlightedLines(nextStepData.highlightPrevious || []);
      setCurrentStep(currentStep + 1);
    }
  };

  const previousStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
      setVisibleLines(visibleLines.slice(0, -1));
      const prevStepData = steps[currentStep - 1];
      setHighlightedLines(prevStepData.highlightPrevious || []);
    }
  };

  const reset = () => {
    setCurrentStep(0);
    setVisibleLines([]);
    setHighlightedLines([]);
    setIsPlaying(false);
  };

  const togglePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const renderLine = (line: ProofLine, index: number) => {
    const isHighlighted = highlightedLines.includes(line.lineNumber);
    const isCurrentLine = currentStep < steps.length && 
                        steps[currentStep].line.lineNumber === line.lineNumber;

    return (
      <motion.div
        key={line.lineNumber}
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 20 }}
        transition={{ duration: 0.5 }}
        className={`
          p-3 rounded-lg border transition-all duration-300
          ${isCurrentLine ? 'bg-blue-100 border-blue-400 shadow-lg' : 
            isHighlighted ? 'bg-yellow-50 border-yellow-300' : 
            'bg-white border-gray-200'}
        `}
        style={{ marginLeft: `${line.depth * 24}px` }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="text-gray-500 font-mono text-sm w-8">
              {line.lineNumber}.
            </span>
            <span className="font-mono text-base">
              {line.formula}
            </span>
          </div>
          <span className="font-mono text-sm text-gray-600">
            {line.justification}
          </span>
        </div>
        
        {isCurrentLine && (
          <motion.div
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            className="h-0.5 bg-blue-500 mt-2 origin-left"
          />
        )}
      </motion.div>
    );
  };

  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-500 to-purple-500 text-white p-4">
        <h3 className="text-lg font-semibold">{title || 'Animated Proof Construction'}</h3>
        <div className="mt-2 bg-white/20 rounded-full h-2 overflow-hidden">
          <motion.div
            className="h-full bg-white"
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {/* Proof area */}
        <div className="bg-gray-50 rounded-lg p-4 min-h-[300px] mb-4">
          <AnimatePresence mode="popLayout">
            {visibleLines.map((line, index) => renderLine(line, index))}
            {currentStep < steps.length && renderLine(currentStepData.line, visibleLines.length)}
          </AnimatePresence>
        </div>

        {/* Explanation */}
        <AnimatePresence>
          {showExplanation && currentStepData && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4"
            >
              <p className="text-sm text-blue-800">
                <strong>Step {currentStep + 1}:</strong> {currentStepData.explanation}
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Controls */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={togglePlayPause}
              className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
            </button>
            
            <button
              onClick={previousStep}
              disabled={currentStep === 0}
              className="p-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <RotateCcw className="w-5 h-5" />
            </button>
            
            <button
              onClick={nextStep}
              disabled={currentStep === steps.length - 1}
              className="p-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <FastForward className="w-5 h-5" />
            </button>
            
            <button
              onClick={reset}
              className="p-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              Reset
            </button>
          </div>

          <button
            onClick={() => setShowExplanation(!showExplanation)}
            className="text-sm text-gray-600 hover:text-gray-800 transition-colors"
          >
            {showExplanation ? 'Hide' : 'Show'} explanations
          </button>
        </div>

        {/* Step indicator */}
        <div className="flex items-center justify-center gap-1 mt-4">
          {steps.map((_, index) => (
            <div
              key={index}
              className={`
                w-2 h-2 rounded-full transition-all duration-300
                ${index === currentStep ? 'bg-blue-600 w-8' : 
                  index < currentStep ? 'bg-green-500' : 'bg-gray-300'}
              `}
            />
          ))}
        </div>
      </div>
    </div>
  );
};