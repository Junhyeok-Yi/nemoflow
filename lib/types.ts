// 카테고리 타입 정의
export type Category = 'To-Do' | '메모' | '아이디어' | '회의록';

// 포스트잇 관련 타입 정의
export interface StickyNote {
  id: string;
  content: string;
  category: Category;
  color: 'yellow' | 'pink' | 'blue' | 'green' | 'purple';
  createdAt: Date;
  updatedAt: Date;
  isCompleted?: boolean; // To-Do 아이템의 완료 상태
  
  // 회의록 관련 필드
  meetingId?: string;           // 회의 그룹 ID
  meetingTitle?: string;        // AI가 생성한 회의 제목
  isMeetingMode?: boolean;      // 회의록 모드에서 작성되었는지
}

// 뷰 모드 타입
export type ViewMode = 'memo' | 'diagram';

// 스와이프 방향 타입
export type SwipeDirection = 'up' | 'left' | 'right' | 'down';

// 카테고리별 포스트잇 그룹
export interface CategoryGroup {
  category: string;
  notes: StickyNote[];
}

// 제스처 이벤트 타입
export interface GestureEvent {
  deltaX: number;
  deltaY: number;
  direction: SwipeDirection;
  distance: number;
}

