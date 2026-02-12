export type ArchiveMemory = {
  id: string;
  timestamp: string;
  sender: string;
  participants: string[];
  content: string;
  sentiment: number;
  source: 'Messenger';
};

export type RelationshipProfile = {
  name: string;
  interactions: number;
  firstSeen: string;
  lastSeen: string;
  avgSentiment: number;
  toneShift: 'rising' | 'stable' | 'declining';
  storyArc: {
    meeting: string;
    peak: string;
    fade: string;
  };
};

type MessengerParticipant = { name?: string };
type MessengerMessage = {
  sender_name?: string;
  timestamp_ms?: number;
  content?: string;
  photos?: unknown[];
  videos?: unknown[];
  files?: unknown[];
  reactions?: { reaction: string; actor: string }[];
};

type MessengerConversation = {
  participants?: MessengerParticipant[];
  messages?: MessengerMessage[];
};

const positiveWords = ['love', 'great', 'thanks', 'happy', 'amazing', 'excited', 'proud', 'glad', 'appreciate'];
const negativeWords = ['sorry', 'angry', 'upset', 'bad', 'hurt', 'stress', 'fight', 'sad', 'tired'];

function decodeText(value: string): string {
  try {
    return decodeURIComponent(escape(value));
  } catch {
    return value;
  }
}

function computeSentiment(text: string): number {
  const words = text.toLowerCase().split(/\W+/).filter(Boolean);
  if (!words.length) return 0;
  const p = words.filter((w) => positiveWords.includes(w)).length;
  const n = words.filter((w) => negativeWords.includes(w)).length;
  const score = ((p - n) / words.length) * 7;
  return Number(Math.max(-1, Math.min(1, score)).toFixed(2));
}

function monthKey(iso: string): string {
  const d = new Date(iso);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

export function parseMessengerJson(raw: unknown): ArchiveMemory[] {
  const payload = raw as Record<string, unknown>;
  const conversations: MessengerConversation[] = Array.isArray(payload.conversations)
    ? (payload.conversations as MessengerConversation[])
    : [payload as unknown as MessengerConversation];

  const memories: ArchiveMemory[] = [];

  conversations.forEach((conversation, ci) => {
    const participants = (conversation.participants ?? [])
      .map((p) => (p.name ? decodeText(p.name) : 'Unknown'))
      .filter(Boolean);

    (conversation.messages ?? []).forEach((m, mi) => {
      if (!m.timestamp_ms) return;
      const parts = [
        Array.isArray(m.photos) && m.photos.length ? `[${m.photos.length} photo(s)]` : '',
        Array.isArray(m.videos) && m.videos.length ? `[${m.videos.length} video(s)]` : '',
        Array.isArray(m.files) && m.files.length ? `[${m.files.length} attachment(s)]` : '',
      ].filter(Boolean);
      const content = (m.content ? decodeText(m.content) : parts.join(' ')).trim() || '(No text content)';
      const sender = m.sender_name ? decodeText(m.sender_name) : 'Unknown';

      memories.push({
        id: `msg-${ci}-${m.timestamp_ms}-${mi}`,
        timestamp: new Date(m.timestamp_ms).toISOString(),
        sender,
        participants,
        content,
        sentiment: computeSentiment(content),
        source: 'Messenger',
      });
    });
  });

  return memories.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

export function buildRelationshipProfiles(memories: ArchiveMemory[]): RelationshipProfile[] {
  const map = new Map<string, ArchiveMemory[]>();

  memories.forEach((m) => {
    const contacts = m.participants.filter((p) => p.toLowerCase() !== 'you');
    contacts.forEach((name) => {
      const existing = map.get(name) ?? [];
      existing.push(m);
      map.set(name, existing);
    });
  });

  return Array.from(map.entries())
    .map(([name, rows]) => {
      const sorted = [...rows].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
      const avgSentiment = sorted.reduce((s, m) => s + m.sentiment, 0) / Math.max(1, sorted.length);

      const monthly = sorted.reduce<Map<string, { count: number; sentiment: number }>>((acc, row) => {
        const key = monthKey(row.timestamp);
        const prior = acc.get(key) ?? { count: 0, sentiment: 0 };
        acc.set(key, { count: prior.count + 1, sentiment: prior.sentiment + row.sentiment });
        return acc;
      }, new Map());
      const points = Array.from(monthly.entries()).sort(([a], [b]) => (a < b ? -1 : 1));
      const firstTone = points[0] ? points[0][1].sentiment / points[0][1].count : 0;
      const lastTone = points[points.length - 1] ? points[points.length - 1][1].sentiment / points[points.length - 1][1].count : 0;
      const toneShift = lastTone - firstTone > 0.12 ? 'rising' : lastTone - firstTone < -0.12 ? 'declining' : 'stable';
      const peak = points.reduce((best, cur) => (cur[1].count > best[1].count ? cur : best), points[0]);

      const toIso = (ym: string) => {
        const [y, m] = ym.split('-').map(Number);
        return new Date(Date.UTC(y, m - 1, 1)).toISOString();
      };

      return {
        name,
        interactions: sorted.length,
        firstSeen: sorted[0].timestamp,
        lastSeen: sorted[sorted.length - 1].timestamp,
        avgSentiment: Number(avgSentiment.toFixed(2)),
        toneShift,
        storyArc: {
          meeting: toIso(points[0]?.[0] ?? monthKey(sorted[0].timestamp)),
          peak: toIso(peak?.[0] ?? monthKey(sorted[0].timestamp)),
          fade: toIso(points[points.length - 1]?.[0] ?? monthKey(sorted[sorted.length - 1].timestamp)),
        },
      };
    })
    .sort((a, b) => b.interactions - a.interactions);
}

export function summarizeMonth(memories: ArchiveMemory[], month: string): string {
  const rows = memories.filter((m) => monthKey(m.timestamp) === month);
  if (!rows.length) return `No moments found for ${month}.`;

  const participants = new Set(rows.flatMap((m) => m.participants));
  const avgSentiment = rows.reduce((s, m) => s + m.sentiment, 0) / rows.length;
  const tone = avgSentiment > 0.15 ? 'warm' : avgSentiment < -0.15 ? 'tense' : 'neutral';

  const highlights = rows.slice(0, 3).map((r) => `- ${r.content.slice(0, 110)}${r.content.length > 110 ? '...' : ''}`).join('\n');

  return `${month} includes ${rows.length} moments across ${participants.size} participants.\nTone: ${tone}.\nHighlights:\n${highlights}`;
}

export function generateChapterDraft(memories: ArchiveMemory[], title: string): string {
  if (!memories.length) return `Chapter: ${title}\n\nNo moments available.`;

  const sorted = [...memories].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  const opening = sorted[0];
  const recent = sorted.slice(-3);

  return [
    `Chapter: ${title}`,
    '',
    `Opening beat (${new Date(opening.timestamp).toLocaleDateString()}):`,
    `"${opening.content.slice(0, 170)}${opening.content.length > 170 ? '...' : ''}"`,
    '',
    'Later turns:',
    ...recent.map((r) => `- ${new Date(r.timestamp).toLocaleDateString()}: ${r.content.slice(0, 100)}${r.content.length > 100 ? '...' : ''}`),
    '',
    'Draft note: Expand emotional transitions and connective narration.',
  ].join('\n');
}
