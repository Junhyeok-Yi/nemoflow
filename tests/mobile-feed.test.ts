import { describe, expect, it } from 'vitest';
import type { StickyNote } from '../lib/types';
import { filterMobileNotes, groupMobileNotesByDate } from '../lib/mobile-feed';

const note = (
  id: string,
  content: string,
  category: StickyNote['category'],
  createdAt: string,
  isCompleted = false,
): StickyNote => ({
  id,
  content,
  category,
  color: 'yellow',
  createdAt: new Date(createdAt),
  updatedAt: new Date(createdAt),
  isCompleted,
});

describe('Mobile memo feed', () => {
  const notes = [
    note('old', '어제 아이디어', '아이디어', '2026-06-14T12:00:00.000Z'),
    note('done', '완료된 할 일', 'To-Do', '2026-06-15T08:00:00.000Z', true),
    note('latest', '오늘 최신 메모', '메모', '2026-06-15T14:00:00.000Z'),
    note('todo', '오늘 할 일', 'To-Do', '2026-06-15T10:00:00.000Z'),
  ];

  it('groups notes by local calendar day and keeps newest notes first', () => {
    const groups = groupMobileNotesByDate(notes);

    expect(groups).toHaveLength(2);
    expect(groups[0].notes.map((item) => item.id)).toEqual(['latest', 'todo', 'done']);
    expect(groups[1].notes.map((item) => item.id)).toEqual(['old']);
  });

  it('filters to active to-dos without hiding other notes in the all view', () => {
    expect(filterMobileNotes(notes, 'all').map((item) => item.id)).toHaveLength(4);
    expect(filterMobileNotes(notes, 'todo').map((item) => item.id)).toEqual(['todo']);
    expect(filterMobileNotes(notes, 'idea').map((item) => item.id)).toEqual(['old']);
  });
});
