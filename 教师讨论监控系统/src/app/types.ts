export interface Discussion {
  id: string;
  title: string;
  topic: string;
  createdAt: string;
  status: 'draft' | 'active' | 'paused' | 'completed';
  duration: number; // in seconds
  startTime?: number;
  pausedTime?: number;
  joinCode: string;
}

export interface Idea {
  id: string;
  content: string;
  groupId: string;
  timestamp: string;
  selected: boolean;
  shareOrder?: number;
}

export interface Group {
  id: string;
  name: string;
  ideas: Idea[];
  discussionId: string;
  color: string;
  selected: boolean;
  shareOrder?: number;
}

export interface ShareItem {
  type: 'group' | 'idea';
  id: string;
  order: number;
  data: Group | Idea;
}
