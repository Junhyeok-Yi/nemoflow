'use client';

import { useState, useEffect } from 'react';
import { StickyNote, ViewMode } from '@/lib/types';
import { categorizeContent } from '@/lib/ai-categorizer';
import { 
  fetchNotesFromSupabase, 
  saveNoteToSupabase, 
  updateNoteInSupabase, 
  deleteNoteFromSupabase,
  migrateLocalStorageToSupabase,
  checkSupabaseConnection 
} from '@/lib/supabase-api';
import { supabase } from '@/lib/supabase';
import StickyNoteInput from '@/components/StickyNoteInput';
import AffinityDiagram, { SortType } from '@/components/AffinityDiagram';
import { useToast } from "@/hooks/use-toast";

type MeetingSession = {
  id: string;
  title: string;
  status: 'active' | 'ended';
  started_at: string;
  ended_at: string | null;
};

export default function Home() {
  const [viewMode, setViewMode] = useState<ViewMode>('memo');
  const [notes, setNotes] = useState<StickyNote[]>([]);
  const [currentNote, setCurrentNote] = useState<StickyNote | null>(null);
  const [isClassifying, setIsClassifying] = useState(false);
  const [isSupabaseConnected, setIsSupabaseConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [meetingMode, setMeetingMode] = useState(false);
  const [activeMeeting, setActiveMeeting] = useState<MeetingSession | null>(null);
  const [diagramSortType, setDiagramSortType] = useState<SortType>('category');
  const [editEntryView, setEditEntryView] = useState<ViewMode>('memo');
  const { toast } = useToast();

  const parseJsonSafe = async (res: Response): Promise<{ json: unknown; raw: string }> => {
    const raw = await res.text();
    if (!raw) return { json: null, raw: '' };
    try {
      return { json: JSON.parse(raw), raw };
    } catch {
      return { json: null, raw };
    }
  };

  const fetchActiveMeeting = async () => {
    try {
      const res = await fetch('/api/meetings/active', { cache: 'no-store' });
      const { json, raw } = await parseJsonSafe(res);
      if (!res.ok) {
        const msg = (json as { error?: string } | null)?.error || `활성 회의 조회 실패 (HTTP ${res.status})`;
        throw new Error(`${msg}${raw ? ` | ${raw.slice(0, 120)}` : ''}`);
      }
      const session = (json as { activeSession?: MeetingSession | null } | null)?.activeSession ?? null;
      setActiveMeeting(session);
      // UX 정책: 새로고침 진입 기본값은 항상 OFF
      setMeetingMode(false);
    } catch (error) {
      console.error('활성 회의 조회 실패:', error);
    }
  };

  const startMeetingMode = async () => {
    // 새로고침 직후 OFF 상태에서도 서버에 활성 세션이 있으면 재사용
    if (activeMeeting?.id) {
      setMeetingMode(true);
      return;
    }

    const title = `회의 ${new Date().toLocaleString()}`;
    const res = await fetch('/api/meetings/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title }),
    });
    const { json, raw } = await parseJsonSafe(res);
    const data = json as { error?: string; session?: MeetingSession } | null;
    if (!res.ok || !data?.session) {
      const msg = data?.error || `회의 시작 실패 (HTTP ${res.status})`;
      throw new Error(`${msg}${raw ? ` | ${raw.slice(0, 120)}` : ''}`);
    }
    setActiveMeeting(data.session);
    setMeetingMode(true);
  };

  const endMeetingMode = async () => {
    if (!activeMeeting?.id) {
      setMeetingMode(false);
      return;
    }
    const res = await fetch(`/api/meetings/${activeMeeting.id}/end`, { method: 'POST' });
    const { json, raw } = await parseJsonSafe(res);
    const data = json as { error?: string } | null;
    if (!res.ok && res.status !== 409) {
      const msg = data?.error || `회의 종료 실패 (HTTP ${res.status})`;
      throw new Error(`${msg}${raw ? ` | ${raw.slice(0, 120)}` : ''}`);
    }
    setActiveMeeting(null);
    setMeetingMode(false);
  };

  const handleToggleMeetingMode = async () => {
    try {
      if (meetingMode) {
        await endMeetingMode();
        toast({ title: '회의 모드 OFF', description: '회의 모드를 종료했습니다.' });
      } else {
        await startMeetingMode();
        toast({ title: '회의 모드 ON', description: '이제 작성한 메모는 현재 회의로 기록됩니다.' });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : '회의 모드 전환 실패';
      toast({ title: '회의 모드 전환 실패', description: message, variant: 'destructive' });
    }
  };

  // 앱 초기화
  useEffect(() => {
    const initializeApp = async () => {
      setIsLoading(true);
      try {
        // Supabase 연결 확인
        const isConnected = await checkSupabaseConnection();
        setIsSupabaseConnected(isConnected);
        
        if (isConnected) {
          // LocalStorage 데이터 마이그레이션 (최초 1회)
          await migrateLocalStorageToSupabase();
          
          // Supabase에서 노트 가져오기
          const supabaseNotes = await fetchNotesFromSupabase();
          setNotes(supabaseNotes);

          // 현재 활성 회의 상태 동기화
          await fetchActiveMeeting();
        } else {
          // LocalStorage에서 노트 가져오기
          const savedNotes = localStorage.getItem('sticky-notes');
          if (savedNotes) {
            setNotes(JSON.parse(savedNotes));
          }
        }
      } catch (error) {
        console.error('앱 초기화 실패:', error);
        toast({
          title: "데이터 로드 실패",
          description: "새로고침을 시도해주세요.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    initializeApp();
  }, [toast]);

  // Supabase Realtime 구독
  useEffect(() => {
    if (!isSupabaseConnected) {
      console.log('Realtime: Supabase 미연결, 구독 비활성화');
      return;
    }

    console.log('Realtime: Supabase 연결됨, 구독 시작 시도...');
    
    const channel = supabase
      .channel('sticky_notes_changes', {
        config: {
          broadcast: { self: true }
        }
      })
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'sticky_notes'
        },
        async (payload) => {
          console.log('Realtime: 데이터베이스 변경 감지:', payload);
          const supabaseNotes = await fetchNotesFromSupabase();
          setNotes(supabaseNotes);
          console.log('Realtime: 📱💻 실시간 동기화 완료');
        }
      )
      .subscribe((status) => {
        console.log('Realtime: 구독 상태:', status);
        if (status === 'SUBSCRIBED') {
          console.log('Realtime: ✅ 채널 구독 성공');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('Realtime: ❌ 채널 구독 에러');
        }
      });

    return () => {
      if (channel) {
        console.log('Realtime: 채널 구독 해제');
        supabase.removeChannel(channel);
      }
    };
  }, [isSupabaseConnected]);

  // 노트 저장
  const saveNotes = async (updatedNotes: StickyNote[]) => {
    try {
      if (isSupabaseConnected) {
        // Supabase에 저장
        await saveNoteToSupabase(updatedNotes[0]); // 새로운 노트는 항상 배열의 첫 번째
      } else {
        // LocalStorage에 저장
        localStorage.setItem('sticky-notes', JSON.stringify(updatedNotes));
      }
      setNotes(updatedNotes);
    } catch (error) {
      console.error('노트 저장 실패:', error);
      toast({
        title: "저장 실패",
        description: "다시 시도해주세요.",
        variant: "destructive",
      });
    }
  };

  // 노트 추가/수정
  const addNote = async (content: string, categoryOverride?: StickyNote['category']) => {
    setIsClassifying(true);
    try {
      const category = categoryOverride ?? await categorizeContent(content);
      const now = new Date();
      
      if (currentNote) {
        // 기존 노트 수정
        const updatedNote = {
          ...currentNote,
          content,
          category,
          updatedAt: now
        };
        
        if (isSupabaseConnected) {
          await updateNoteInSupabase(updatedNote);
          const updatedNotes = await fetchNotesFromSupabase();
          setNotes(updatedNotes);
        } else {
          const updatedNotes = notes.map(note => 
            note.id === currentNote.id ? updatedNote : note
          );
          localStorage.setItem('sticky-notes', JSON.stringify(updatedNotes));
          setNotes(updatedNotes);
        }
      } else {
        // 새 노트 추가
        const newNote: StickyNote = {
          id: crypto.randomUUID(),
          content,
          category,
          color: ['yellow', 'pink', 'blue', 'green'][Math.floor(Math.random() * 4)] as 'yellow' | 'pink' | 'blue' | 'green',
          createdAt: now,
          updatedAt: now,
          isCompleted: false,
          meetingSessionId: meetingMode ? activeMeeting?.id ?? null : null,
        };
        
        const updatedNotes = [newNote, ...notes];
        await saveNotes(updatedNotes);
      }
      
      setCurrentNote(null);
      // 새 메모 작성 후에는 메모 모드 유지
    } catch (error) {
      console.error('노트 추가/수정 실패:', error);
      toast({
        title: "저장 실패",
        description: "다시 시도해주세요.",
        variant: "destructive",
      });
    } finally {
      setIsClassifying(false);
    }
  };

  // 노트 삭제
  const deleteNote = async (id: string) => {
    try {
      if (isSupabaseConnected) {
        await deleteNoteFromSupabase(id);
        const updatedNotes = await fetchNotesFromSupabase();
        setNotes(updatedNotes);
      } else {
        const updatedNotes = notes.filter(note => note.id !== id);
        localStorage.setItem('sticky-notes', JSON.stringify(updatedNotes));
        setNotes(updatedNotes);
      }
    } catch (error) {
      console.error('노트 삭제 실패:', error);
      toast({
        title: "삭제 실패",
        description: "다시 시도해주세요.",
        variant: "destructive",
      });
    }
  };

  // 노트 완료 처리
  const toggleNoteCompletion = async (id: string) => {
    try {
      const noteToUpdate = notes.find(note => note.id === id);
      if (!noteToUpdate) return;

      const updatedNote = {
        ...noteToUpdate,
        isCompleted: !noteToUpdate.isCompleted,
        updatedAt: new Date()
      };

      if (isSupabaseConnected) {
        await updateNoteInSupabase(updatedNote);
        const updatedNotes = await fetchNotesFromSupabase();
        setNotes(updatedNotes);
      } else {
        const updatedNotes = notes.map(note =>
          note.id === id ? updatedNote : note
        );
        localStorage.setItem('sticky-notes', JSON.stringify(updatedNotes));
        setNotes(updatedNotes);
      }
    } catch (error) {
      console.error('노트 완료 처리 실패:', error);
      toast({
        title: "상태 변경 실패",
        description: "다시 시도해주세요.",
        variant: "destructive",
      });
    }
  };

  const handleDiagramNoteSelect = (note: StickyNote | null) => {
    setEditEntryView('diagram');
    setCurrentNote(note);
  };

  const handleEditedNoteSaved = () => {
    if (editEntryView === 'diagram') {
      setViewMode('diagram');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <main className="min-h-screen relative">
      {/* 회의 모드 토글 버튼 - 화면 우상단 고정 */}
      {isSupabaseConnected && viewMode === 'memo' && (
        <div className="fixed top-4 right-4 z-30">
          <button
            type="button"
            onClick={handleToggleMeetingMode}
            className={`min-h-[44px] min-w-[92px] rounded-xl px-4 py-2 text-sm font-semibold shadow-lg transition-all duration-200 ease-in-out ${
              meetingMode
                ? 'bg-emerald-500 text-white hover:bg-emerald-600'
                : 'bg-white text-slate-800 border border-slate-200 hover:bg-slate-50'
            }`}
            title={activeMeeting?.title ?? '새 회의 시작'}
          >
            회의 {meetingMode ? 'ON' : 'OFF'}
          </button>
        </div>
      )}

      {viewMode === 'memo' ? (
        <StickyNoteInput
          currentNote={currentNote}
          setCurrentNote={setCurrentNote}
          onSave={addNote}
          onDelete={deleteNote}
          onSwitchToAffinity={() => setViewMode('diagram')}
          onComplete={toggleNoteCompletion}
          isClassifying={isClassifying}
          onEditedNoteSaved={handleEditedNoteSaved}
        />
      ) : (
        <AffinityDiagram
          notes={notes}
          onNoteSelect={handleDiagramNoteSelect}
          onSwitchToMemo={() => setViewMode('memo')}
          onNoteComplete={toggleNoteCompletion}
          onNoteDelete={deleteNote}
          sortType={diagramSortType}
          onSortTypeChange={setDiagramSortType}
        />
      )}

      {/* 오프라인/로컬 모드에서만 표시 */}
      {!isSupabaseConnected && (
        <div className="fixed top-4 right-4 z-30">
          <div className="px-3 py-1.5 rounded-lg text-xs md:text-sm font-medium bg-white/95 backdrop-blur-sm border border-amber-200 text-amber-700 shadow">
            Local 모드
          </div>
        </div>
      )}
    </main>
  );
}