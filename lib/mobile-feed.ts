import { StickyNote } from './types';

export type MobileFeedFilter = 'all' | 'todo' | 'idea';

export type MobileNoteGroup = {
  dateKey: string;
  notes: StickyNote[];
};

const noteTime = (note: StickyNote) => new Date(note.createdAt).getTime();

export function filterMobileNotes(
  notes: StickyNote[],
  filter: MobileFeedFilter,
): StickyNote[] {
  if (filter === 'todo') {
    return notes.filter((note) => note.category === 'To-Do' && !note.isCompleted);
  }

  if (filter === 'idea') {
    return notes.filter((note) => note.category === '아이디어');
  }

  return notes;
}

export function groupMobileNotesByDate(notes: StickyNote[]): MobileNoteGroup[] {
  const groups = new Map<string, StickyNote[]>();

  [...notes]
    .sort((a, b) => noteTime(b) - noteTime(a))
    .forEach((note) => {
      const date = new Date(note.createdAt);
      const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      const group = groups.get(dateKey) ?? [];
      group.push(note);
      groups.set(dateKey, group);
    });

  return [...groups.entries()].map(([dateKey, groupedNotes]) => ({
    dateKey,
    notes: groupedNotes,
  }));
}
