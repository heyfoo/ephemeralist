import { Task } from '../types';

export interface TimeSlot {
  start: string; // HH:MM format
  end: string;   // HH:MM format
  content: string;
  taskId: string;
}

export interface ConflictInfo {
  hasConflict: boolean;
  conflictingTasks: Task[];
  availableSlots: TimeSlot[];
  suggestedTime?: string;
}

/**
 * Convert HH:MM time string to minutes since midnight
 */
export const timeToMinutes = (time: string): number => {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
};

/**
 * Convert minutes since midnight to HH:MM format
 */
export const minutesToTime = (minutes: number): string => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
};

/**
 * Calculate end time given start time and duration
 */
export const calculateEndTime = (startTime: string, durationMinutes: number): string => {
  const startMinutes = timeToMinutes(startTime);
  const endMinutes = startMinutes + durationMinutes;
  return minutesToTime(endMinutes);
};

/**
 * Check if two time slots overlap
 */
export const timeSlotsOverlap = (
  start1: string, end1: string,
  start2: string, end2: string
): boolean => {
  const start1Min = timeToMinutes(start1);
  const end1Min = timeToMinutes(end1);
  const start2Min = timeToMinutes(start2);
  const end2Min = timeToMinutes(end2);

  return start1Min < end2Min && start2Min < end1Min;
};

/**
 * Get all scheduled time slots for a specific date
 */
export const getScheduledSlots = (tasks: Task[], dateISO: string): TimeSlot[] => {
  return tasks
    .filter(t => 
      t.meta.deadlineISO === dateISO && 
      t.meta.startTime && 
      t.meta.durationMinutes &&
      !t.isCompleted
    )
    .map(t => ({
      start: t.meta.startTime!,
      end: calculateEndTime(t.meta.startTime!, t.meta.durationMinutes!),
      content: t.content,
      taskId: t.id
    }))
    .sort((a, b) => timeToMinutes(a.start) - timeToMinutes(b.start));
};

/**
 * Check for scheduling conflicts
 */
export const checkSchedulingConflict = (
  tasks: Task[],
  dateISO: string,
  proposedStartTime: string,
  proposedDuration: number,
  excludeTaskId?: string
): ConflictInfo => {
  const existingSlots = getScheduledSlots(tasks, dateISO)
    .filter(slot => slot.taskId !== excludeTaskId);
  
  const proposedEnd = calculateEndTime(proposedStartTime, proposedDuration);
  
  const conflictingTasks: Task[] = [];
  
  for (const slot of existingSlots) {
    if (timeSlotsOverlap(proposedStartTime, proposedEnd, slot.start, slot.end)) {
      const conflictingTask = tasks.find(t => t.id === slot.taskId);
      if (conflictingTask) {
        conflictingTasks.push(conflictingTask);
      }
    }
  }

  const availableSlots = findAvailableSlots(existingSlots, proposedDuration);
  const suggestedTime = availableSlots.length > 0 ? availableSlots[0].start : undefined;

  return {
    hasConflict: conflictingTasks.length > 0,
    conflictingTasks,
    availableSlots,
    suggestedTime
  };
};

/**
 * Find available time slots for a given duration
 */
export const findAvailableSlots = (
  existingSlots: TimeSlot[],
  durationMinutes: number,
  workingHours = { start: '08:00', end: '22:00' }
): TimeSlot[] => {
  const availableSlots: TimeSlot[] = [];
  const workStart = timeToMinutes(workingHours.start);
  const workEnd = timeToMinutes(workingHours.end);
  
  // Sort existing slots by start time
  const sortedSlots = [...existingSlots].sort((a, b) => 
    timeToMinutes(a.start) - timeToMinutes(b.start)
  );

  let currentTime = workStart;

  for (const slot of sortedSlots) {
    const slotStart = timeToMinutes(slot.start);
    
    // Check if there's a gap before this slot
    if (currentTime + durationMinutes <= slotStart) {
      availableSlots.push({
        start: minutesToTime(currentTime),
        end: minutesToTime(currentTime + durationMinutes),
        content: `Available ${durationMinutes}min slot`,
        taskId: 'available'
      });
    }
    
    // Move current time to after this slot
    const slotEnd = timeToMinutes(slot.end);
    currentTime = Math.max(currentTime, slotEnd);
  }

  // Check if there's time at the end of the day
  if (currentTime + durationMinutes <= workEnd) {
    availableSlots.push({
      start: minutesToTime(currentTime),
      end: minutesToTime(currentTime + durationMinutes),
      content: `Available ${durationMinutes}min slot`,
      taskId: 'available'
    });
  }

  return availableSlots;
};

/**
 * Generate comprehensive schedule context for AI
 */
export const generateScheduleContext = (tasks: Task[], dateISO: string): string => {
  const scheduledSlots = getScheduledSlots(tasks, dateISO);
  
  if (scheduledSlots.length === 0) {
    return "No existing scheduled tasks for this date.";
  }

  const scheduleText = scheduledSlots
    .map(slot => `${slot.start}-${slot.end}: ${slot.content}`)
    .join('\n');

  // Calculate total scheduled time
  const totalMinutes = scheduledSlots.reduce((acc, slot) => {
    return acc + (timeToMinutes(slot.end) - timeToMinutes(slot.start));
  }, 0);

  const availableSlots = findAvailableSlots(scheduledSlots, 60); // Check for 1-hour slots
  const availableSlotsText = availableSlots.length > 0 
    ? `\nAvailable slots: ${availableSlots.map(s => `${s.start}-${s.end}`).join(', ')}`
    : '\nNo significant available slots remaining.';

  return `EXISTING SCHEDULE:
${scheduleText}

TOTAL SCHEDULED: ${Math.floor(totalMinutes / 60)}h ${totalMinutes % 60}m${availableSlotsText}

CONFLICT AVOIDANCE REQUIRED: You MUST schedule new tasks in available time slots only. Do not create overlapping appointments.`;
};