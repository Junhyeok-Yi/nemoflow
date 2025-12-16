/**
 * 애플리케이션 전역 상수 정의
 * 
 * 앱 전체에서 사용되는 설정 값, 매직 넘버, 문자열 상수 등을 한 곳에서 관리합니다.
 * 상수를 수정할 때 이 파일만 변경하면 되므로 유지보수가 쉬워집니다.
 */

/**
 * 앱 기본 설정
 */
export const APP_CONFIG = {
  // 메모 관련 설정
  MAX_NOTE_LENGTH: 100,              // 메모 최대 글자 수
  MIN_NOTE_LENGTH: 1,                // 메모 최소 글자 수
  
  // 제스처 임계값
  SWIPE_THRESHOLD: 80,               // 스와이프 인식 최소 거리 (px)
  DRAG_THRESHOLD: 10,                // 드래그 시작 최소 거리 (px)
  MIN_SWIPE_VELOCITY: 0.2,           // 스와이프 최소 속도
  
  // 타이밍 설정
  DEBOUNCE_DELAY: 300,               // 디바운스 지연 시간 (ms)
  TOAST_DURATION: 3000,              // 토스트 알림 표시 시간 (ms)
  FEEDBACK_DURATION: 1000,           // 피드백 애니메이션 시간 (ms)
  ANIMATION_DURATION: 300,           // 기본 애니메이션 시간 (ms)
  
  // 컨텍스트 분석 설정
  CONTEXT_TIME_WINDOW: 3600000,      // 컨텍스트 분석 시간 범위 (1시간, ms)
  CONTEXT_MIN_NOTES: 2,              // 컨텍스트 분석 최소 메모 수
  CONTEXT_CONFIDENCE_THRESHOLD: 0.6, // 컨텍스트 신뢰도 임계값
  
  // 성능 최적화
  VIRTUAL_SCROLL_ITEM_HEIGHT: 200,   // Virtual scroll 아이템 높이
  IMAGE_LAZY_LOAD_THRESHOLD: 200,    // 이미지 지연 로딩 거리 (px)
} as const;

/**
 * LocalStorage 키 상수
 */
export const STORAGE_KEYS = {
  NOTES: 'sticky-notes',                // 메모 데이터
  NOTES_BACKUP: 'sticky-notes-backup',  // 메모 백업 데이터
  USER_PATTERNS: 'user-topic-patterns', // 사용자 패턴 학습 데이터
  THEME: 'app-theme',                   // 테마 설정 (향후 다크모드용)
  USER_PREFERENCES: 'user-preferences', // 사용자 환경 설정
} as const;

/**
 * API 엔드포인트
 */
export const API_ENDPOINTS = {
  CATEGORIZE: '/api/categorize',       // AI 분류 API
} as const;

/**
 * 카테고리 상수 (타입 안전성 보장)
 */
export const CATEGORIES = ['To-Do', '메모', '아이디어', '회의록'] as const;
export type Category = typeof CATEGORIES[number];

/**
 * 색상 상수 (타입 안전성 보장)
 */
export const COLORS = ['yellow', 'pink', 'blue', 'green', 'purple'] as const;
export type Color = typeof COLORS[number];

/**
 * 카테고리별 색상 매핑
 */
export const CATEGORY_COLORS: Record<Category, Color> = {
  'To-Do': 'pink',
  '아이디어': 'blue',
  '메모': 'yellow',
  '회의록': 'purple',
};

/**
 * 색상별 Tailwind CSS 클래스
 */
export const COLOR_CLASSES: Record<Color, {
  background: string;
  gradient: string;
  text: string;
  border: string;
}> = {
  yellow: {
    background: 'bg-yellow-200',
    gradient: 'bg-gradient-to-br from-yellow-200 to-yellow-300',
    text: 'text-yellow-800',
    border: 'border-yellow-300',
  },
  pink: {
    background: 'bg-pink-200',
    gradient: 'bg-gradient-to-br from-pink-200 to-pink-300',
    text: 'text-pink-800',
    border: 'border-pink-300',
  },
  blue: {
    background: 'bg-blue-200',
    gradient: 'bg-gradient-to-br from-blue-200 to-blue-300',
    text: 'text-blue-800',
    border: 'border-blue-300',
  },
  green: {
    background: 'bg-green-200',
    gradient: 'bg-gradient-to-br from-green-200 to-green-300',
    text: 'text-green-800',
    border: 'border-green-300',
  },
  purple: {
    background: 'bg-purple-200',
    gradient: 'bg-gradient-to-br from-purple-200 to-purple-300',
    text: 'text-purple-800',
    border: 'border-purple-300',
  },
};

/**
 * 뷰 모드 상수
 */
export const VIEW_MODES = ['memo', 'diagram'] as const;
export type ViewMode = typeof VIEW_MODES[number];

/**
 * 정렬 타입 상수
 */
export const SORT_TYPES = ['category', 'topic', 'time'] as const;
export type SortType = typeof SORT_TYPES[number];

/**
 * 애니메이션 이징 함수
 */
export const EASING = {
  EASE_OUT: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
  EASE_IN: 'cubic-bezier(0.4, 0, 1, 1)',
  EASE_IN_OUT: 'cubic-bezier(0.4, 0, 0.2, 1)',
  LINEAR: 'linear',
} as const;

/**
 * 타입 가드 함수
 */
export function isValidCategory(value: string): value is Category {
  return CATEGORIES.includes(value as Category);
}

export function isValidColor(value: string): value is Color {
  return COLORS.includes(value as Color);
}

export function isValidViewMode(value: string): value is ViewMode {
  return VIEW_MODES.includes(value as ViewMode);
}

export function isValidSortType(value: string): value is SortType {
  return SORT_TYPES.includes(value as SortType);
}

/**
 * 환경별 설정
 */
export const ENV = {
  isDevelopment: process.env.NODE_ENV === 'development',
  isProduction: process.env.NODE_ENV === 'production',
  isTest: process.env.NODE_ENV === 'test',
} as const;
