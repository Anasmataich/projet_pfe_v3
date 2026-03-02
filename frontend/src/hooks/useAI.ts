import { useState, useCallback } from 'react';
import { aiService, type ClassificationResult, type SummarizationResult, type ExtractionResult } from '@/services/aiService';

export function useAI() {
  const [isProcessing, setIsProcessing] = useState(false);

  const classify = useCallback(async (text: string): Promise<ClassificationResult | null> => {
    setIsProcessing(true);
    try {
      return (await aiService.classify(text)) ?? null;
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const summarize = useCallback(async (text: string): Promise<SummarizationResult | null> => {
    setIsProcessing(true);
    try {
      return (await aiService.summarize(text)) ?? null;
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const extractEntities = useCallback(async (text: string): Promise<ExtractionResult | null> => {
    setIsProcessing(true);
    try {
      return (await aiService.extract(text)) ?? null;
    } finally {
      setIsProcessing(false);
    }
  }, []);

  return { isProcessing, classify, summarize, extractEntities };
}
