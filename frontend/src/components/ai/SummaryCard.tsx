import { BookOpen } from 'lucide-react';
import type { SummarizationResult } from '@/services/aiService';

interface SummaryCardProps {
  result: SummarizationResult;
}

export function SummaryCard({ result }: SummaryCardProps) {
  return (
    <div className="card p-5">
      <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-300 mb-3">
        <BookOpen className="h-4 w-4 text-emerald-400" /> Résumé
      </h3>
      <p className="text-sm text-slate-300 whitespace-pre-wrap leading-relaxed">{result.summary}</p>
      <div className="mt-4 flex items-center gap-4 text-xs text-slate-500">
        <span>Original : {result.originalLength} car.</span>
        <span>Résumé : {result.summaryLength} car.</span>
        <span>Compression : {(result.compressionRatio * 100).toFixed(0)}%</span>
      </div>
    </div>
  );
}
