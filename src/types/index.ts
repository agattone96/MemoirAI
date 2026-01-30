export interface Memory {
  id: string;
  timestamp: string;
  platform: 'facebook' | 'instagram' | 'whatsapp' | 'twitter' | 'notes' | 'other';
  type: 'message' | 'post' | 'note' | 'media';
  participants: string[];
  content: string;
  metadata?: {
    location?: string;
    mediaCount?: number;
    reactions?: number;
  };
}

export interface AISnapshot {
  id: string;
  title: string;
  dateRange: {
    start: string;
    end: string;
  };
  narrative: string;
  citations: Citation[];
  versions: SnapshotVersion[];
  createdAt: string;
  updatedAt: string;
}

export interface Citation {
  id: string;
  memoryId: string;
  quote: string;
  timestamp: string;
}

export interface SnapshotVersion {
  id: string;
  narrative: string;
  createdAt: string;
  changeNote?: string;
}

export interface ImportJob {
  id: string;
  filename: string;
  status: 'uploading' | 'processing' | 'completed' | 'failed';
  progress: number;
  totalRecords?: number;
  processedRecords?: number;
  startedAt: string;
  completedAt?: string;
  error?: string;
}

export interface TimelineFilter {
  startDate?: string;
  endDate?: string;
  platforms?: string[];
  participants?: string[];
  searchQuery?: string;
}
