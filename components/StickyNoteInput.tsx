'use client';

import { useState, useEffect, useRef } from 'react';
import { StickyNote } from '@/lib/types';
import { getCategoryColor, categorizeForPreview } from '@/lib/ai-categorizer';
import { useGestures } from '@/hooks/useGestures';
import { Check, X, Brain, ChevronDown, ListTodo, Lightbulb, FileText } from 'lucide-react';

interface StickyNoteInputProps {
  onSave: (content: string, categoryOverride?: StickyNote['category']) => void;
  onDelete: (id: string) => void;
  onComplete: (id: string) => void; // 완료 처리 함수
  onSwitchToAffinity: () => void;
  currentNote: StickyNote | null;
  setCurrentNote: (note: StickyNote | null) => void;
  isClassifying?: boolean; // AI 분류 중 상태
  onEditedNoteSaved?: () => void; // 기존 노트 수정 저장 후 후속 동작
}

export default function StickyNoteInput({
  onSave,
  onDelete,
  onComplete,
  onSwitchToAffinity,
  currentNote,
  setCurrentNote,
  isClassifying = false,
  onEditedNoteSaved,
}: StickyNoteInputProps) {
  const [content, setContent] = useState('');
  const [isEditing, setIsEditing] = useState(true);
  const [isFocused, setIsFocused] = useState(false);
  const [feedback, setFeedback] = useState<'save' | 'delete' | 'classifying' | null>(null);
  // 초기 색상을 currentNote에 따라 즉시 결정
  const getInitialColor = () => {
    if (currentNote) {
      const colorMap = {
        yellow: 'bg-gradient-to-br from-amber-100 via-orange-200 to-rose-300',
        pink: 'bg-gradient-to-br from-fuchsia-100 via-violet-200 to-indigo-300',
        blue: 'bg-gradient-to-br from-sky-100 via-blue-200 to-indigo-300',
        green: 'bg-gradient-to-br from-lime-100 via-emerald-200 to-teal-300'
      };
      return colorMap[currentNote.color];
    }
    return 'bg-gradient-to-br from-amber-100 via-orange-200 to-rose-300';
  };
  
  const [stickyColor, setStickyColor] = useState(getInitialColor());
  const [isMounted, setIsMounted] = useState(false); // 클라이언트 마운트 확인
  const [fontSize, setFontSize] = useState('text-xl'); // 동적 폰트 크기
  
  // 인터랙션 관련 상태
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isInteracting, setIsInteracting] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const tagMenuRef = useRef<HTMLDivElement>(null);
  const [manualCategory, setManualCategory] = useState<StickyNote['category'] | null>(null);
  const [isTagMenuOpen, setIsTagMenuOpen] = useState(false);
  const [isTagUiMounted, setIsTagUiMounted] = useState(false);
  const [isTagUiVisible, setIsTagUiVisible] = useState(false);

  const getAutoDetectedCategory = (): StickyNote['category'] => {
    // 기존 노트 편집 시에는 태그를 자동 재분류하지 않고, 원래 카테고리를 기본 유지
    if (currentNote?.category) return currentNote.category;
    if (content.trim()) return categorizeForPreview(content);
    return '메모';
  };

  const resolvedCategory = manualCategory ?? getAutoDetectedCategory();
  const isActiveInput = (isFocused || isTagMenuOpen) && !isClassifying;

  const categoryUI: Record<StickyNote['category'], { label: string; bg: string; text: string; Icon: typeof ListTodo }> = {
    'To-Do': {
      label: 'To-do',
      bg: 'bg-emerald-100',
      text: 'text-emerald-900',
      Icon: ListTodo,
    },
    '아이디어': {
      label: 'Idea',
      bg: 'bg-indigo-100',
      text: 'text-indigo-900',
      Icon: Lightbulb,
    },
    '메모': {
      label: 'Memo',
      bg: 'bg-amber-100',
      text: 'text-amber-900',
      Icon: FileText,
    },
  };

  // 클라이언트 마운트 후 기본 색상 설정
  useEffect(() => {
    setIsMounted(true);
    // 기본적으로 웜 톤 그라데이션으로 시작
    setStickyColor('bg-gradient-to-br from-amber-100 via-orange-200 to-rose-300');
  }, []);

  // 태그 드롭다운 바깥 클릭 시 닫기
  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (!tagMenuRef.current) return;
      if (!tagMenuRef.current.contains(event.target as Node)) {
        setIsTagMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // 실제 텍스트박스 크기 기반 폰트 크기 조정
  useEffect(() => {
    if (textareaRef.current && content && isMounted) {
      const textarea = textareaRef.current;
      
      // 사용 가능한 텍스트 영역 크기 계산 (패딩 제외)
      const availableHeight = textarea.clientHeight - 64; // 상하 패딩 32px씩 제외
      const availableWidth = textarea.clientWidth - 64; // 좌우 패딩 32px씩 제외
      
      // 폰트 크기 옵션들 (큰 것부터 작은 것 순서)
      const fontSizes = [
        { class: 'text-xl', size: 20 },
        { class: 'text-lg', size: 18 },
        { class: 'text-base', size: 16 },
        { class: 'text-sm', size: 14 },
        { class: 'text-xs', size: 12 }
      ];
      
      let selectedSize = 'text-xs'; // 기본값은 가장 작은 크기
      
      // 각 폰트 크기에서 텍스트가 차지하는 실제 공간 측정
      for (const fontOption of fontSizes) {
        // 임시 div 생성해서 실제 텍스트 크기 측정
        const tempDiv = document.createElement('div');
        tempDiv.style.position = 'absolute';
        tempDiv.style.visibility = 'hidden';
        tempDiv.style.fontSize = `${fontOption.size}px`;
        tempDiv.style.fontFamily = 'inherit';
        tempDiv.style.lineHeight = '1.625'; // leading-relaxed와 동일
        tempDiv.style.width = `${availableWidth}px`;
        tempDiv.style.wordWrap = 'break-word';
        tempDiv.style.whiteSpace = 'pre-wrap';
        tempDiv.style.padding = '0';
        tempDiv.style.margin = '0';
        tempDiv.textContent = content;
        
        document.body.appendChild(tempDiv);
        const textHeight = tempDiv.scrollHeight;
        document.body.removeChild(tempDiv);
        
        // 텍스트가 사용 가능한 공간에 들어가면 이 크기 사용
        if (textHeight <= availableHeight) {
          selectedSize = fontOption.class;
          break;
        }
      }
      
      setFontSize(selectedSize);
    } else if (!content) {
      // 내용이 없으면 기본 큰 크기
      setFontSize('text-xl');
    }
  }, [content, isMounted]);

  // 🎨 실시간 색상 미리보기 (자동 분류 + 수동 태그 반영)
  useEffect(() => {
    if (!isMounted) return;

    const previewColor = getCategoryColor(resolvedCategory);
    const colorMap = {
      yellow: 'bg-gradient-to-br from-amber-100 via-orange-200 to-rose-300',
      pink: 'bg-gradient-to-br from-fuchsia-100 via-violet-200 to-indigo-300',
      blue: 'bg-gradient-to-br from-sky-100 via-blue-200 to-indigo-300',
      green: 'bg-gradient-to-br from-lime-100 via-emerald-200 to-teal-300'
    };

    setStickyColor(colorMap[previewColor]);
  }, [isMounted, resolvedCategory]);

  // 편집 모드일 때 포커스 및 키보드 활성화
  useEffect(() => {
    if (isEditing && textareaRef.current && !isClassifying) {
      textareaRef.current.focus();
    }
  }, [isEditing, isClassifying]);

  // 현재 노트가 설정되면 편집 모드로 전환
  useEffect(() => {
    if (currentNote) {
      setContent(currentNote.content);
      setIsEditing(true);
      setIsFocused(false);
      setManualCategory(null);
      setIsTagMenuOpen(false);
      // 기존 노트의 색상을 즉시 설정 (깜빡임 방지)
      const colorMap = {
        yellow: 'bg-gradient-to-br from-amber-100 via-orange-200 to-rose-300',
        pink: 'bg-gradient-to-br from-fuchsia-100 via-violet-200 to-indigo-300',
        blue: 'bg-gradient-to-br from-sky-100 via-blue-200 to-indigo-300',
        green: 'bg-gradient-to-br from-lime-100 via-emerald-200 to-teal-300'
      };
      // 즉시 색상 설정으로 깜빡임 방지
      setStickyColor(colorMap[currentNote.color]);
    } else {
      setContent('');
      setIsEditing(true);
      setIsFocused(false);
      setManualCategory(null);
      setIsTagMenuOpen(false);
      // 새 메모는 기본 웜 톤 그라데이션으로 시작
      setStickyColor('bg-gradient-to-br from-amber-100 via-orange-200 to-rose-300');
    }
  }, [currentNote]);

  // AI 분류 중 상태 표시
  useEffect(() => {
    if (isClassifying) {
      setFeedback('classifying');
    } else if (feedback === 'classifying') {
      setFeedback('save');
      setTimeout(() => setFeedback(null), 1000);
    }
  }, [isClassifying, feedback]);

  // 피드백 표시 후 자동 숨김
  useEffect(() => {
    if (feedback && feedback !== 'classifying') {
      const timer = setTimeout(() => {
        setFeedback(null);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [feedback]);

  useEffect(() => {
    if ((!isFocused && !isTagMenuOpen) || isClassifying) {
      setIsTagMenuOpen(false);
    }
  }, [isFocused, isTagMenuOpen, isClassifying]);

  useEffect(() => {
    let showTimer: ReturnType<typeof setTimeout> | null = null;
    let hideTimer: ReturnType<typeof setTimeout> | null = null;

    if (isActiveInput) {
      setIsTagUiMounted(true);
      showTimer = setTimeout(() => {
        setIsTagUiVisible(true);
      }, 320);
    } else {
      setIsTagUiVisible(false);
      hideTimer = setTimeout(() => {
        setIsTagUiMounted(false);
      }, 180);
    }

    return () => {
      if (showTimer) clearTimeout(showTimer);
      if (hideTimer) clearTimeout(hideTimer);
    };
  }, [isActiveInput]);





  const handleSave = () => {
    if (content.trim() && !isClassifying) {
      const wasEditingExistingNote = Boolean(currentNote);

      setFeedback('classifying');
      onSave(content.trim(), resolvedCategory);
      setContent('');
      setManualCategory(null);
      setIsTagMenuOpen(false);
      setCurrentNote(null);
      setIsEditing(true);

      if (wasEditingExistingNote) {
        onEditedNoteSaved?.();
      }
    }
  };

  const handleDelete = () => {
    if (!isClassifying) {
      setFeedback('delete');
      if (currentNote) {
        onDelete(currentNote.id);
        setCurrentNote(null);
      }
      setContent('');
      setManualCategory(null);
      setIsTagMenuOpen(false);
      setIsEditing(true);
    }
  };

  // PC용 더블클릭으로 Affinity Diagram 진입
  const handleDoubleClick = (e: React.MouseEvent) => {
    console.log('Double click triggered - switching to affinity'); // 디버깅용
    e.preventDefault();
    e.stopPropagation();
    if (!isClassifying) {
      onSwitchToAffinity();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey && !isClassifying) {
      e.preventDefault();
      handleSave();
    }
  };

  // 실시간 드래그 핸들러
  const [dragDirection, setDragDirection] = useState<'horizontal' | 'vertical' | null>(null);
  
  const handleDragStart = () => {
    setIsDragging(true);
    setIsInteracting(true);
    setDragDirection(null); // 방향 초기화
    console.log('Real-time drag started'); // 디버깅용
  };

  const handleDragMove = (deltaX: number, deltaY: number) => {
    if (!isDragging) return;
    
    // 첫 움직임에서 방향 결정 (한번 결정되면 고정)
    if (!dragDirection && (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5)) {
      if (Math.abs(deltaX) > Math.abs(deltaY)) {
        setDragDirection('horizontal');
      } else {
        setDragDirection('vertical');
      }
    }
    
    // 장력 효과를 위한 함수 (끝으로 갈수록 약간의 저항 증가)
    const applyTension = (delta: number, maxDistance: number) => {
      const normalizedDistance = Math.abs(delta) / maxDistance;
      // 약한 장력 적용 (화면 끝까지 갈 수 있지만 약간의 저항감)
      // f(x) = x * (1 - x^0.3) - 부드러운 저항, 끝까지 도달 가능
      const tensionFactor = Math.max(0.7, 1 - Math.pow(normalizedDistance, 0.3));
      return delta * tensionFactor;
    };

    // 방향에 따라 제한된 움직임 + 약한 장력 효과
    if (dragDirection === 'horizontal') {
      // 가로 방향: X축만 움직임, 화면 끝까지 가능
      const maxX = window.innerWidth / 2 - 50; // 여유 공간을 더 줌
      const tensionX = applyTension(deltaX, maxX);
      const limitedX = Math.max(-maxX, Math.min(maxX, tensionX));
      setOffset({ x: limitedX, y: 0 });
    } else if (dragDirection === 'vertical') {
      // 세로 방향: Y축만 움직임, 화면 끝까지 가능
      const maxY = window.innerHeight / 2 - 50; // 여유 공간을 더 줌
      const tensionY = applyTension(deltaY, maxY);
      const limitedY = Math.max(-maxY, Math.min(maxY, tensionY));
      setOffset({ x: 0, y: limitedY });
    }
  };

  const handleDragEnd = () => {
    if (!isDragging) return;
    
    console.log('Real-time drag ended', { dragDirection, offset }); // 디버깅용
    setIsDragging(false);
    
    // 드래그 종료 시 방향과 거리에 따라 액션 결정
    const threshold = 80; // 액션 실행 임계값 (모든 방향 동일하게 증가)
    
    if (dragDirection === 'vertical') {
      // 세로 방향 드래그
      if (offset.y < -threshold) {
        // 위로 드래그 → 저장 (임계값: -80 이하)
        if (content.trim() && !isClassifying) {
          if (textareaRef.current) {
            textareaRef.current.blur();
          }
          setTimeout(() => handleSave(), 200);
        }
      } else if (offset.y > threshold) {
        // 아래로 드래그 → 어피니티 다이어그램 (임계값: +80 이상)
        if (!isClassifying) {
          setTimeout(() => onSwitchToAffinity(), 200);
        }
      }
    } else if (dragDirection === 'horizontal') {
      // 가로 방향 드래그
      if (offset.x < -threshold) {
        // 좌측 드래그 → 삭제 (임계값: -80 이하)
        if (!isClassifying) {
          setTimeout(() => handleDelete(), 200);
        }
      } else if (offset.x > threshold) {
        // 우측 드래그 → 완료 처리 (임계값: +80 이상)
        if (currentNote && !isClassifying) {
          // 기존 노트가 있는 경우 완료 처리
          setTimeout(() => onComplete(currentNote.id), 200);
        } else if (content.trim() && !isClassifying) {
          // 새 노트인 경우 저장 후 완료 처리
          if (textareaRef.current) {
            textareaRef.current.blur();
          }
          setTimeout(() => handleSave(), 200);
        }
      }
    }
    
    // 상태 초기화 및 원위치로 복귀 (탄성 효과)
    setDragDirection(null);
    setTimeout(() => {
      setOffset({ x: 0, y: 0 });
      setIsInteracting(false);
    }, 100);
  };

  // 방향별 인터랙션 핸들러 (스와이프용 - 백업)
  const handleDirectionalMove = (direction: 'up' | 'down' | 'left' | 'right', intensity: number = 1) => {
    setIsInteracting(true);
    
    const moveAmount = 15 * intensity; // 기본 이동량
    
    switch (direction) {
      case 'up':
        setOffset({ x: 0, y: -moveAmount });
        break;
      case 'down':
        setOffset({ x: 0, y: moveAmount });
        break;
      case 'left':
        setOffset({ x: -moveAmount, y: 0 });
        break;
      case 'right':
        setOffset({ x: moveAmount, y: 0 });
        break;
    }
    
    // 0.3초 후 원위치로 복귀 (탄성 효과)
    setTimeout(() => {
      setOffset({ x: 0, y: 0 });
      setIsInteracting(false);
    }, 300);
  };

  // 제스처 처리 (실시간 드래그 + 스와이프 + 핀치)
  const { onTouchStart, onTouchMove, onTouchEnd } = useGestures({
    onDragStart: handleDragStart,
    onDragMove: handleDragMove,
    onDragEnd: handleDragEnd,
    onSwipeUp: () => {
      console.log('Swipe up triggered'); // 디버깅용
      if (!isDragging) { // 드래그 중이 아닐 때만 스와이프 처리
        handleDirectionalMove('up', 2);
        if (content.trim() && !isClassifying) {
          if (textareaRef.current) {
            textareaRef.current.blur();
          }
          setTimeout(() => handleSave(), 200);
        }
      }
    },
    onSwipeDown: () => {
      console.log('Swipe down triggered - switching to affinity'); // 디버깅용
      if (!isDragging) {
        handleDirectionalMove('down', 2);
        if (!isClassifying) {
          setTimeout(() => onSwitchToAffinity(), 200);
        }
      }
    },
    onSwipeLeft: () => {
      console.log('Swipe left triggered'); // 디버깅용
      if (!isDragging) {
        handleDirectionalMove('left', 2);
        if (!isClassifying) {
          setTimeout(() => handleDelete(), 200);
        }
      }
    },
    onSwipeRight: () => {
      console.log('Swipe right triggered'); // 디버깅용
      if (!isDragging) {
        handleDirectionalMove('right', 2);
        if (!isClassifying) {
          setTimeout(() => handleDelete(), 200);
        }
      }
    },
    onPinchOut: () => {
      console.log('Pinch out triggered - switching to affinity'); // 디버깅용
      if (!isClassifying) {
        onSwitchToAffinity();
      }
    }
  });


  // 클라이언트 마운트 전에는 기본 색상으로 렌더링
  if (!isMounted) {
    return (
      <div className="min-h-screen flex items-center justify-center p-5 bg-gray-50">
        <div className="relative w-full max-w-sm aspect-square bg-gradient-to-br from-amber-100 via-orange-200 to-rose-300 rounded-lg shadow-lg" style={{ margin: '0 20px' }}>
          <div className="pointer-events-none absolute inset-0 rounded-lg bg-[radial-gradient(circle_at_20%_12%,rgba(255,255,255,0.20),transparent_40%),radial-gradient(circle_at_82%_88%,rgba(0,0,0,0.10),transparent_45%),linear-gradient(to_bottom_right,rgba(255,255,255,0.05),rgba(0,0,0,0.03))]" />
          <textarea
            placeholder="메모를 입력하세요."
            className="w-full h-full p-8 bg-transparent border-none outline-none resize-none text-xl font-medium text-slate-900 placeholder-slate-500 leading-relaxed"
            disabled
          />
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen flex items-center justify-center ${isActiveInput ? 'p-2 md:p-5' : 'p-5'} bg-gray-50 overscroll-none`}>
      <div
        ref={containerRef}
        className={`relative aspect-square ${isActiveInput ? 'w-[94vw] max-w-[430px] md:w-full md:max-w-md' : 'w-full max-w-sm'} ${stickyColor} rounded-lg shadow-lg transform cursor-pointer touch-none ${
          isClassifying ? 'opacity-75' : ''
        } ${isDragging ? 'scale-110 shadow-2xl' : isInteracting ? 'scale-105' : 'active:scale-95'}`}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onDoubleClick={handleDoubleClick}
        style={{ 
          margin: isActiveInput ? '0 8px' : '0 20px',
          transform: `translate(${offset.x}px, ${offset.y}px)`,
          transition: isDragging ? 'transform 0s' : 'all 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55)' // 드래그 중에는 즉시 반응
        }}
      >
      {/* 포스트잇 상단 접착 부분 */}
      <div className="pointer-events-none absolute inset-0 rounded-lg bg-[radial-gradient(circle_at_20%_12%,rgba(255,255,255,0.20),transparent_40%),radial-gradient(circle_at_82%_88%,rgba(0,0,0,0.10),transparent_45%),linear-gradient(to_bottom_right,rgba(255,255,255,0.05),rgba(0,0,0,0.03))]" />

      {/* 텍스트 입력 영역 - 패딩 줄이고 전체 크기 활용 */}
      <textarea
        ref={textareaRef}
        value={content}
        onChange={(e) => {
          setContent(e.target.value.slice(0, 100));
          if (manualCategory) {
            setManualCategory(null); // 타이핑이 이어지면 다시 자동 분류 우선
          }
        }}
        onKeyDown={handleKeyDown}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        placeholder="메모를 입력하세요."
        className={`w-full h-full p-8 bg-transparent border-none outline-none resize-none ${fontSize} font-medium text-slate-900 placeholder-slate-500 leading-relaxed touch-auto transition-all duration-200`}
        maxLength={100}
        disabled={isClassifying}
      />
      
      {/* 중앙 하단 태그 드롭다운 (포스트잇 확장 완료 후 페이드 인) */}
      {isTagUiMounted && (
        <div
          ref={tagMenuRef}
          className={`absolute left-1/2 bottom-2 z-20 -translate-x-1/2 transition-opacity duration-200 ease-out ${isTagUiVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
          onPointerDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
        >
          <button
            type="button"
            disabled={isClassifying}
            onClick={() => setIsTagMenuOpen((prev) => !prev)}
            className={`inline-flex items-center gap-2 rounded-full border border-black/10 px-3 py-1.5 text-sm font-bold transition hover:opacity-90 ${categoryUI[resolvedCategory].bg} ${categoryUI[resolvedCategory].text} ${isClassifying ? 'cursor-not-allowed opacity-60' : ''}`}
            title="태그 선택"
          >
            {(() => {
              const Icon = categoryUI[resolvedCategory].Icon;
              return <Icon className="h-4 w-4" />;
            })()}
            <span>{categoryUI[resolvedCategory].label}</span>
            <ChevronDown className={`h-4 w-4 transition-transform ${isTagMenuOpen ? 'rotate-180' : ''}`} />
          </button>

          {isTagMenuOpen && !isClassifying && (
            <div className="absolute bottom-full left-1/2 mb-1 w-44 -translate-x-1/2 rounded-2xl border border-black/10 bg-white/90 p-2 backdrop-blur-sm">
              {(['To-Do', '아이디어', '메모'] as StickyNote['category'][]).map((category) => {
                const item = categoryUI[category];
                const Icon = item.Icon;
                const isSelected = resolvedCategory === category;

                return (
                  <button
                    key={category}
                    type="button"
                    onClick={() => {
                      setManualCategory(category);
                      setIsTagMenuOpen(false);
                    }}
                    className={`mb-1 flex w-full items-center gap-2 rounded-full px-3 py-2 text-left text-sm font-semibold transition last:mb-0 ${item.bg} ${item.text} ${isSelected ? 'ring-2 ring-slate-300' : 'opacity-90 hover:opacity-100'}`}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 피드백 아이콘 */}
      {feedback && (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-20 rounded-lg">
          <div className="bg-white rounded-full p-3 shadow-lg">
            {feedback === 'save' ? (
              <Check className="w-8 h-8 text-green-500" />
            ) : feedback === 'delete' ? (
              <X className="w-8 h-8 text-red-500" />
            ) : feedback === 'classifying' ? (
              <Brain className="w-8 h-8 text-blue-500 animate-pulse" />
            ) : null}
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
