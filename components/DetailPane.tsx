import React, { useEffect, useState } from 'react';
import { Task } from '../types';
import { COLORS } from '../constants';

interface DetailPaneProps {
  task: Task;
  onUpdate: (taskId: string, updates: Partial<Task>) => void;
  onClose: () => void;
  allTasks: Task[]; // To show blocking context if needed
}

const DetailPane: React.FC<DetailPaneProps> = ({ task, onUpdate, onClose, allTasks }) => {
  const [why, setWhy] = useState(task.meta.why || '');
  const [after, setAfter] = useState(task.meta.after || '');

  // Update local state when task changes (selection change)
  useEffect(() => {
    setWhy(task.meta.why || '');
    setAfter(task.meta.after || '');
  }, [task.id]);

  // Debounced save or blur save could be used here. 
  // For simplicity, we save on blur.
  const handleSave = () => {
    onUpdate(task.id, {
      meta: {
        ...task.meta,
        why,
        after
      }
    });
  };

  const tagColor = COLORS.tags[task.tag] || COLORS.text;

  return (
    <div className="h-full w-full bg-[#faf8f0] border-l border-stone-200 p-8 flex flex-col overflow-y-auto animate-in slide-in-from-right duration-300">
      {/* Metacognition Title */}
      <div className="mb-6">
        <h2 className="text-2xl font-light tracking-wide text-stone-600 font-mono">
          Metacognition
        </h2>
      </div>

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-2 text-xs font-bold uppercase tracking-widest text-stone-400">
           <span style={{ color: tagColor }}>[{task.tag.toUpperCase()}]</span>
           <span>•</span>
           <span>{new Date(task.meta.created_at).toLocaleDateString()}</span>
        </div>
        <h1 className="text-xl font-medium leading-relaxed font-mono" style={{ color: task.isCompleted ? '#a8a29e' : '#2d2a2e' }}>
          {task.content || "Untitled Task"}
        </h1>
        {task.meta.deadline && (
             <div className="mt-2 text-xs text-red-400">Deadline: {task.meta.deadline}</div>
        )}
      </div>

      <hr className="border-stone-200 mb-8" />

      {/* Intentionality Field */}
      <div className="mb-8 group">
        <label className="block text-xs font-bold uppercase tracking-widest text-stone-400 mb-3 group-focus-within:text-stone-600 transition-colors">
          Why am I doing this?
        </label>
        <textarea
          value={why}
          onChange={(e) => setWhy(e.target.value)}
          onBlur={handleSave}
          placeholder="Define the strategic impact..."
          className="w-full bg-transparent border-l-2 border-stone-200 pl-4 py-1 focus:border-stone-400 focus:outline-none text-sm leading-relaxed min-h-[100px] resize-none text-stone-600 placeholder:text-stone-300"
        />
      </div>

      {/* Causal Field */}
      <div className="mb-8 group">
        <label className="block text-xs font-bold uppercase tracking-widest text-stone-400 mb-3 group-focus-within:text-stone-600 transition-colors">
          What happens after?
        </label>
        <textarea
          value={after}
          onChange={(e) => setAfter(e.target.value)}
          onBlur={handleSave}
          placeholder="Visualize the immediate next state..."
          className="w-full bg-transparent border-l-2 border-stone-200 pl-4 py-1 focus:border-stone-400 focus:outline-none text-sm leading-relaxed min-h-[100px] resize-none text-stone-600 placeholder:text-stone-300"
        />
      </div>

       {/* Completion Log (Simulation) */}
       {task.isCompleted && (
           <div className="mt-auto pt-8 border-t border-stone-100">
               <p className="text-xs text-stone-400 font-mono">
                   Completion Rite performed at {task.meta.completed_at ? new Date(task.meta.completed_at).toLocaleTimeString() : 'Unknown'}
               </p>
           </div>
       )}
       
       {/* Close hint (Mobile mostly, desktop uses click-away) */}
       <button onClick={onClose} className="absolute top-4 right-4 text-stone-300 hover:text-stone-500">
           ✕
       </button>
    </div>
  );
};

export default DetailPane;
