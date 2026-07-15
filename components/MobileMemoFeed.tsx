'use client';

import { useMemo, useState } from 'react';
import { format, isToday } from 'date-fns';
import { ko } from 'date-fns/locale';
import { Plus } from 'lucide-react';
import { Badge } from '@astryxdesign/core/Badge';
import { Button } from '@astryxdesign/core/Button';
import { ButtonGroup } from '@astryxdesign/core/ButtonGroup';
import { ClickableCard } from '@astryxdesign/core/ClickableCard';
import { EmptyState } from '@astryxdesign/core/EmptyState';
import { filterMobileNotes, groupMobileNotesByDate, MobileFeedFilter } from '@/lib/mobile-feed';
import { StickyNote } from '@/lib/types';

type MobileMemoFeedProps = {
  notes: StickyNote[];
  onCreateNew: () => void;
  onNoteSelect: (note: StickyNote) => void;
};

const filters: Array<{ id: MobileFeedFilter; label: string }> = [
  { id: 'all', label: '전체' },
  { id: 'todo', label: 'To-do' },
  { id: 'idea', label: 'Ideas' },
];

const categoryVariant: Record<StickyNote['category'], 'green' | 'yellow' | 'purple'> = {
  'To-Do': 'green',
  '메모': 'yellow',
  '아이디어': 'purple',
};

const categoryLabel: Record<StickyNote['category'], string> = {
  'To-Do': 'To-do',
  '메모': 'Memo',
  '아이디어': 'Idea',
};

export default function MobileMemoFeed({
  notes,
  onCreateNew,
  onNoteSelect,
}: MobileMemoFeedProps) {
  const [filter, setFilter] = useState<MobileFeedFilter>('all');
  const groups = useMemo(
    () => groupMobileNotesByDate(filterMobileNotes(notes, filter)),
    [filter, notes],
  );

  return (
    <section className="md:hidden min-h-screen bg-slate-50 pb-28">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 px-5 py-4 backdrop-blur">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500">NEMOFLOW</p>
            <h1 className="text-2xl font-bold tracking-tight text-slate-950">내 메모</h1>
          </div>
        </div>
        <ButtonGroup label="메모 필터" size="sm">
          {filters.map((item) => (
            <Button
              key={item.id}
              label={item.label}
              variant={filter === item.id ? 'primary' : 'secondary'}
              onClick={() => setFilter(item.id)}
            />
          ))}
        </ButtonGroup>
      </header>

      <div className="mx-auto max-w-xl px-4 py-5">
        {groups.length === 0 ? (
          <EmptyState
            title={filter === 'all' ? '아직 메모가 없습니다' : '표시할 메모가 없습니다'}
            description={filter === 'all' ? '첫 메모를 작성해 생각을 기록해보세요.' : '필터를 바꾸거나 새 메모를 작성해보세요.'}
            isCompact
            actions={<Button label="새 메모 작성" variant="primary" onClick={onCreateNew} />}
          />
        ) : (
          <div className="space-y-7">
            {groups.map((group) => {
              const date = new Date(`${group.dateKey}T00:00:00`);
              const heading = isToday(date)
                ? `오늘 · ${format(date, 'M월 d일', { locale: ko })}`
                : format(date, 'M월 d일 (E)', { locale: ko });

              return (
                <section key={group.dateKey} aria-labelledby={`date-${group.dateKey}`}>
                  <div className="mb-3 flex items-center justify-between px-1">
                    <h2 id={`date-${group.dateKey}`} className="text-sm font-semibold text-slate-700">
                      {heading}
                    </h2>
                    <span className="text-xs text-slate-500">{group.notes.length}</span>
                  </div>
                  <div className="space-y-2">
                    {group.notes.map((note) => (
                      <ClickableCard
                        key={note.id}
                        label={`메모 열기: ${note.content}`}
                        variant="default"
                        padding={3}
                        onClick={() => onNoteSelect(note)}
                      >
                        <article className="flex min-h-16 items-center gap-3">
                          <div className={`h-10 w-1 self-stretch rounded-full ${
                            note.category === 'To-Do'
                              ? 'bg-emerald-500'
                              : note.category === '아이디어'
                                ? 'bg-violet-500'
                                : 'bg-amber-400'
                          }`} />
                          <div className="min-w-0 flex-1">
                            <p className={`line-clamp-2 text-sm leading-6 ${note.isCompleted ? 'text-slate-400 line-through' : 'font-medium text-slate-900'}`}>
                              {note.content}
                            </p>
                            <div className="mt-2 flex items-center gap-2">
                              <Badge label={categoryLabel[note.category]} variant={categoryVariant[note.category]} />
                              <span className="text-xs text-slate-500">
                                {format(new Date(note.createdAt), 'HH:mm')}
                              </span>
                              {note.isCompleted && <span className="text-xs text-slate-500">완료됨</span>}
                            </div>
                          </div>
                        </article>
                      </ClickableCard>
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </div>

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-slate-200 bg-white/95 p-4 backdrop-blur">
        <Button
          label="새 메모 작성"
          variant="primary"
          size="lg"
          icon={<Plus size={18} />}
          onClick={onCreateNew}
        />
      </div>
    </section>
  );
}
