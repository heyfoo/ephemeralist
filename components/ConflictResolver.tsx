import React from 'react';
import { Task } from '../types';
import { ConflictResolutionSuggestion, generateConflictResolutions, applyConflictResolution } from '../utils/conflictResolution';
import { motion, AnimatePresence } from 'framer-motion';

interface ConflictResolverProps {
  conflictingTask: Task;
  allTasks: Task[];
  dateISO: string;
  onResolve: (resolvedTask: Task | Task[]) => void;
  onCancel: () => void;
}

const ConflictResolver: React.FC<ConflictResolverProps> = ({
  conflictingTask,
  allTasks,
  dateISO,
  onResolve,
  onCancel
}) => {
  const suggestions = generateConflictResolutions(allTasks, conflictingTask, dateISO);

  const handleApplySuggestion = (suggestion: ConflictResolutionSuggestion) => {
    const resolved = applyConflictResolution(conflictingTask, suggestion);
    onResolve(resolved);
  };

  const getSuggestionIcon = (type: ConflictResolutionSuggestion['type']) => {
    switch (type) {
      case 'reschedule': return '⏰';
      case 'shorten': return '⏱️';
      case 'split': return '✂️';
      case 'defer': return '📅';
      default: return '🔧';
    }
  };

  const getSuggestionColor = (type: ConflictResolutionSuggestion['type']) => {
    switch (type) {
      case 'reschedule': return 'bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100';
      case 'shorten': return 'bg-yellow-50 border-yellow-200 text-yellow-700 hover:bg-yellow-100';
      case 'split': return 'bg-purple-50 border-purple-200 text-purple-700 hover:bg-purple-100';
      case 'defer': return 'bg-green-50 border-green-200 text-green-700 hover:bg-green-100';
      default: return 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100';
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[400] flex items-center justify-center p-6"
      >
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-stone-900/50 backdrop-blur-sm"
          onClick={onCancel}
        />
        
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="relative w-full max-w-lg bg-white shadow-2xl rounded-2xl overflow-hidden"
        >
          <div className="p-6 border-b border-stone-100 bg-red-50/50">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-3 h-3 bg-red-400 rounded-full animate-pulse" />
              <h2 className="text-[10px] font-bold uppercase tracking-[0.3em] text-red-600">
                Scheduling Conflict Detected
              </h2>
            </div>
            <h3 className="text-lg font-medium text-stone-800 mb-2">
              "{conflictingTask.content}"
            </h3>
            <p className="text-sm text-stone-600">
              {conflictingTask.meta.startTime} • {conflictingTask.meta.durationMinutes}m • {new Date(dateISO).toLocaleDateString('default', { weekday: 'long', month: 'short', day: 'numeric' })}
            </p>
          </div>

          <div className="p-6">
            <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-stone-400 mb-4">
              Resolution Options
            </h4>
            
            {suggestions.length === 0 ? (
              <div className="text-center py-8 text-stone-400">
                <p className="text-sm">No automatic resolution available.</p>
                <p className="text-xs mt-1">Please manually adjust the task timing.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {suggestions.map((suggestion, index) => (
                  <button
                    key={index}
                    onClick={() => handleApplySuggestion(suggestion)}
                    className={`w-full p-4 border rounded-xl text-left transition-all ${getSuggestionColor(suggestion.type)}`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-lg">{getSuggestionIcon(suggestion.type)}</span>
                      <div className="flex-1">
                        <p className="font-medium text-sm">{suggestion.description}</p>
                        {suggestion.type === 'split' && suggestion.splitTasks && (
                          <p className="text-xs mt-1 opacity-75">
                            Creates {suggestion.splitTasks.length} separate tasks
                          </p>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="p-6 bg-stone-50/50 border-t border-stone-100 flex justify-between">
            <button
              onClick={onCancel}
              className="px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-stone-400 hover:text-stone-600 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={onCancel}
              className="px-6 py-2 bg-stone-900 text-white text-[10px] font-bold uppercase tracking-widest rounded-full hover:bg-stone-700 transition-all"
            >
              Keep As Is
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default ConflictResolver;