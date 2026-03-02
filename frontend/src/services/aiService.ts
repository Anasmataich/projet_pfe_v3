import api, { type ApiResponse } from './api';

export interface ClassificationResult {
  category: string;
  confidence: number;
  scores: Record<string, number>;
}

export interface ExtractionResult {
  entities: { text: string; label: string; start: number; end: number }[];
  entityCount: number;
}

export interface SummarizationResult {
  summary: string;
  summaryLength: number;
  originalLength: number;
  compressionRatio: number;
}

export interface SearchResultItem {
  documentId: string;
  title: string;
  score: number;
  snippet: string;
}

export const aiService = {
  classify: (text: string) =>
    api.post<ApiResponse<ClassificationResult>>('/ai/classify', { text }).then((r) => r.data.data),

  extract: (text: string, language?: string) =>
    api.post<ApiResponse<ExtractionResult>>('/ai/extract', { text, language }).then((r) => r.data.data),

  summarize: (text: string, maxLength?: number) =>
    api.post<ApiResponse<SummarizationResult>>('/ai/summarize', { text, maxLength }).then((r) => r.data.data),

  search: (query: string, documents: { id: string; content: string }[], topK?: number) =>
    api.post<ApiResponse<{ results: SearchResultItem[]; total: number }>>('/ai/search', { query, documents, topK }).then((r) => r.data.data),
};
