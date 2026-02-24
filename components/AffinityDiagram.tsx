'use client';

import { useState, useEffect } from 'react';
import { StickyNote } from '@/lib/types';
import { getCategoryPriority } from '@/lib/ai-categorizer';
import { classifyTopicSmart } from '@/lib/smart-topic-extractor';
import { Edit3, Grid, MoreVertical, Check, Trash2, X, RotateCcw } from 'lucide-react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type SortType = 'category' | 'topic' | 'time';

interface AffinityDiagramProps {
  notes: StickyNote[];
  onNoteSelect: (note: StickyNote | null) => void;
  onSwitchToMemo: () => void;
  onNoteComplete: (id: string) => void;
  onNoteDelete: (id: string) => void;
}

export default function AffinityDiagram({
  notes,
  onNoteSelect,
  onSwitchToMemo,
  onNoteComplete,
  onNoteDelete
}: AffinityDiagramProps) {
  const [sortType, setSortType] = useState<SortType>('category');
  const [actionFeedback, setActionFeedback] = useState<{ [key: string]: 'complete' | 'delete' | null }>({});
  
  const handleNoteClick = (note: StickyNote, e: React.MouseEvent<HTMLElement>) => {
    // 더보기 메뉴 클릭 시 이벤트 전파 중단
    if ((e.target as HTMLElement).closest('.more-menu')) {
      e.stopPropagation();
      return;
    }
    onNoteSelect(note);
    onSwitchToMemo();
  };

  const handleNewMemo = () => {
    onNoteSelect(null);
    onSwitchToMemo();
  };

  // 스마트 토픽 분류 테스트 (개발용)
  useEffect(() => {
    if (notes.length > 3 && process.env.NODE_ENV === 'development') {
      // 개발 환경에서만 토픽 분류 성능 테스트
      console.log('🧪 스마트 토픽 분류 테스트 실행');
      import('@/lib/smart-topic-extractor').then(({ testSmartTopicExtractor }) => {
        testSmartTopicExtractor();
      });
    }
  }, [notes.length]);


  // 완료 처리 with 피드백
  const handleComplete = (noteId: string, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    
    // 피드백 표시
    setActionFeedback(prev => ({ ...prev, [noteId]: 'complete' }));
    
    // 실제 완료 처리
    setTimeout(() => {
      onNoteComplete(noteId);
      // 피드백 제거
      setTimeout(() => {
        setActionFeedback(prev => ({ ...prev, [noteId]: null }));
      }, 500);
    }, 300);
  };

  // 삭제 처리 with 피드백
  const handleDelete = (noteId: string, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    
    // 피드백 표시
    setActionFeedback(prev => ({ ...prev, [noteId]: 'delete' }));
    
    // 실제 삭제 처리
    setTimeout(() => {
      onNoteDelete(noteId);
      // 피드백 제거
      setTimeout(() => {
        setActionFeedback(prev => ({ ...prev, [noteId]: null }));
      }, 500);
    }, 300);
  };

  // 완료 해제 (토글 재사용)
  const handleUncomplete = (noteId: string, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }

    setActionFeedback(prev => ({ ...prev, [noteId]: 'complete' }));

    setTimeout(() => {
      onNoteComplete(noteId);
      setTimeout(() => {
        setActionFeedback(prev => ({ ...prev, [noteId]: null }));
      }, 500);
    }, 300);
  };

  // 스마트 토픽 추출 (컨텍스트 + 개인 패턴 기반)
  const extractTopic = (content: string): string => {
    // 새로운 스마트 토픽 분류기 사용
    const result = classifyTopicSmart(content, notes);
    return result.topic;
  };

  // 주제별 그룹화 함수 (스마트 토픽 분류 적용)
  const groupByTopic = (notes: StickyNote[]) => {
    return notes.reduce((acc, note) => {
      const topic = extractTopic(note.content);
      
      // 개발 환경에서 토픽 분류 과정 디버깅
      if (process.env.NODE_ENV === 'development' && Math.random() < 0.1) { // 10% 확률로 디버깅
        import('@/lib/smart-topic-extractor').then(({ debugTopicClassification }) => {
          debugTopicClassification(note.content, notes);
        });
      }
      
      if (!acc[topic]) {
        acc[topic] = [];
      }
      acc[topic].push(note);
      return acc;
    }, {} as Record<string, StickyNote[]>);
  };


  // 카테고리별 그룹화 함수
  const groupByCategory = (notes: StickyNote[]) => {
    return notes.reduce((acc, note) => {
      if (!acc[note.category]) {
        acc[note.category] = [];
      }
      acc[note.category].push(note);
      return acc;
    }, {} as Record<string, StickyNote[]>);
  };

  // 시간별 정렬 함수
  const sortByTime = (notes: StickyNote[]) => {
    const sortedNotes = [...notes].sort((a, b) => {
      const dateA = a.createdAt instanceof Date ? a.createdAt : new Date(a.createdAt);
      const dateB = b.createdAt instanceof Date ? b.createdAt : new Date(b.createdAt);
      return dateB.getTime() - dateA.getTime();
    });
    
    // 날짜별로 그룹화
    const groupedByDate = sortedNotes.reduce((acc, note) => {
      const noteDate = note.createdAt instanceof Date ? note.createdAt : new Date(note.createdAt);
      const dateKey = format(noteDate, 'yyyy-MM-dd');
      if (!acc[dateKey]) {
        acc[dateKey] = [];
      }
      acc[dateKey].push(note);
      return acc;
    }, {} as Record<string, StickyNote[]>);

    return { sortedNotes, groupedByDate };
  };

  // 정렬된 노트와 그룹 가져오기
  const getSortedNotesAndGroups = () => {
    switch (sortType) {
      case 'category':
        const groupedByCategory = groupByCategory(notes);
        const sortedCategories = Object.keys(groupedByCategory).sort((a, b) => {
          return getCategoryPriority(a as 'To-Do' | '메모' | '아이디어') - getCategoryPriority(b as 'To-Do' | '메모' | '아이디어');
        });
        return { groups: sortedCategories, groupedNotes: groupedByCategory, isTimeline: false };
      
      case 'topic':
        const groupedByTopic = groupByTopic(notes);
        const sortedTopics = Object.keys(groupedByTopic).sort();
        return { groups: sortedTopics, groupedNotes: groupedByTopic, isTimeline: false };
      
      case 'time':
        const { groupedByDate } = sortByTime(notes);
        const sortedDates = Object.keys(groupedByDate).sort().reverse();
        return { groups: sortedDates, groupedNotes: groupedByDate, isTimeline: true };
      
      default:
        return { groups: [], groupedNotes: {}, isTimeline: false };
    }
  };

  // 🎨 M2Z1 스타일 카테고리별 색상 테마 (라이트 모드)
  const getTheme = (group: string) => {
    switch (group) {
      case 'To-Do':
        return {
          accent: 'text-pink-600',
          badgeColor: 'bg-pink-50 text-pink-700 border-pink-200',
          completedColor: 'bg-green-50 text-green-700 border-green-200'
        };
      case '아이디어':
        return {
          accent: 'text-blue-600',
          badgeColor: 'bg-blue-50 text-blue-700 border-blue-200',
          completedColor: 'bg-green-50 text-green-700 border-green-200'
        };
      default:
        return {
          accent: 'text-amber-600',
          badgeColor: 'bg-amber-50 text-amber-700 border-amber-200',
          completedColor: 'bg-green-50 text-green-700 border-green-200'
        };
    }
  };

  const { groups, groupedNotes, isTimeline } = getSortedNotesAndGroups();

  const renderNoteCard = (note: StickyNote, group: string, mobile = false) => (
    <div
      key={note.id}
      onClick={(e) => handleNoteClick(note, e)}
      className={`group relative aspect-square cursor-pointer transition-all duration-300 ${mobile ? 'snap-center shrink-0 w-[78vw] max-w-[340px]' : 'hover:scale-105'}`}
    >
      <div className={`relative w-full h-full rounded-2xl shadow-lg transition-all duration-300 ${
        note.color === 'yellow' ? 'bg-gradient-to-br from-yellow-200 to-yellow-300' :
        note.color === 'pink' ? 'bg-gradient-to-br from-pink-200 to-pink-300' :
        note.color === 'blue' ? 'bg-gradient-to-br from-blue-200 to-blue-300' :
        'bg-gradient-to-br from-green-200 to-green-300'
      } ${mobile ? '' : 'group-hover:shadow-2xl'}`}>

        <div className="absolute top-2 right-2 z-50 more-menu">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="p-2 text-gray-600 hover:text-gray-800 transition-colors hover:bg-white/80 rounded-full shadow-sm"
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                }}
              >
                <MoreVertical className="w-4 h-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-36">
              {!note.isCompleted ? (
                <DropdownMenuItem onClick={(e) => handleComplete(note.id, e)}>
                  <Check className="w-4 h-4 mr-2" />
                  <span>완료</span>
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem onClick={(e) => handleUncomplete(note.id, e)}>
                  <RotateCcw className="w-4 h-4 mr-2" />
                  <span>완료 해제</span>
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={(e) => handleDelete(note.id, e)}>
                <Trash2 className="w-4 h-4 mr-2" />
                <span>삭제</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-12 h-3 bg-yellow-400/40 rounded-b-lg"></div>

        <div className="relative h-full flex flex-col justify-between p-6 pt-8">
          <div className="flex-1 flex items-center justify-center">
            <p className="text-gray-800 text-center leading-relaxed font-medium text-sm">
              {note.content}
            </p>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-black/10">
            <span className="text-xs text-gray-600 font-medium">{group}</span>
            <span className="text-xs text-gray-500">
              {format(note.createdAt instanceof Date ? note.createdAt : new Date(note.createdAt), 'MM.dd', { locale: ko })}
            </span>
          </div>
        </div>

        {note.isCompleted && (
          <div className="absolute inset-0 bg-black/60 group-hover:bg-black/28 rounded-2xl flex items-center justify-center z-10 backdrop-blur-[1.5px] group-hover:backdrop-blur-0 transition-all duration-200">
            <div className="text-center opacity-95 group-hover:opacity-85">
              <Check className="w-8 h-8 text-green-400 mx-auto mb-2" />
              <span className="text-white font-bold text-sm">완료됨</span>
            </div>
          </div>
        )}

        {actionFeedback[note.id] && (
          <div className="absolute inset-0 bg-black/40 rounded-2xl flex items-center justify-center z-30 backdrop-blur-sm">
            <div className="bg-white/90 rounded-full p-4 shadow-lg">
              {actionFeedback[note.id] === 'complete' ? (
                <Check className="w-6 h-6 text-green-600" />
              ) : (
                <X className="w-6 h-6 text-red-600" />
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-white text-gray-900 relative">
      {/* 🎨 M2Z1 스타일 헤더 영역 (화이트 배경 최적화) */}
      <header className="w-full border-b border-gray-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-3 md:py-5">
          {/* 탭 네비게이션 */}
          <nav className="grid grid-cols-3 gap-1.5 bg-gray-100 rounded-lg p-1.5 w-full">
            <button
              onClick={() => setSortType('category')}
              className={`touch-manipulation px-2 md:px-4 py-3 md:py-3 rounded-md transition-all text-sm font-medium text-center ${
                sortType === 'category'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              Categories
            </button>
            <button
              onClick={() => setSortType('topic')}
              className={`touch-manipulation px-2 md:px-4 py-3 md:py-3 rounded-md transition-all text-sm font-medium text-center ${
                sortType === 'topic'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              Topics
            </button>
            <button
              onClick={() => setSortType('time')}
              className={`touch-manipulation px-2 md:px-4 py-3 md:py-3 rounded-md transition-all text-sm font-medium text-center ${
                sortType === 'time'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              Timeline
            </button>
          </nav>
        </div>
      </header>

      {notes.length === 0 ? (
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gray-100 flex items-center justify-center">
              <Edit3 className="w-12 h-12 text-gray-400" />
            </div>
            <h3 className="text-2xl font-bold mb-4 text-gray-800">아직 메모가 없습니다</h3>
            <p className="text-gray-600 text-lg mb-8">첫 번째 메모를 작성해서 AI 갤러리를 시작해보세요</p>
            <button
              onClick={handleNewMemo}
              className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-all shadow-sm hover:shadow-md"
            >
              새 메모 작성하기
            </button>
          </div>
        </div>
      ) : (
        <main className={`max-w-7xl mx-auto px-4 md:px-6 py-3 md:py-6 h-[calc(100vh-140px)] md:h-auto overflow-y-auto md:overflow-visible touch-pan-y ${sortType === 'time' ? 'snap-y snap-proximity md:snap-none' : 'snap-none'}`}>
          {groups.map((group) => {
            const groupNotes = groupedNotes[group];
            const activeCount = groupNotes.filter(note => !note.isCompleted).length;
            const completedCount = groupNotes.filter(note => note.isCompleted).length;

            return (
              <section key={group} className={`mb-6 md:mb-12 ${sortType === 'time' ? 'snap-start' : ''}`}>
                <div className="flex items-center justify-between mb-4 md:mb-8">
                  <div className="flex items-center gap-3 md:gap-4">
                    {isTimeline ? (
                      <h2 className="text-2xl md:text-3xl font-bold text-gray-900">
                        {format(new Date(group), 'M월 d일 (E)', { locale: ko })}
                      </h2>
                    ) : (
                      <>
                        <h2 className={`text-2xl md:text-3xl font-bold ${getTheme(group).accent}`}>{group}</h2>
                        <div className="flex items-center gap-2 md:gap-3">
                          <span className={`px-3 md:px-4 py-1.5 md:py-2 rounded-full text-xs md:text-sm font-medium border ${getTheme(group).badgeColor}`}>
                            {activeCount} items
                          </span>
                          {group === 'To-Do' && completedCount > 0 && (
                            <span className={`px-3 py-1.5 md:py-2 rounded-full text-xs md:text-sm font-medium border ${getTheme(group).completedColor}`}>
                              {completedCount} completed
                            </span>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Mobile: 1x1 horizontal snap lane */}
                <div className="md:hidden relative">
                  <div className="flex gap-4 overflow-x-auto overflow-y-visible pb-4 pr-6 snap-x snap-mandatory touch-pan-x">
                    {groupNotes.map((note) => renderNoteCard(note, group, true))}
                  </div>
                  <div className="pointer-events-none absolute right-0 top-0 h-full w-10 bg-gradient-to-l from-white to-transparent" />
                </div>

                {/* Desktop: existing grid */}
                <div className="hidden md:grid grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4">
                  {groupNotes.map((note) => renderNoteCard(note, group, false))}
                </div>

                {groupNotes.length === 0 && (
                  <div className="text-center py-12 md:py-16">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
                      <Grid className="w-8 h-8 text-gray-400" />
                    </div>
                    <p className="text-gray-600 text-base md:text-lg">
                      이 {sortType === 'category' ? '카테고리' : sortType === 'topic' ? '주제' : '날짜'}에는 아직 메모가 없습니다.
                    </p>
                  </div>
                )}
              </section>
            );
          })}
        </main>
      )}

      {/* 🎨 M2Z1 스타일 플로팅 액션 버튼 (라이트 모드) */}
      <div className="fixed bottom-6 right-6 z-20">
        <button
          onClick={handleNewMemo}
          className="group relative w-14 h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl shadow-xl hover:shadow-2xl transform hover:scale-110 transition-all duration-300 flex items-center justify-center"
          aria-label="새 메모 작성"
        >
          <Edit3 className="w-6 h-6 transition-transform group-hover:scale-110" />
          
          {/* M2Z1 스타일 툴팁 (라이트 모드) */}
          <div className="absolute bottom-full right-0 mb-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
            <div className="bg-gray-800 text-white text-sm px-3 py-2 rounded-lg whitespace-nowrap shadow-lg">
              새 메모 작성
              <div className="absolute top-full right-3 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-800"></div>
            </div>
          </div>
        </button>
      </div>
    </div>
  );
}