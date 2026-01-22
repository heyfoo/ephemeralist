
export type TagType = 'Urgent' | 'Learning' | 'Idea' | 'Research' | 'Execution' | 'Waiting' | 'Neural Reset' | 'None';
export type DomainType = 'Entrepreneurship' | 'Academic' | 'Research' | 'Personal' | 'General';

export interface TaskMetadata {
  created_at: string; 
  deadline?: string; 
  deadlineISO?: string; 
  scheduled_for?: string;
  startTime?: string; // e.g., "09:00"
  durationMinutes?: number; // e.g., 60
  why?: string; 
  after?: string; 
  completed_at?: string | null;
  domain?: DomainType;
  isAISubtask?: boolean;
  parentTaskId?: string; // Links back to the original notepad task/hub
}

export interface SpaceContent {
  rawDump: string;
  links: string[];
  enrichment: string;
  actionItems: Task[];
}

export interface Task {
  id: string;
  content: string;
  isCompleted: boolean;
  depth: number;
  tag: TagType;
  meta: TaskMetadata;
  collapsed: boolean;
  artifactIds?: string[]; 
  spaceContent?: SpaceContent;
}

export interface Artifact {
  id: string;
  sourceTaskId: string; 
  query: string;
  content: string;
  status: 'generating' | 'complete' | 'error';
  view: 'grid' | 'expanded' | 'docked';
  created_at: string;
  domain?: DomainType;
}

export interface AIResponse {
  text: string;
  suggestedTasks?: Partial<Task>[];
}
