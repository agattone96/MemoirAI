import { Memory, AISnapshot, ImportJob } from '@/types';

// Mock memories data
export const mockMemories: Memory[] = [
  {
    id: 'm1',
    timestamp: '2024-01-15T14:30:00Z',
    platform: 'whatsapp',
    type: 'message',
    participants: ['Sarah Chen', 'You'],
    content: 'Remember that hiking trip we planned? I found the perfect trail in the Blue Ridge Mountains! The autumn colors should be stunning.',
    metadata: {
      reactions: 3
    }
  },
  {
    id: 'm2',
    timestamp: '2024-01-14T09:20:00Z',
    platform: 'facebook',
    type: 'post',
    participants: ['You'],
    content: 'Finally finished reading "The Midnight Library". Such a profound exploration of choices and parallel lives. Anyone else read this?',
    metadata: {
      reactions: 24,
      mediaCount: 1
    }
  },
  {
    id: 'm3',
    timestamp: '2024-01-12T18:45:00Z',
    platform: 'instagram',
    type: 'message',
    participants: ['Marcus Lee', 'You'],
    content: 'Dude, that concert last night was INSANE! The acoustic set they did for the encore gave me chills.',
    metadata: {
      reactions: 1
    }
  },
  {
    id: 'm4',
    timestamp: '2024-01-10T11:15:00Z',
    platform: 'notes',
    type: 'note',
    participants: ['You'],
    content: 'Project ideas for 2024:\n- Build that personal archive tool I\'ve been thinking about\n- Learn pottery (finally!)\n- Start morning meditation habit\n- Visit Japan in spring',
  },
  {
    id: 'm5',
    timestamp: '2024-01-08T16:00:00Z',
    platform: 'whatsapp',
    type: 'message',
    participants: ['Mom', 'You'],
    content: 'Your grandmother loved the photo album you made! She spent all afternoon going through it with her friends at the center.',
    metadata: {
      reactions: 5
    }
  },
  {
    id: 'm6',
    timestamp: '2023-12-28T20:30:00Z',
    platform: 'twitter',
    type: 'post',
    participants: ['You'],
    content: 'Hot take: The best productivity system is the one you actually use. Stop optimizing your tools and just start creating.',
    metadata: {
      reactions: 142
    }
  },
  {
    id: 'm7',
    timestamp: '2023-12-20T13:00:00Z',
    platform: 'facebook',
    type: 'message',
    participants: ['College Friends Group', 'You'],
    content: 'Can we please do a reunion in 2024? It\'s been way too long since we\'ve all been in the same room!',
    metadata: {
      reactions: 8
    }
  },
  {
    id: 'm8',
    timestamp: '2023-12-15T10:30:00Z',
    platform: 'notes',
    type: 'note',
    participants: ['You'],
    content: 'Therapy session insights: I keep waiting for "someday" instead of making today meaningful. What if I stopped postponing joy?',
  }
];

// Mock AI snapshots
export const mockSnapshots: AISnapshot[] = [
  {
    id: 's1',
    title: 'January 2024: New Beginnings',
    dateRange: {
      start: '2024-01-01T00:00:00Z',
      end: '2024-01-31T23:59:59Z'
    },
    narrative: 'January marked a period of reflection and planning. You began exploring creative outlets, with notes about learning pottery and building a personal archive tool. Social connections deepened through conversations about shared experiences—from concert memories with Marcus to planning a hiking trip with Sarah in the Blue Ridge Mountains.\n\nA particularly meaningful moment came when your mother shared that the photo album you created brought joy to your grandmother and her friends. This reflects a growing appreciation for preserving and sharing memories across generations.',
    citations: [
      {
        id: 'c1',
        memoryId: 'm1',
        quote: 'I found the perfect trail in the Blue Ridge Mountains!',
        timestamp: '2024-01-15T14:30:00Z'
      },
      {
        id: 'c2',
        memoryId: 'm4',
        quote: 'Build that personal archive tool I\'ve been thinking about',
        timestamp: '2024-01-10T11:15:00Z'
      },
      {
        id: 'c3',
        memoryId: 'm5',
        quote: 'Your grandmother loved the photo album you made!',
        timestamp: '2024-01-08T16:00:00Z'
      }
    ],
    versions: [
      {
        id: 'v1',
        narrative: 'January marked a period of reflection and planning...',
        createdAt: '2024-01-30T10:00:00Z',
        changeNote: 'Initial generation'
      }
    ],
    createdAt: '2024-01-30T10:00:00Z',
    updatedAt: '2024-01-30T10:00:00Z'
  }
];

// Mock import jobs
export const mockImportJobs: ImportJob[] = [
  {
    id: 'j1',
    filename: 'facebook_messages_2023.json',
    status: 'completed',
    progress: 100,
    totalRecords: 1247,
    processedRecords: 1247,
    startedAt: '2024-01-28T14:22:00Z',
    completedAt: '2024-01-28T14:25:30Z'
  },
  {
    id: 'j2',
    filename: 'instagram_messages.json',
    status: 'completed',
    progress: 100,
    totalRecords: 532,
    processedRecords: 532,
    startedAt: '2024-01-29T09:15:00Z',
    completedAt: '2024-01-29T09:17:45Z'
  }
];
