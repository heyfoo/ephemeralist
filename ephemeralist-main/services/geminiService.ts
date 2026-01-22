import { GoogleGenAI } from "@google/genai";
import { Task, DomainType } from "../types";

const getAIClient = () => {
  try {
    if (!process.env.API_KEY) return null;
    return new GoogleGenAI({ apiKey: process.env.API_KEY });
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
  const ai = getAIClient();
  if (!ai) {
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

  const scheduledBlocks = allExistingTasks
    .filter(t => t.meta.deadlineISO === todayISO && t.meta.startTime)
    .map(t => ({
      content: t.content,
      start: t.meta.startTime,
      duration: t.meta.durationMinutes
    }));

  const fullPrompt = `
    You are THE EPHEMERALIST, an Elite Executive Assistant and Chronobiologist.
    
    USER INTENTION: "${prompt}"
    
    TEMPORAL CONTEXT:
    - Today: ${todayISO} (${currentDayName})
    - Current Time: ${nowTime}
    - 14-Day Outlook:
    ${next14DaysMap}
    
    EXISTING SCHEDULE FOR TODAY: 
    ${JSON.stringify(scheduledBlocks)}

    MISSION:
    Decompose this intention into a high-performance schedule using external knowledge and strategic planning.

    PROTOCOLS:
    1. **ACTIVE SEARCH**: Use Google Search for facts, deadlines, and real-world data.
    2. **BACKWARDS PLANNING**: If a deadline is found, plan backwards from it.
    3. **JSON ONLY**: You MUST output the final answer in valid JSON format wrapped in \`\`\`json\`\`\` code blocks.

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
          "why": "Purpose"
        }
      ]
    }
  `;

  try {
    // NOTE: When using googleSearch, we cannot enforce responseMimeType: "application/json" strictly
    // as it conflicts with the tool use tokens. We rely on the prompt to get JSON.
    const result = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: fullPrompt,
      config: {
        tools: [{ googleSearch: {} }]
      }
    });

    // 1. Extract Grounding Metadata (Sources)
    const groundingMetadata = result.candidates?.[0]?.groundingMetadata;
    let sourcesText = "";
    if (groundingMetadata?.groundingChunks) {
      const urls = groundingMetadata.groundingChunks
        .map((c: any) => c.web?.uri || c.web?.title)
        .filter((u: string) => u);
      if (urls.length > 0) {
        // De-duplicate and format
        const uniqueUrls = [...new Set(urls)];
        sourcesText = ` [Sources: ${uniqueUrls.slice(0, 3).map((u: string) => {
          try { return new URL(u).hostname; } catch { return u; }
        }).join(', ')}]`;
      }
    }

    let responseText = result.text || "";

    // 2. Extract JSON from Markdown
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

    // 3. Parse and Enrich
    try {
      const data = JSON.parse(jsonString);

      // Append sources to enrichment or text
      if (sourcesText) {
        if (data.enrichment) data.enrichment += sourcesText;
        else if (data.text) data.text += sourcesText;
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
        enrichment: "Unstructured insight generated." + sourcesText
      });
    }

  } catch (error) {
    console.error("AI Sync Error:", error);
    onChunk("Architect synchronization error. Connection failed or model refused response.");
    onComplete();
  }
};