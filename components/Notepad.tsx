
import React, { useRef, useEffect } from 'react';
import { Task, Artifact } from '../types';
import { parseText, generateId } from '../utils/nlp';
import { COLORS } from '../constants';
import { motion } from 'framer-motion';

interface NotepadProps {
  tasks: Task[];
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
  onFocusTask: (task: Task) => void;
  activeTaskId: string | null;
  onAICommand: (query: string, sourceTaskId: string) => void;
  artifacts: Artifact[];
  onOpenArtifact: (id: string) => void;
  onOpenSpace: (task: Task) => void;
  onToggleCalendar: () => void;
}

const Notepad: React.FC<NotepadProps> = ({ 
  tasks, 
  setTasks, 
  onFocusTask, 
  activeTaskId, 
  onAICommand, 
  artifacts, 
  onOpenArtifact, 
  onOpenSpace,
  onToggleCalendar
}) => {
  const inputRefs = useRef<Map<string, HTMLInputElement>>(new Map());

  // Filter out system-generated subtasks for the clean notepad view
  const visibleTasks = tasks.filter(t => !t.meta.isAISubtask);

  const updateTask = (id: string, updates: Partial<Task>) => {
    setTasks(prev => prev.map(t => {
      if (t.id === id) {
        const updated = { ...t, ...updates };
        // If content is changing, re-parse for NLP tags/dates/times
        if (updates.content !== undefined) {
          const { tag, deadline, deadlineISO, startTime } = parseText(updates.content);
          updated.tag = tag;
          // Merge metadata carefully
          updated.meta = { 
            ...updated.meta, 
            ...(deadline ? { deadline, deadlineISO } : {}),
            ...(startTime ? { startTime } : {})
          };
        }
        return updated;
      }
      return t;
    }));
  };

  const handleKeyDown = (e: React.KeyboardEvent, indexInVisible: number, task: Task) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const newDepth = e.shiftKey ? Math.max(0, task.depth - 1) : Math.min(task.depth + 1, 6);
      updateTask(task.id, { depth: newDepth });
      return;
    }

    if (e.key === 'Enter') {
      e.preventDefault();
      
      const content = task.content.trim();
      if (content !== '' && !content.startsWith('⚡')) {
        onAICommand(content, task.id);
      }

      const newTask = { 
        id: generateId(), 
        content: '', 
        isCompleted: false, 
        depth: task.depth, 
        tag: 'None' as const, 
        meta: { created_at: new Date().toISOString() }, 
        collapsed: false 
      };
      
      const fullIndex = tasks.findIndex(t => t.id === task.id);
      const newTasks = [...tasks];
      newTasks.splice(fullIndex + 1, 0, newTask);
      setTasks(newTasks);
      setTimeout(() => inputRefs.current.get(newTask.id)?.focus(), 10);
    }
    
    if (e.key === 'Backspace' && task.content === '' && visibleTasks.length > 1) {
      e.preventDefault();
      const prevTask = visibleTasks[indexInVisible - 1];
      if (prevTask) {
        setTasks(tasks.filter(t => t.id !== task.id));
        setTimeout(() => inputRefs.current.get(prevTask.id)?.focus(), 10);
      }
    }

    if (e.key === 'ArrowUp') {
      const prevTask = visibleTasks[indexInVisible - 1];
      if (prevTask) inputRefs.current.get(prevTask.id)?.focus();
    }

    if (e.key === 'ArrowDown') {
      const nextTask = visibleTasks[indexInVisible + 1];
      if (nextTask) inputRefs.current.get(nextTask.id)?.focus();
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto pt-40 pb-48 px-12 relative z-10">
      {/* Temporal Map Toggle Button */}
      <div className="fixed top-10 right-10 z-[70]">
        <button 
          onClick={onToggleCalendar}
          className="flex items-center gap-3 px-4 py-2 bg-white/60 backdrop-blur-md border border-stone-200 rounded-full hover:border-orange-300 hover:text-orange-500 transition-all group"
        >
          <div className="w-2 h-2 rounded-full bg-orange-400 group-hover:animate-pulse" />
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-stone-500 group-hover:text-orange-600">Temporal Map [⌘K]</span>
        </button>
      </div>

      <div className="space-y-1">
        {visibleTasks.map((task, index) => (
          <div 
            key={task.id} 
            className="group flex items-start w-full relative transition-all duration-300" 
            style={{ paddingLeft: `${task.depth * 2.5}rem` }}
          >
            {task.depth > 0 && (
              <div 
                className="absolute left-0 top-0 bottom-0 w-px bg-stone-100/50" 
                style={{ left: `${(task.depth * 2.5) - 1.25}rem` }} 
              />
            )}
            
            <button 
              onClick={() => updateTask(task.id, { 
                isCompleted: !task.isCompleted, 
                meta: { ...task.meta, completed_at: !task.isCompleted ? new Date().toISOString() : null } 
              })}
              className="mt-[6px] mr-4 text-stone-300 hover:text-orange-400 focus:outline-none shrink-0 transition-colors"
            >
              {task.isCompleted ? (
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
              ) : (
                <div className="w-4 h-4 rounded-full border-2 border-current opacity-20 group-hover:opacity-100" />
              )}
            </button>
            
            <div className="flex-1 flex items-center gap-3">
              <input
                ref={el => { if (el) inputRefs.current.set(task.id, el); else inputRefs.current.delete(task.id); }}
                value={task.content}
                onChange={(e) => updateTask(task.id, { content: e.target.value })}
                onKeyDown={(e) => handleKeyDown(e, index, task)}
                className="flex-1 bg-transparent border-none p-0 text-base font-mono focus:ring-0 focus:outline-none placeholder:text-stone-200 transition-all"
                style={{ 
                  color: task.isCompleted ? '#d1d5db' : (task.meta.domain ? '#111' : '#4a454e'), 
                  textDecoration: task.isCompleted ? 'line-through' : 'none',
                  fontWeight: task.meta.domain ? '500' : '300'
                }}
                placeholder={index === 0 && visibleTasks.length === 1 ? "Start typing..." : ""}
                spellCheck={false}
              />
              
              {task.meta.domain && (
                <button 
                  onClick={() => onOpenSpace(task)}
                  className="px-2 py-0.5 rounded-full border border-stone-200 text-[8px] font-bold uppercase text-stone-400 hover:border-orange-400 hover:text-orange-500 transition-all bg-white"
                >
                  {task.meta.domain} Space ↗
                </button>
              )}

              {(task.artifactIds || []).map(artId => (
                <motion.button
                  key={artId}
                  initial={{ scale: 0 }} animate={{ scale: 1 }}
                  onClick={() => onOpenArtifact(artId)}
                  className="w-5 h-5 rounded-full bg-orange-100 flex items-center justify-center text-[10px] text-orange-500 hover:bg-orange-500 hover:text-white transition-colors"
                >
                  ✧
                </motion.button>
              ))}
            </div>

            <button 
              onClick={() => onFocusTask(task)} 
              className="ml-4 opacity-0 group-hover:opacity-100 text-stone-300 hover:text-stone-500 text-xs p-1"
            >
              ⋯
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Notepad;
