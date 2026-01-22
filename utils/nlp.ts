
import { KEYWORDS } from '../constants';
import { TagType } from '../types';

export const parseText = (text: string): { tag: TagType; deadline?: string; deadlineISO?: string; startTime?: string } => {
  const lowerText = text.toLowerCase();
  
  // 1. Tag Detection
  let detectedTag: TagType = 'None';
  
  for (const [key, tag] of Object.entries(KEYWORDS)) {
    if (lowerText.includes(key)) {
      detectedTag = tag;
      break; 
    }
  }

  // Heuristic fallbacks for common verbs
  if (detectedTag === 'None' && text.length > 3) {
      const firstWord = lowerText.split(' ')[0];
      if (['make', 'do', 'run', 'fix', 'ship', 'review', 'draft', 'call', 'meet', 'email'].includes(firstWord)) {
          detectedTag = 'Execution';
      }
  }

  // 2. Deadline & Date Detection
  let deadline: string | undefined = undefined;
  let deadlineISO: string | undefined = undefined;
  const today = new Date();
  
  // Specific Day Detection
  const daysOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const dayMatch = daysOfWeek.find(d => lowerText.includes(d));

  if (dayMatch) {
    const currentDayIndex = today.getDay(); // 0 = Sunday
    const targetDayIndex = daysOfWeek.indexOf(dayMatch);
    
    let daysToAdd = targetDayIndex - currentDayIndex;
    if (daysToAdd <= 0) daysToAdd += 7; // Default to next occurrence
    
    // If user says the current day name, they usually mean today (if said early) or next week.
    // However, for immediate "todo" feedback, if I say "Tuesday" on a Tuesday, I likely mean Today.
    if (daysToAdd === 7 && lowerText.includes('next')) {
       // Keep it as next week (7 days away)
    } else if (daysToAdd === 7) {
       // If explicitly "this [day]", reset to 0. 
       // Simple heuristic: If no "next", assume Today if it matches today.
       // But strictly 0 means today.
       if (targetDayIndex === currentDayIndex) daysToAdd = 0;
    }

    const targetDate = new Date(today);
    targetDate.setDate(today.getDate() + daysToAdd);
    
    deadline = dayMatch.charAt(0).toUpperCase() + dayMatch.slice(1);
    deadlineISO = targetDate.toISOString().split('T')[0];
  }

  // Relative Date Overrides
  if (lowerText.includes('tomorrow')) {
     const tmrw = new Date(today);
     tmrw.setDate(tmrw.getDate() + 1);
     deadline = "Tomorrow";
     deadlineISO = tmrw.toISOString().split('T')[0];
  } else if (lowerText.includes('today')) {
      deadline = "Today";
      deadlineISO = today.toISOString().split('T')[0];
  }

  // 3. Time Detection (Simple Extraction)
  // Matches: 2pm, 2:30pm, 14:00
  let startTime: string | undefined = undefined;
  const timeRegex = /(\d{1,2})(?::(\d{2}))?\s*(am|pm)|(\d{1,2}):(\d{2})/;
  const timeMatch = lowerText.match(timeRegex);

  if (timeMatch) {
    // 12h format
    if (timeMatch[3]) {
      let hours = parseInt(timeMatch[1]);
      const minutes = timeMatch[2] || '00';
      const period = timeMatch[3];
      
      if (period === 'pm' && hours < 12) hours += 12;
      if (period === 'am' && hours === 12) hours = 0;
      
      startTime = `${String(hours).padStart(2, '0')}:${minutes}`;
    } 
    // 24h format
    else if (timeMatch[4]) {
      startTime = `${timeMatch[4].padStart(2, '0')}:${timeMatch[5]}`;
    }
  }

  return { tag: detectedTag, deadline, deadlineISO, startTime };
};

export const generateId = () => {
    return Math.random().toString(36).substr(2, 9);
};
