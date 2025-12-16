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
import { generateMeetingTitle } from '@/lib/meeting-title-generator';
import StickyNoteInput from '@/components/StickyNoteInput';
import AffinityDiagram from '@/components/AffinityDiagram';
import { useToast } from "@/hooks/use-toast";

export default function Home() {
  const [viewMode, setViewMode] = useState<ViewMode>('memo');
  const [notes, setNotes] = useState<StickyNote[]>([]);
  const [currentNote, setCurrentNote] = useState<StickyNote | null>(null);
  const [isClassifying, setIsClassifying] = useState(false);
  const [isSupabaseConnected, setIsSupabaseConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  
  // 회의록 모드 상태
  const [isMeetingMode, setIsMeetingMode] = useState(false);
  const [currentMeetingId, setCurrentMeetingId] = useState<string | null>(null);

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
  const addNote = async (content: string) => {
    setIsClassifying(true);
    try {
      const category = await categorizeContent(content);
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
          category: isMeetingMode ? '회의록' : category,
          color: ['yellow', 'pink', 'blue', 'green', 'purple'][Math.floor(Math.random() * 5)] as 'yellow' | 'pink' | 'blue' | 'green' | 'purple',
          createdAt: now,
          updatedAt: now,
          isCompleted: false,
          // 회의록 모드일 때 회의 정보 추가
          meetingId: isMeetingMode && currentMeetingId ? currentMeetingId : undefined,
          isMeetingMode: isMeetingMode,
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

  // 회의록 모드 토글
  const toggleMeetingMode = async () => {
    if (isMeetingMode) {
      // 회의 종료: 제목 생성
      if (currentMeetingId) {
        const title = await generateMeetingTitle(currentMeetingId, notes);
        
        // 해당 회의의 모든 메모에 제목 추가
        const meetingNotes = notes.filter(note => note.meetingId === currentMeetingId);
        for (const note of meetingNotes) {
          const updatedNote = { ...note, meetingTitle: title };
          if (isSupabaseConnected) {
            await updateNoteInSupabase(updatedNote);
          }
        }
        
        // 로컬에도 반영
        const updatedNotes = notes.map(note => 
          note.meetingId === currentMeetingId 
            ? { ...note, meetingTitle: title }
            : note
        );
        setNotes(updatedNotes);
        
        if (!isSupabaseConnected) {
          localStorage.setItem('sticky-notes', JSON.stringify(updatedNotes));
        }
        
        toast({
          title: "회의 종료",
          description: `"${title}" 제목으로 저장되었습니다.`,
        });
      }
      setCurrentMeetingId(null);
    } else {
      // 회의 시작: 새 ID 생성
      setCurrentMeetingId(crypto.randomUUID());
      toast({
        title: "회의록 모드 시작",
        description: "이제 작성하는 모든 메모가 하나의 회의로 그룹화됩니다.",
      });
    }
    setIsMeetingMode(!isMeetingMode);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <main className="min-h-screen">
      {viewMode === 'memo' ? (
        <StickyNoteInput
          currentNote={currentNote}
          setCurrentNote={setCurrentNote}
          onSave={addNote}
          onDelete={deleteNote}
          onSwitchToAffinity={() => setViewMode('diagram')}
          onComplete={toggleNoteCompletion}
          isClassifying={isClassifying}
          isMeetingMode={isMeetingMode}
          onToggleMeetingMode={toggleMeetingMode}
        />
      ) : (
        <AffinityDiagram
          notes={notes}
          onNoteSelect={setCurrentNote}
          onSwitchToMemo={() => setViewMode('memo')}
          onNoteComplete={toggleNoteCompletion}
          onNoteDelete={deleteNote}
        />
      )}
      
      {/* 🎨 M2Z1 스타일 동기화 상태 표시 (라이트 모드) */}
      <div className="fixed top-6 right-6 z-30">
        <div className="px-4 py-2 rounded-lg text-sm font-medium bg-white/90 backdrop-blur-sm border border-gray-200 flex items-center gap-3 shadow-lg">
          <span className={`w-2 h-2 rounded-full ${isSupabaseConnected ? 'bg-green-500' : 'bg-amber-500'} animate-pulse`}></span>
          <span className="text-gray-700">
            {isSupabaseConnected ? 'Cloud Sync' : 'Local Mode'}
          </span>
        </div>
      </div>
    </main>
  );
}