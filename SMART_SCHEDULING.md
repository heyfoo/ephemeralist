# Smart Scheduling System

The Ephemeralist now includes intelligent conflict detection and resolution for scheduling tasks.

## Features

### 🔍 Conflict Detection
- **Real-time validation**: Detects overlapping time slots when scheduling tasks
- **Visual indicators**: Calendar shows red dots for days with conflicts
- **Detailed conflict info**: Shows which specific tasks are conflicting

### 🤖 AI-Enhanced Scheduling
- **Context-aware AI**: Gemini receives comprehensive schedule context including existing appointments and available slots
- **Automatic conflict avoidance**: AI tries to schedule new tasks in available time slots
- **Post-processing validation**: Double-checks AI suggestions for conflicts and auto-reschedules if needed

### 🛠️ Conflict Resolution
- **Smart suggestions**: Multiple resolution options including reschedule, shorten, split, or defer
- **One-click fixes**: Apply suggested resolutions with a single click
- **Flexible options**: Choose the best solution for your workflow

## How It Works

### 1. Schedule Context Generation
```typescript
// AI receives detailed schedule information
const scheduleContext = generateScheduleContext(tasks, dateISO);
// Output: "EXISTING SCHEDULE: 09:00-09:30: Morning standup..."
```

### 2. Conflict Detection
```typescript
const conflict = checkSchedulingConflict(tasks, dateISO, startTime, duration);
if (conflict.hasConflict) {
  // Show conflicting tasks and suggest alternatives
}
```

### 3. Resolution Suggestions
- **Reschedule**: Move to next available slot
- **Shorten**: Reduce duration to fit
- **Split**: Break into smaller chunks
- **Defer**: Move to next day

### 4. Visual Feedback
- Calendar days with conflicts show red indicator dots
- Conflicting tasks highlighted in red in day detail view
- Conflict warnings in task scheduling responses

## Usage

### For Users
1. **Schedule normally**: Type tasks with times like "Call John at 2pm tomorrow"
2. **Check calendar**: Look for red dots indicating conflicts
3. **Resolve conflicts**: Click on conflicted days to see resolution options
4. **Trust the AI**: The system will try to avoid conflicts automatically

### For Developers
```typescript
import { checkSchedulingConflict, generateConflictResolutions } from './utils/scheduling';

// Check for conflicts
const conflict = checkSchedulingConflict(tasks, date, time, duration);

// Get resolution suggestions
const suggestions = generateConflictResolutions(tasks, conflictingTask, date);

// Apply resolution
const resolved = applyConflictResolution(task, suggestion);
```

## Configuration

### Working Hours
Default: 8:00 AM - 10:00 PM
Can be customized in `findAvailableSlots()` function.

### Buffer Time
The system automatically tries to leave 15-30 minute buffers between tasks when possible.

### Conflict Sensitivity
Currently detects any overlap. Future versions could add "soft conflicts" for minor overlaps.

## Testing

Run the scheduling tests in browser console:
```javascript
// Open browser dev tools and run:
testScheduling();
```

This will validate conflict detection, available slot finding, and schedule context generation.

## Future Enhancements

- [ ] Recurring task conflict detection
- [ ] Multi-day scheduling optimization
- [ ] Priority-based conflict resolution
- [ ] Integration with external calendars
- [ ] Smart break time suggestions
- [ ] Meeting room availability
- [ ] Travel time calculations