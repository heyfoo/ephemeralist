import { Task } from '../types';
import { checkSchedulingConflict, generateScheduleContext, findAvailableSlots, getScheduledSlots } from './scheduling';

// Test data
const testTasks: Task[] = [
  {
    id: '1',
    content: 'Morning standup',
    isCompleted: false,
    depth: 0,
    tag: 'Execution',
    collapsed: false,
    meta: {
      created_at: '2024-01-22T08:00:00Z',
      deadlineISO: '2024-01-22',
      startTime: '09:00',
      durationMinutes: 30
    }
  },
  {
    id: '2',
    content: 'Code review',
    isCompleted: false,
    depth: 0,
    tag: 'Execution',
    collapsed: false,
    meta: {
      created_at: '2024-01-22T08:00:00Z',
      deadlineISO: '2024-01-22',
      startTime: '10:00',
      durationMinutes: 60
    }
  },
  {
    id: '3',
    content: 'Lunch meeting',
    isCompleted: false,
    depth: 0,
    tag: 'Execution',
    collapsed: false,
    meta: {
      created_at: '2024-01-22T08:00:00Z',
      deadlineISO: '2024-01-22',
      startTime: '12:00',
      durationMinutes: 90
    }
  }
];

/**
 * Test conflict detection functionality
 */
export const runSchedulingTests = () => {
  console.log('🧪 Running Scheduling Conflict Tests...\n');

  // Test 1: No conflict
  console.log('Test 1: No conflict scenario');
  const noConflict = checkSchedulingConflict(testTasks, '2024-01-22', '14:00', 60);
  console.log('Result:', noConflict.hasConflict ? '❌ FAIL' : '✅ PASS');
  console.log('Suggested time:', noConflict.suggestedTime);
  console.log('');

  // Test 2: Direct overlap
  console.log('Test 2: Direct overlap scenario');
  const directConflict = checkSchedulingConflict(testTasks, '2024-01-22', '09:15', 30);
  console.log('Result:', directConflict.hasConflict ? '✅ PASS (conflict detected)' : '❌ FAIL');
  console.log('Conflicting tasks:', directConflict.conflictingTasks.map(t => t.content));
  console.log('Suggested time:', directConflict.suggestedTime);
  console.log('');

  // Test 3: Partial overlap
  console.log('Test 3: Partial overlap scenario');
  const partialConflict = checkSchedulingConflict(testTasks, '2024-01-22', '10:30', 60);
  console.log('Result:', partialConflict.hasConflict ? '✅ PASS (conflict detected)' : '❌ FAIL');
  console.log('Conflicting tasks:', partialConflict.conflictingTasks.map(t => t.content));
  console.log('Suggested time:', partialConflict.suggestedTime);
  console.log('');

  // Test 4: Available slots
  console.log('Test 4: Available slots detection');
  const scheduledSlots = getScheduledSlots(testTasks, '2024-01-22');
  const availableSlots = findAvailableSlots(scheduledSlots, 60);
  console.log('Scheduled slots:', scheduledSlots.map(s => `${s.start}-${s.end}: ${s.content}`));
  console.log('Available 60min slots:', availableSlots.map(s => `${s.start}-${s.end}`));
  console.log('');

  // Test 5: Schedule context generation
  console.log('Test 5: Schedule context for AI');
  const scheduleContext = generateScheduleContext(testTasks, '2024-01-22');
  console.log('Generated context:');
  console.log(scheduleContext);
  console.log('');

  console.log('🎉 All tests completed!');
};

// Export for console testing
if (typeof window !== 'undefined') {
  (window as any).testScheduling = runSchedulingTests;
}