// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { StickyNote } from '../lib/types';
import MobileMemoFeed from '../components/MobileMemoFeed';

afterEach(cleanup);

const notes: StickyNote[] = [
  {
    id: 'latest',
    content: '오늘 최신 메모',
    category: '메모',
    color: 'yellow',
    createdAt: new Date('2026-06-15T14:00:00.000Z'),
    updatedAt: new Date('2026-06-15T14:00:00.000Z'),
  },
  {
    id: 'todo',
    content: '오늘 할 일',
    category: 'To-Do',
    color: 'green',
    createdAt: new Date('2026-06-15T10:00:00.000Z'),
    updatedAt: new Date('2026-06-15T10:00:00.000Z'),
    isCompleted: false,
  },
];

describe('MobileMemoFeed', () => {
  it('shows newest notes in a readable feed and opens a selected memo', () => {
    const onNoteSelect = vi.fn();
    render(<MobileMemoFeed notes={notes} onCreateNew={vi.fn()} onNoteSelect={onNoteSelect} />);

    expect(screen.getByText('오늘 최신 메모')).toBeInTheDocument();
    expect(screen.getByText('오늘 할 일')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '새 메모 작성' })).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText('메모 열기: 오늘 최신 메모'));
    expect(onNoteSelect).toHaveBeenCalledWith(notes[0]);
  });

  it('filters the feed to active to-dos', () => {
    render(<MobileMemoFeed notes={notes} onCreateNew={vi.fn()} onNoteSelect={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: 'To-do' }));
    expect(screen.getByText('오늘 할 일')).toBeInTheDocument();
    expect(screen.queryByText('오늘 최신 메모')).not.toBeInTheDocument();
  });
});
