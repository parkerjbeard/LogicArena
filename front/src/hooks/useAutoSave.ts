'use client';

import { useEffect, useRef, useCallback } from 'react';
import { debounce } from 'lodash';

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
        // Save to localStorage only
        localStorage.setItem(`puzzle_draft_${id}`, draft);
        localStorage.setItem(`puzzle_draft_${id}_timestamp`, new Date().toISOString());
        lastSavedContent.current = draft;
        onSave?.();
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
      // Load from localStorage
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
    } catch (error) {
      console.error('Failed to load draft:', error);
    }
    return null;
  }, []);

  // Clear draft
  const clearDraft = useCallback(async (id: number) => {
    try {
      localStorage.removeItem(`puzzle_draft_${id}`);
      localStorage.removeItem(`puzzle_draft_${id}_timestamp`);
      lastSavedContent.current = '';
    } catch (error) {
      console.error('Failed to clear draft:', error);
    }
  }, []);

  // Clear drafts older than 7 days
  const clearOldDrafts = useCallback(() => {
    try {
      const now = new Date();
      const keys = Object.keys(localStorage);
      
      keys.forEach(key => {
        if (key.includes('puzzle_draft_') && key.includes('_timestamp')) {
          const timestamp = localStorage.getItem(key);
          if (timestamp) {
            const savedTime = new Date(timestamp);
            const daysSince = (now.getTime() - savedTime.getTime()) / (1000 * 60 * 60 * 24);
            
            if (daysSince > 7) {
              const draftKey = key.replace('_timestamp', '');
              localStorage.removeItem(key);
              localStorage.removeItem(draftKey);
            }
          }
        }
      });
    } catch (error) {
      console.error('Failed to clear old drafts:', error);
    }
  }, []);

  // Clear old drafts on mount
  useEffect(() => {
    clearOldDrafts();
  }, [clearOldDrafts]);

  // Cancel debounced save on unmount
  useEffect(() => {
    return () => {
      debouncedSave.cancel();
    };
  }, [debouncedSave]);

  return {
    loadDraft,
    clearDraft,
    isSaving: isSaving.current
  };
}