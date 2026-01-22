import { Task } from '../types';
import { checkSchedulingConflict, findAvailableSlots, getScheduledSlots } from './scheduling';

export interface ConflictResolutionSuggestion {
  type: 'reschedule' | 'shorten' | 'split' | 'defer';
  description: string;
  newStartTime?: string;
  newDuration?: number;
  newDate?: string;
  splitTasks?: Array<{
    content: string;
    startTime: string;
    duration: number;
  }>;
}

/**
 * Generate smart conflict resolution suggestions
 */
export const generateConflictResolutions = (
  tasks: Task[],
  conflictingTask: Task,
  dateISO: string
): ConflictResolutionSuggestion[] => {
  const suggestions: ConflictResolutionSuggestion[] = [];
  
  if (!conflictingTask.meta.startTime || !conflictingTask.meta.durationMinutes) {
    return suggestions;
  }

  const conflict = checkSchedulingConflict(
    tasks,
    dateISO,
    conflictingTask.meta.startTime,
    conflictingTask.meta.durationMinutes,
    conflictingTask.id
  );

  // 1. Reschedule to available slot
  if (conflict.suggestedTime) {
    suggestions.push({
      type: 'reschedule',
      description: `Move to ${conflict.suggestedTime}`,
      newStartTime: conflict.suggestedTime
    });
  }

  // 2. Find other available slots
  const availableSlots = findAvailableSlots(
    getScheduledSlots(tasks, dateISO).filter(slot => slot.taskId !== conflictingTask.id),
    conflictingTask.meta.durationMinutes
  );

  availableSlots.slice(0, 3).forEach(slot => {
    if (slot.start !== conflict.suggestedTime) {
      suggestions.push({
        type: 'reschedule',
        description: `Alternative: Move to ${slot.start}`,
        newStartTime: slot.start
      });
    }
  });

  // 3. Shorten duration to fit
  const shortenedDuration = Math.max(15, Math.floor(conflictingTask.meta.durationMinutes * 0.75));
  if (shortenedDuration < conflictingTask.meta.durationMinutes) {
    const shortenedConflict = checkSchedulingConflict(
      tasks,
      dateISO,
      conflictingTask.meta.startTime,
      shortenedDuration,
      conflictingTask.id
    );
    
    if (!shortenedConflict.hasConflict) {
      suggestions.push({
        type: 'shorten',
        description: `Reduce to ${shortenedDuration} minutes`,
        newDuration: shortenedDuration
      });
    }
  }

  // 4. Split into smaller chunks
  if (conflictingTask.meta.durationMinutes >= 60) {
    const chunkSize = 30;
    const numChunks = Math.ceil(conflictingTask.meta.durationMinutes / chunkSize);
    const splitTasks = [];
    
    for (let i = 0; i < numChunks; i++) {
      const availableSlot = availableSlots[i];
      if (availableSlot) {
        splitTasks.push({
          content: `${conflictingTask.content} (Part ${i + 1}/${numChunks})`,
          startTime: availableSlot.start,
          duration: Math.min(chunkSize, conflictingTask.meta.durationMinutes - (i * chunkSize))
        });
      }
    }

    if (splitTasks.length > 1) {
      suggestions.push({
        type: 'split',
        description: `Split into ${splitTasks.length} smaller tasks`,
        splitTasks
      });
    }
  }

  // 5. Defer to next day
  const tomorrow = new Date(dateISO);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowISO = tomorrow.toISOString().split('T')[0];
  
  const tomorrowConflict = checkSchedulingConflict(
    tasks,
    tomorrowISO,
    conflictingTask.meta.startTime,
    conflictingTask.meta.durationMinutes
  );

  if (!tomorrowConflict.hasConflict) {
    suggestions.push({
      type: 'defer',
      description: `Move to tomorrow at same time`,
      newDate: tomorrowISO
    });
  } else if (tomorrowConflict.suggestedTime) {
    suggestions.push({
      type: 'defer',
      description: `Move to tomorrow at ${tomorrowConflict.suggestedTime}`,
      newDate: tomorrowISO,
      newStartTime: tomorrowConflict.suggestedTime
    });
  }

  return suggestions;
};

/**
 * Apply a conflict resolution suggestion to a task
 */
export const applyConflictResolution = (
  task: Task,
  suggestion: ConflictResolutionSuggestion
): Task | Task[] => {
  const updatedTask = { ...task };

  switch (suggestion.type) {
    case 'reschedule':
      if (suggestion.newStartTime) {
        updatedTask.meta = {
          ...updatedTask.meta,
          startTime: suggestion.newStartTime
        };
      }
      if (suggestion.newDate) {
        updatedTask.meta = {
          ...updatedTask.meta,
          deadlineISO: suggestion.newDate
        };
      }
      return updatedTask;

    case 'shorten':
      if (suggestion.newDuration) {
        updatedTask.meta = {
          ...updatedTask.meta,
          durationMinutes: suggestion.newDuration
        };
      }
      return updatedTask;

    case 'defer':
      if (suggestion.newDate) {
        updatedTask.meta = {
          ...updatedTask.meta,
          deadlineISO: suggestion.newDate
        };
      }
      if (suggestion.newStartTime) {
        updatedTask.meta = {
          ...updatedTask.meta,
          startTime: suggestion.newStartTime
        };
      }
      return updatedTask;

    case 'split':
      if (suggestion.splitTasks) {
        return suggestion.splitTasks.map((splitTask, index) => ({
          ...updatedTask,
          id: `${updatedTask.id}_split_${index}`,
          content: splitTask.content,
          meta: {
            ...updatedTask.meta,
            startTime: splitTask.startTime,
            durationMinutes: splitTask.duration
          }
        }));
      }
      return updatedTask;

    default:
      return updatedTask;
  }
};

/**
 * Auto-resolve conflicts by applying the best suggestion
 */
export const autoResolveConflict = (
  tasks: Task[],
  conflictingTask: Task,
  dateISO: string
): Task | Task[] => {
  const suggestions = generateConflictResolutions(tasks, conflictingTask, dateISO);
  
  if (suggestions.length === 0) {
    return conflictingTask;
  }

  // Prefer reschedule over other options
  const bestSuggestion = suggestions.find(s => s.type === 'reschedule') || suggestions[0];
  return applyConflictResolution(conflictingTask, bestSuggestion);
};