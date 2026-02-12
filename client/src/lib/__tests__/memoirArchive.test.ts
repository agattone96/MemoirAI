import assert from 'node:assert/strict';
import test from 'node:test';
import {
  parseMessengerJson,
  buildRelationshipProfiles,
  summarizeMonth,
  generateChapterDraft,
} from '../memoirArchive.ts';

const sampleExport = {
  conversations: [
    {
      participants: [{ name: 'You' }, { name: 'Allison' }],
      messages: [
        {
          sender_name: 'Allison',
          timestamp_ms: Date.parse('2026-01-10T10:00:00.000Z'),
          content: 'I appreciate you and love this plan',
        },
        {
          sender_name: 'You',
          timestamp_ms: Date.parse('2026-01-12T10:00:00.000Z'),
          content: 'Sorry I was late, stressful week',
        },
      ],
    },
  ],
};

test('parseMessengerJson returns normalized memories', () => {
  const rows = parseMessengerJson(sampleExport);
  assert.equal(rows.length, 2);
  assert.equal(rows[0]?.sender, 'You');
  assert.equal(rows[1]?.participants.includes('Allison'), true);
});

test('buildRelationshipProfiles computes profile and story arc', () => {
  const rows = parseMessengerJson(sampleExport);
  const profiles = buildRelationshipProfiles(rows);
  assert.equal(profiles.length, 1);
  assert.equal(profiles[0]?.name, 'Allison');
  assert.equal(profiles[0]?.interactions, 2);
});

test('summarizeMonth and generateChapterDraft produce text output', () => {
  const rows = parseMessengerJson(sampleExport);
  const summary = summarizeMonth(rows, '2026-01');
  const draft = generateChapterDraft(rows, 'Test Chapter');

  assert.match(summary, /2026-01 includes 2 moments/);
  assert.match(draft, /Chapter: Test Chapter/);
});
