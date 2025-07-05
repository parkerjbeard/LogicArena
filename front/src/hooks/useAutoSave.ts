'use client';

import { useEffect, useRef, useCallback } from 'react';
import { debounce } from 'lodash';
import { progressAPI } from '@/lib/api';
import { useToast } from '@/components/Toast';

interface UseAutoSaveOptions {
  enabled?: boolean;
  delay?: number; // milliseconds
  onSave?: () => void;
  onError?: (error: any) => void;
}

export function useAutoSave(
  puzzleId: number | null,
  content: string,
  options: UseAutoSaveOptions = {}
) {
  const { 
    enabled = true, 
    delay = 2000, 
    onSave, 
    onError 
  } = options;
  
  const { showToast } = useToast();
  const lastSavedContent = useRef<string>('');
  const isSaving = useRef(false);

  // Create debounced save function
  const debouncedSave = useRef(
    debounce(async (id: number, draft: string) => {
      if (!enabled || isSaving.current || draft === lastSavedContent.current) {
        return;
      }

      isSaving.current = true;
      try {
        // Save to localStorage immediately
        localStorage.setItem(`puzzle_draft_${id}`, draft);
        localStorage.setItem(`puzzle_draft_${id}_timestamp`, new Date().toISOString());
        
        // Try to save to backend
        try {
          await progressAPI.saveDraft(id, draft);
          lastSavedContent.current = draft;
          onSave?.();
        } catch (apiError) {
          // Silently fail for backend, localStorage is our backup
          console.warn('Failed to save draft to backend:', apiError);
        }
      } catch (error) {
        console.error('Failed to save draft:', error);
        onError?.(error);
      } finally {
        isSaving.current = false;
      }
    }, delay)
  ).current;

  // Save draft when content changes
  useEffect(() => {
    if (puzzleId && content && enabled) {
      debouncedSave(puzzleId, content);
    }
  }, [puzzleId, content, enabled, debouncedSave]);

  // Load draft from localStorage on mount
  const loadDraft = useCallback(async (id: number): Promise<string | null> => {
    try {
      // First try localStorage
      const localDraft = localStorage.getItem(`puzzle_draft_${id}`);
      if (localDraft) {
        const timestamp = localStorage.getItem(`puzzle_draft_${id}_timestamp`);
        if (timestamp) {
          const savedTime = new Date(timestamp);
          const now = new Date();
          const hoursSince = (now.getTime() - savedTime.getTime()) / (1000 * 60 * 60);
          
          // If draft is less than 24 hours old, use it
          if (hoursSince < 24) {
            return localDraft;
          }
        }
      }

      // Try to load from backend
      try {
        const response = await progressAPI.getDraft(id);
        if (response.draft) {
          // Update localStorage with backend version
          localStorage.setItem(`puzzle_draft_${id}`, response.draft);
          localStorage.setItem(`puzzle_draft_${id}_timestamp`, new Date().toISOString());
          return response.draft;
        }
      } catch (apiError) {
        // Silently fail, no draft available
      }

      return null;
    } catch (error) {
      console.error('Failed to load draft:', error);
      return null;
    }
  }, []);

  // Clear draft after successful submission
  const clearDraft = useCallback(async (id: number) => {
    try {
      // Clear from localStorage
      localStorage.removeItem(`puzzle_draft_${id}`);
      localStorage.removeItem(`puzzle_draft_${id}_timestamp`);
      lastSavedContent.current = '';
      
      // Try to clear from backend
      try {
        await progressAPI.clearDraft(id);
      } catch (apiError) {
        // Silently fail
      }
    } catch (error) {
      console.error('Failed to clear draft:', error);
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      debouncedSave.cancel();
    };
  }, [debouncedSave]);

  return {
    loadDraft,
    clearDraft,
    isSaving: isSaving.current,
  };
}