import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Task, DomainType, SpaceContent } from '../types';
import { queryAIStream } from '../services/geminiService';
import { generateId } from '../utils/nlp';

interface SpaceViewProps {
  task: Task;
  onBack: () => void;
  onAISchedule: (content: SpaceContent, tasks: Task[]) => void;
}

const SpaceView: React.FC<SpaceViewProps> = ({ task, onBack, onAISchedule }) => {
  const [dump, setDump] = useState(task.spaceContent?.rawDump || '');
  const [isProcessing, setIsProcessing] = useState(false);
  const [insight, setInsight] = useState<string | null>(task.spaceContent?.enrichment || null);

  const handleProcessDump = () => {
    if (!dump.trim()) return;
    setIsProcessing(true);
    
    const today = new Date().toISOString().split('T')[0];

    queryAIStream(`Analyze this ${task.meta.domain} data and extract action items: ${dump}`, [], 
      () => {}, 
      (data) => {
        setIsProcessing(false);
        const newInsight = data?.enrichment || "Analysis complete.";
        setInsight(newInsight);
        
        const newTasks: Task[] = (data?.tasksToSchedule || []).map(t => ({
          id: generateId(),
          content: t.content,
          isCompleted: false,
          depth: 0, 
          tag: (t.tag as any) || 'Execution',
          meta: { 
            created_at: new Date().toISOString(), 
            deadlineISO: t.deadlineISO || today,
            domain: task.meta.domain 
          },
          collapsed: false
        }));

        const updatedContent: SpaceContent = {
          rawDump: dump,
          links: [], // Could be extracted further by AI if needed
          enrichment: newInsight,
          actionItems: newTasks
        };

        onAISchedule(updatedContent, newTasks);
      }
    );
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 1.05 }}
      className="fixed inset-0 bg-white z-[500] flex flex-col p-20 overflow-hidden"
    >
      <header className="flex justify-between items-center mb-20 shrink-0">
        <div>
          <h1 className="text-[10px] font-bold uppercase tracking-[0.3em] text-orange-400 mb-2">{task.meta.domain} Space</h1>
          <h2 className="text-3xl font-light text-stone-800 tracking-tight">{task.content}</h2>
        </div>
        <button onClick={onBack} className="text-[10px] font-bold uppercase tracking-widest text-stone-400 hover:text-stone-800 transition-colors p-2 flex items-center gap-2 group">
          <span className="opacity-0 group-hover:opacity-100 transition-opacity">Return to Hub</span>
          <span className="font-mono">[Esc]</span>
        </button>
      </header>

      <div className="flex-1 flex gap-20 overflow-hidden">
        {/* The Dump Area */}
        <div className="flex-1 flex flex-col">
          <div className="flex justify-between items-end mb-4">
            <label className="text-[10px] font-bold uppercase tracking-widest text-stone-300 italic">Knowledge Cauldron (URLs, Notes, Raw Thought)</label>
            {task.spaceContent?.rawDump && (
               <span className="text-[8px] font-bold uppercase tracking-widest text-stone-200">Persistence Active</span>
            )}
          </div>
          <textarea 
            value={dump}
            onChange={(e) => setDump(e.target.value)}
            className="flex-1 bg-stone-50/50 rounded-2xl p-10 font-mono text-sm leading-relaxed border border-stone-100 focus:border-orange-200 focus:ring-4 focus:ring-orange-50/50 transition-all outline-none resize-none placeholder:text-stone-200 shadow-inner"
            placeholder="Dump links or bulk research text here. AI will distill, store, and schedule..."
          />
          <button 
            disabled={isProcessing}
            onClick={handleProcessDump}
            className={`mt-6 py-4 rounded-full text-[10px] font-bold uppercase tracking-[0.2em] transition-all
              ${isProcessing ? 'bg-stone-100 text-stone-300 cursor-not-allowed' : 'bg-stone-900 text-white hover:bg-orange-500 hover:shadow-xl'}
            `}
          >
            {isProcessing ? 'Distilling Cognitive Load...' : 'Distill, Store & Schedule'}
          </button>
        </div>

        {/* The Distillation Sidebar */}
        <div className="w-96 border-l border-stone-100 pl-20 overflow-y-auto">
          <h3 className="text-[10px] font-bold uppercase tracking-widest text-stone-400 mb-8">AI Distillation</h3>
          <AnimatePresence mode="wait">
            {insight ? (
              <motion.div 
                key="insight"
                initial={{ opacity: 0, x: 20 }} 
                animate={{ opacity: 1, x: 0 }} 
                className="p-6 bg-orange-50/30 rounded-xl border border-orange-100 mb-6"
              >
                <div className="text-[8px] font-bold text-orange-500 uppercase tracking-widest mb-2">Genius Insight</div>
                <div className="text-xs text-stone-600 italic leading-relaxed">"{insight}"</div>
              </motion.div>
            ) : (
              <motion.div key="waiting" className="text-[10px] text-stone-300 font-mono italic">
                Waiting for input... Any knowledge dumped here is persisted to this space. Action items will be automatically synced to your Temporal Map.
              </motion.div>
            )}
          </AnimatePresence>

          {task.spaceContent?.rawDump && (
            <div className="mt-10 pt-10 border-t border-stone-50">
               <h4 className="text-[9px] font-bold uppercase tracking-[0.2em] text-stone-300 mb-4">Neural Footprint</h4>
               <p className="text-[10px] text-stone-400 leading-relaxed font-mono">
                 This space contains {task.spaceContent.rawDump.length} characters of raw knowledge. 
                 It has been distilled into specific temporal pulses in your calendar.
               </p>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default SpaceView;