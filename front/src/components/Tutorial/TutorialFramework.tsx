'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, X, Lightbulb, CheckCircle, AlertCircle } from 'lucide-react';
import { TutorialStep, TutorialState } from '@/types/tutorial';

interface TutorialFrameworkProps {
  steps: TutorialStep[];
  onComplete: () => void;
  onExit: () => void;
  title: string;
}

export const TutorialFramework: React.FC<TutorialFrameworkProps> = ({
  steps,
  onComplete,
  onExit,
  title
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [tutorialState, setTutorialState] = useState<TutorialState>({
    currentStep: 0,
    completedSteps: [],
    hintsUsed: [],
    mistakes: []
  });

  const [showHint, setShowHint] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [validationMessage, setValidationMessage] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);

  const currentStepData = steps[currentStep];
  const progress = ((currentStep + 1) / steps.length) * 100;

  const handleNext = useCallback(() => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1);
      setShowHint(false);
      setValidationMessage(null);
    } else {
      onComplete();
    }
  }, [currentStep, steps.length, onComplete]);

  const handlePrevious = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
      setShowHint(false);
      setValidationMessage(null);
    }
  }, [currentStep]);

  const handleShowHint = useCallback(() => {
    setShowHint(true);
    setTutorialState(prev => ({
      ...prev,
      hintsUsed: [...prev.hintsUsed, currentStep]
    }));
  }, [currentStep]);

  const validateStep = useCallback(async (userInput: any) => {
    setIsValidating(true);
    
    try {
      // Call step validation if provided
      if (currentStepData.validate) {
        const isValid = await currentStepData.validate(userInput);
        
        if (isValid) {
          setValidationMessage({
            type: 'success',
            message: 'Correct! Well done!'
          });
          
          setTutorialState(prev => ({
            ...prev,
            completedSteps: [...prev.completedSteps, currentStep]
          }));
          
          // Auto-advance after success
          setTimeout(() => {
            handleNext();
          }, 1500);
        } else {
          setValidationMessage({
            type: 'error',
            message: currentStepData.errorMessage || 'Not quite right. Try again!'
          });
          
          setTutorialState(prev => ({
            ...prev,
            mistakes: [...prev.mistakes, { step: currentStep, timestamp: Date.now() }]
          }));
        }
      }
    } finally {
      setIsValidating(false);
    }
  }, [currentStepData, currentStep, handleNext]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') handlePrevious();
      if (e.key === 'ArrowRight' && tutorialState.completedSteps.includes(currentStep)) {
        handleNext();
      }
      if (e.key === 'Escape') onExit();
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [handlePrevious, handleNext, onExit, currentStep, tutorialState.completedSteps]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative w-full max-w-5xl max-h-[90vh] bg-gray-900 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="bg-gray-800 text-white p-6 border-b border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">{title}</h2>
              <p className="text-gray-300 mt-1">
                Step {currentStep + 1} of {steps.length}: {currentStepData.title}
              </p>
            </div>
            <button
              onClick={onExit}
              className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
          
          {/* Progress bar */}
          <div className="mt-4 bg-gray-700 rounded-full h-2 overflow-hidden">
            <motion.div
              className="h-full bg-blue-500"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="space-y-6 max-w-4xl mx-auto"
            >
              {/* Step description */}
              <div className="text-lg">
                <p className="text-gray-300 leading-relaxed">{currentStepData.description}</p>
              </div>

              {/* Interactive content */}
              <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50">
                {currentStepData.content}
              </div>

              {/* Hint section */}
              {currentStepData.hint && (
                <div className="mt-6">
                  {!showHint ? (
                    <button
                      onClick={handleShowHint}
                      className="flex items-center gap-2 text-blue-600 hover:text-blue-700 transition-colors"
                    >
                      <Lightbulb className="w-5 h-5" />
                      Need a hint?
                    </button>
                  ) : (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-yellow-900/20 backdrop-blur-sm border border-yellow-600/30 rounded-lg p-4"
                    >
                      <div className="flex items-start gap-3">
                        <Lightbulb className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                        <p className="text-sm text-yellow-300">{currentStepData.hint}</p>
                      </div>
                    </motion.div>
                  )}
                </div>
              )}

              {/* Validation message */}
              <AnimatePresence>
                {validationMessage && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className={`rounded-lg p-4 backdrop-blur-sm ${
                      validationMessage.type === 'success'
                        ? 'bg-green-900/20 border border-green-600/30'
                        : validationMessage.type === 'error'
                        ? 'bg-red-900/20 border border-red-600/30'
                        : 'bg-blue-900/20 border border-blue-600/30'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {validationMessage.type === 'success' ? (
                        <CheckCircle className="w-5 h-5 text-green-400" />
                      ) : (
                        <AlertCircle className="w-5 h-5 text-red-400" />
                      )}
                      <p className={`text-sm ${
                        validationMessage.type === 'success'
                          ? 'text-green-300'
                          : validationMessage.type === 'error'
                          ? 'text-red-300'
                          : 'text-blue-300'
                      }`}>
                        {validationMessage.message}
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Navigation */}
        <div className="bg-gray-800 border-t border-gray-700 p-6">
          <div className="flex items-center justify-between max-w-4xl mx-auto">
            <button
              onClick={handlePrevious}
              disabled={currentStep === 0}
              className="flex items-center gap-2 px-4 py-2 text-gray-300 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
              Previous
            </button>

            <div className="flex items-center gap-2">
              {steps.map((_, index) => (
                <div
                  key={index}
                  className={`w-2 h-2 rounded-full transition-colors ${
                    index === currentStep
                      ? 'bg-blue-600'
                      : tutorialState.completedSteps.includes(index)
                      ? 'bg-green-500'
                      : 'bg-gray-300'
                  }`}
                />
              ))}
            </div>

            <button
              onClick={handleNext}
              disabled={
                currentStep === steps.length - 1 && 
                !tutorialState.completedSteps.includes(currentStep)
              }
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {currentStep === steps.length - 1 ? 'Complete' : 'Next'}
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};