import { TagType } from './types';

export const COLORS = {
  background: '#faf8f0',
  text: '#2d2a2e',
  bullet: '#a8a29e', // gray-400
  tags: {
    Urgent: '#e63946', // Red
    Learning: '#1d3557', // Blue
    Idea: '#7209b7', // Purple
    Research: '#2a9d8f', // Green
    Execution: '#f77f00', // Orange
    Waiting: '#6d6875', // Gray
    None: '#2d2a2e',
  }
};

export const KEYWORDS: Record<string, TagType> = {
  'urgent': 'Urgent',
  'asap': 'Urgent',
  'crisis': 'Urgent',
  'learn': 'Learning',
  'study': 'Learning',
  'read': 'Learning',
  'watch': 'Learning',
  'idea': 'Idea',
  'think': 'Idea',
  'concept': 'Idea',
  'research': 'Research',
  'find': 'Research',
  'look up': 'Research',
  'draft': 'Execution',
  'write': 'Execution',
  'build': 'Execution',
  'create': 'Execution',
  'email': 'Execution',
  'call': 'Execution',
  'waiting': 'Waiting',
  'blocked': 'Waiting',
};
