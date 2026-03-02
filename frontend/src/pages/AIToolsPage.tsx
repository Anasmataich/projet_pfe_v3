import { useState } from 'react';
import { Sparkles, Search, ScanLine, Wand2 } from 'lucide-react';
import { SemanticSearch } from '@/components/ai/SemanticSearch';
import { AIToolsPanel } from '@/components/ai/AIToolsPanel';
import { OCRViewer } from '@/components/ai/OCRViewer';
import { cn } from '@/utils/helpers';

type Tab = 'search' | 'analyze' | 'ocr';

const TABS: { key: Tab; label: string; icon: React.ElementType }[] = [
  { key: 'search', label: 'Recherche sémantique', icon: Search },
  { key: 'analyze', label: 'Analyse IA', icon: Wand2 },
  { key: 'ocr', label: 'OCR', icon: ScanLine },
];

export function AIToolsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('search');

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="page-title flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-xl flex items-center justify-center shrink-0"
               style={{ background: 'rgba(6,182,212,0.15)' }}>
            <Sparkles className="h-4.5 w-4.5 text-cyan-400" />
          </div>
          Outils d'Intelligence Artificielle
        </h1>
        <p className="page-sub mt-1">Recherche sémantique, classification, résumé et OCR</p>
      </div>

      <div className="card">
        <div className="flex" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          {TABS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={cn(
                'flex items-center gap-2 px-5 py-3.5 text-sm font-medium border-b-2 transition-colors',
                activeTab === key
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-slate-500 hover:text-slate-300'
              )}
            >
              <Icon className="h-4 w-4" /> {label}
            </button>
          ))}
        </div>

        <div className="p-6">
          {activeTab === 'search' && <SemanticSearch />}
          {activeTab === 'analyze' && <AIToolsPanel />}
          {activeTab === 'ocr' && <OCRViewer />}
        </div>
      </div>
    </div>
  );
}
