import { useState } from 'react';
import { Wand2, BookOpen, Tag, AlertTriangle } from 'lucide-react';
import { SummaryCard } from './SummaryCard';
import { useAI } from '@/hooks/useAI';
import type { ClassificationResult, SummarizationResult, ExtractionResult } from '@/services/aiService';
import toast from 'react-hot-toast';

export function AIToolsPanel() {
  const [text, setText] = useState('');
  const [classResult, setClassResult] = useState<ClassificationResult | null>(null);
  const [summaryResult, setSummaryResult] = useState<SummarizationResult | null>(null);
  const [extractResult, setExtractResult] = useState<ExtractionResult | null>(null);
  const { isProcessing, classify, summarize, extractEntities } = useAI();

  const handleClassify = async () => {
    if (!text.trim()) { toast.error('Entrez du texte à analyser'); return; }
    const res = await classify(text);
    if (res) setClassResult(res);
  };

  const handleSummarize = async () => {
    if (!text.trim()) { toast.error('Entrez du texte à résumer'); return; }
    const res = await summarize(text);
    if (res) setSummaryResult(res);
  };

  const handleExtract = async () => {
    if (!text.trim()) { toast.error('Entrez du texte pour extraction'); return; }
    const res = await extractEntities(text);
    if (res) setExtractResult(res);
  };

  return (
    <div className="space-y-6">
      <div>
        <label className="label">Texte à analyser</label>
        <textarea
          className="input min-h-[160px] resize-y"
          placeholder="Collez ici le texte d'un document pour l'analyser avec l'IA…"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <p className="mt-1 text-xs text-slate-500">{text.length} caractères</p>
      </div>

      <div className="flex flex-wrap gap-3">
        <button className="btn-secondary" onClick={handleClassify} disabled={isProcessing || !text.trim()}>
          <Tag className="h-4 w-4" /> Classifier
        </button>
        <button className="btn-secondary" onClick={handleSummarize} disabled={isProcessing || !text.trim()}>
          <BookOpen className="h-4 w-4" /> Résumer
        </button>
        <button className="btn-secondary" onClick={handleExtract} disabled={isProcessing || !text.trim()}>
          <Wand2 className="h-4 w-4" /> Extraire les entités
        </button>
      </div>

      {classResult && (
        <div className="card p-5">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-300 mb-3"><Tag className="h-4 w-4 text-blue-400" /> Classification</h3>
          <p className="text-lg font-bold text-blue-400">{classResult.category}</p>
          <p className="text-sm text-slate-500 mt-1">Confiance : {(classResult.confidence * 100).toFixed(1)}%</p>
          {classResult.scores && (
            <div className="mt-3 space-y-1.5">
              {Object.entries(classResult.scores).sort(([, a], [, b]) => b - a).slice(0, 5).map(([cat, score]) => (
                <div key={cat} className="flex items-center gap-2">
                  <span className="text-xs text-slate-400 w-36 truncate">{cat}</span>
                  <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
                    <div className="h-full rounded-full" style={{ width: `${score * 100}%`, background: 'linear-gradient(90deg, #2563eb, #06b6d4)' }} />
                  </div>
                  <span className="text-xs text-slate-500 w-12 text-right tabular-nums">{(score * 100).toFixed(0)}%</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {summaryResult && <SummaryCard result={summaryResult} />}

      {extractResult && (
        <div className="card p-5">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-300 mb-3"><Wand2 className="h-4 w-4 text-violet-400" /> Entités extraites</h3>
          {extractResult.entities.length === 0 ? (
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <AlertTriangle className="h-4 w-4" /> Aucune entité détectée
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {extractResult.entities.map((e, i) => (
                <span key={i} className="inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)' }}>
                  <span className="text-xs font-medium text-white">{e.text}</span>
                  <span className="badge-blue text-[10px] px-1.5 py-0">{e.label}</span>
                </span>
              ))}
            </div>
          )}
          <p className="text-xs text-slate-500 mt-3">{extractResult.entityCount} entité(s) au total</p>
        </div>
      )}
    </div>
  );
}
