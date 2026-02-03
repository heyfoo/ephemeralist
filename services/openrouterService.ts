import { Task, DomainType } from "../types";
import { generateScheduleContext, checkSchedulingConflict } from "../utils/scheduling";

const getOpenRouterClient = () => {
  try {
    const apiKey = import.meta.env.VITE_OPENROUTER_API_KEY;
    if (!apiKey) return null;
    return { apiKey };
  } catch (e) {
    console.error("Environment configuration error:", e);
    return null;
  }
};

export const queryAIStream = async (
  prompt: string,
  allExistingTasks: Task[],
  onChunk: (text: string) => void,
  onComplete: (finalData?: { tasksToSchedule?: any[], domain?: DomainType, enrichment?: string, text?: string }) => void
) => {
  const client = getOpenRouterClient();
  if (!client) {
    console.error("API Key missing");
    onChunk("Error: API Key missing or invalid configuration.");
    onComplete();
    return;
  }

  // Create Temporal Context
  const now = new Date();
  const currentDayName = now.toLocaleDateString('en-US', { weekday: 'long' });
  const todayISO = now.toISOString().split('T')[0];
  const nowTime = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

  // Dynamic Map of Next 14 Days
  const next14DaysMap = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(now);
    d.setDate(now.getDate() + i);
    return `- ${d.toLocaleDateString('en-US', { weekday: 'long' })}: ${d.toISOString().split('T')[0]}`;
  }).join('\n');

  // Create comprehensive schedule context for multiple days
  const getScheduleContextForDate = (dateISO: string) => {
    return generateScheduleContext(allExistingTasks, dateISO);
  };

  // Get schedule context for today and next few days
  const todaySchedule = getScheduleContextForDate(todayISO);
  const tomorrowISO = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const tomorrowSchedule = getScheduleContextForDate(tomorrowISO);

  const fullPrompt = `
    You are THE EPHEMERALIST, an Elite Executive Assistant and Chronobiologist.
    
    USER INTENTION: "${prompt}"
    
    TEMPORAL CONTEXT:
    - Today: ${todayISO} (${currentDayName})
    - Current Time: ${nowTime}
    - 14-Day Outlook:
    ${next14DaysMap}
    
    TODAY'S SCHEDULE:
    ${todaySchedule}
    
    TOMORROW'S SCHEDULE:
    ${tomorrowSchedule}

    MISSION:
    Decompose this intention into a high-performance schedule using external knowledge and strategic planning.

    CRITICAL SCHEDULING RULES:
    1. **NO CONFLICTS**: You MUST avoid scheduling overlapping time slots. Check existing schedules carefully.
    2. **REALISTIC DURATIONS**: Estimate realistic time requirements for each task.
    3. **BUFFER TIME**: Leave 15-30 minute buffers between tasks when possible.
    4. **WORKING HOURS**: Default to 8:00-22:00 unless specified otherwise.
    5. **PRIORITY SCHEDULING**: Schedule urgent/important tasks in prime time slots.

    PROTOCOLS:
    1. **ACTIVE SEARCH**: Use Google Search for facts, deadlines, and real-world data.
    2. **BACKWARDS PLANNING**: If a deadline is found, plan backwards from it.
    3. **CONFLICT AVOIDANCE**: Before scheduling, verify the time slot is available.
    4. **JSON ONLY**: You MUST output the final answer in valid JSON format wrapped in \`\`\`json\`\`\` code blocks.

    REQUIRED JSON STRUCTURE:
    {
      "text": "Strategic synthesis...",
      "domain": "Category...",
      "enrichment": "Key insight...",
      "tasksToSchedule": [
        {
          "content": "Task Name",
          "tag": "Execution",
          "deadlineISO": "YYYY-MM-DD",
          "startTime": "HH:MM",
          "durationMinutes": 30,
          "why": "Purpose and scheduling rationale"
        }
      ]
    }
  `;

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${client.apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': window.location.origin,
        'X-Title': 'The Ephemeralist'
      },
      body: JSON.stringify({
        model: 'google/gemini-2.0-flash-001', // Using Gemini 2.0 Flash 001 via OpenRouter
        messages: [
          {
            role: 'user',
            content: fullPrompt
          }
        ],
        temperature: 0.7,
        max_tokens: 4000,
        stream: false
      })
    });

    if (!response.ok) {
      throw new Error(`OpenRouter API error: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();
    let responseText = result.choices?.[0]?.message?.content || "";

    // Extract JSON from Markdown
    let jsonString = responseText;
    const jsonMatch = responseText.match(/```json\s*([\s\S]*?)\s*```/) || responseText.match(/```\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      jsonString = jsonMatch[1];
    } else {
      // Fallback: try to find the first { and last }
      const first = responseText.indexOf('{');
      const last = responseText.lastIndexOf('}');
      if (first !== -1 && last !== -1) {
        jsonString = responseText.substring(first, last + 1);
      }
    }

    // Parse and Enrich
    try {
      const data = JSON.parse(jsonString);

      // CONFLICT VALIDATION: Check AI-generated tasks for conflicts
      if (data.tasksToSchedule && Array.isArray(data.tasksToSchedule)) {
        const validatedTasks: any[] = [];
        const conflictWarnings: string[] = [];

        for (const task of data.tasksToSchedule) {
          if (task.startTime && task.durationMinutes && task.deadlineISO) {
            const conflict = checkSchedulingConflict(
              allExistingTasks,
              task.deadlineISO,
              task.startTime,
              task.durationMinutes
            );

            if (conflict.hasConflict) {
              const conflictingTaskNames = conflict.conflictingTasks.map(t => t.content).join(', ');
              conflictWarnings.push(`⚠️ CONFLICT: "${task.content}" at ${task.startTime} conflicts with: ${conflictingTaskNames}`);

              // Try to reschedule to suggested time
              if (conflict.suggestedTime) {
                task.startTime = conflict.suggestedTime;
                task.why = (task.why || '') + ` (Rescheduled from ${task.startTime} due to conflict)`;
                conflictWarnings.push(`✅ RESOLVED: Moved "${task.content}" to ${conflict.suggestedTime}`);
              } else {
                conflictWarnings.push(`❌ UNRESOLVED: No available slot found for "${task.content}"`);
              }
            }
          }
          validatedTasks.push(task);
        }

        data.tasksToSchedule = validatedTasks;

        // Add conflict warnings to the response
        if (conflictWarnings.length > 0) {
          const warningText = '\n\nSCHEDULING CONFLICTS DETECTED:\n' + conflictWarnings.join('\n');
          if (data.text) data.text += warningText;
          if (data.enrichment) data.enrichment += warningText;
        }
      }

      if (data.text) onChunk(data.text);
      onComplete(data);
    } catch (parseError) {
      console.warn("JSON Parse Failed, falling back to raw text", parseError);
      // If parsing fails, we might just have text. Return that as the "text" field.
      onChunk(responseText);
      onComplete({
        text: responseText,
        domain: 'General',
        tasksToSchedule: [],
        enrichment: "Unstructured insight generated."
      });
    }

  } catch (error) {
    console.error("AI Sync Error:", error);
    onChunk("Architect synchronization error. Connection failed or model refused response.");
    onComplete();
  }
};
