import React from 'react';
import { motion } from 'framer-motion';
import { Artifact } from '../types';

interface ArtifactCardProps {
  artifact: Artifact;
  onClick: () => void;
  onDock: (e: React.MouseEvent) => void;
}

const SparkleIcon = () => (
  <motion.div 
    animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
    transition={{ repeat: Infinity, duration: 2 }}
    className="w-4 h-4 text-orange-400 shrink-0"
  >
    <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L14.5 9.5H22L16 14L18.5 21.5L12 17L5.5 21.5L8 14L2 9.5H9.5L12 2Z" /></svg>
  </motion.div>
);

const ArtifactCard: React.FC<ArtifactCardProps> = ({ artifact, onClick, onDock }) => {
  const isExpanded = artifact.view === 'expanded';

  if (isExpanded) {
    return (
      <motion.div
        layoutId={`artifact-${artifact.id}`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[1000] bg-stone-900/5 flex items-center justify-center p-6 md:p-20"
        onClick={onDock}
      >
        <motion.div 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="w-full max-w-4xl bg-white border border-stone-200 shadow-[0_32px_64px_-12px_rgba(0,0,0,0.2)] rounded-3xl overflow-hidden flex flex-col max-h-[85vh]"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="p-6 border-b border-stone-100 flex justify-between items-center bg-stone-50/50">
            <div className="flex items-center gap-3">
              <SparkleIcon />
              <div className="flex flex-col">
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-stone-500">Conceptual Artifact</span>
                <span className="text-[8px] font-mono text-stone-300">ID: {artifact.id.toUpperCase()}</span>
              </div>
            </div>
            <button 
              onClick={onDock} 
              className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-stone-100 text-stone-400 hover:text-stone-800 transition-all"
            >
              ✕
            </button>
          </div>
          
          <div className="flex-1 p-8 md:p-16 overflow-y-auto font-mono">
            <div className="max-w-2xl mx-auto">
              <div className="flex items-center gap-2 mb-6">
                <span className="px-2 py-0.5 rounded bg-orange-50 text-[10px] font-bold text-orange-500 uppercase tracking-widest border border-orange-100">
                  {artifact.domain || 'Synthesis'}
                </span>
                <span className="text-stone-300 text-[10px]">—</span>
                <span className="text-stone-400 text-[10px]">{new Date(artifact.created_at).toLocaleDateString()}</span>
              </div>
              
              <h2 className="text-2xl font-light text-stone-800 mb-10 leading-snug border-l-4 border-stone-100 pl-6 italic">
                "{artifact.query}"
              </h2>
              
              <div className="text-base leading-relaxed text-stone-700 whitespace-pre-wrap selection:bg-orange-100">
                {artifact.content}
              </div>
            </div>
          </div>
          
          <div className="p-6 bg-stone-50/50 border-t border-stone-100 flex justify-end gap-4">
            <button 
              onClick={onDock} 
              className="px-8 py-3 bg-stone-900 text-white text-[10px] font-bold uppercase tracking-widest rounded-full hover:bg-orange-600 hover:shadow-lg transition-all"
            >
              Archive Knowledge
            </button>
          </div>
        </motion.div>
      </motion.div>
    );
  }

  return (
    <motion.div
      layoutId={`artifact-${artifact.id}`}
      drag
      dragMomentum={false}
      initial={{ opacity: 0, scale: 0.9, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9, y: 20 }}
      whileDrag={{ scale: 1.02, zIndex: 100, boxShadow: "0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)" }}
      className="w-64 bg-white border border-stone-200 shadow-xl rounded-xl p-4 cursor-grab active:cursor-grabbing hover:border-orange-300 transition-colors flex flex-col gap-3 group relative"
      onClick={onClick}
    >
      <div className="flex justify-between items-center">
        <SparkleIcon />
        <div className="flex items-center gap-2">
          <button 
            onClick={(e) => { e.stopPropagation(); onDock(e); }} 
            className="opacity-0 group-hover:opacity-100 text-[8px] font-bold uppercase tracking-widest text-stone-300 hover:text-stone-600 transition-all"
          >
            Archive
          </button>
          <div className="w-2.5 h-4 flex flex-col gap-0.5 opacity-20 group-hover:opacity-40 transition-opacity">
            <div className="w-full h-px bg-stone-900" />
            <div className="w-full h-px bg-stone-900" />
            <div className="w-full h-px bg-stone-900" />
            <div className="w-full h-px bg-stone-900" />
          </div>
        </div>
      </div>
      <div className="text-[10px] text-stone-400 truncate italic">Ref: {artifact.query}</div>
      <div className="text-[11px] leading-relaxed text-stone-600 line-clamp-3">
        {artifact.content || 'Synthesizing knowledge...'}
      </div>
      {artifact.status === 'generating' && (
        <div className="h-0.5 w-full bg-stone-100 overflow-hidden rounded-full">
          <motion.div 
            className="h-full bg-orange-400"
            animate={{ x: [-256, 256] }}
            transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
          />
        </div>
      )}
    </motion.div>
  );
};

export default ArtifactCard;