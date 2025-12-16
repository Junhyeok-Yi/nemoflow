/**
 * 회의 제목 자동 생성 모듈
 * 
 * 회의록 모드에서 작성된 메모들을 분석하여
 * 자동으로 회의 제목을 생성합니다.
 */

import { StickyNote } from './types';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';

/**
 * 키워드 추출 함수
 * 
 * 메모 내용에서 의미있는 키워드를 추출합니다.
 * 
 * @param text - 분석할 텍스트
 * @returns 추출된 키워드 배열
 */
function extractKeywords(text: string): string[] {
  // 비즈니스/회의 관련 주요 키워드
  const keywords = [
    // 프로젝트/업무
    '프로젝트', '마케팅', '전략', '기획', '개발', '디자인',
    '예산', '일정', '검토', '승인', '협의', '논의',
    '출시', '런칭', '캠페인', '브랜딩',
    
    // 부서/팀
    '개발팀', '디자인팀', '마케팅팀', '영업팀', '기획팀',
    
    // 분기/시기
    'Q1', 'Q2', 'Q3', 'Q4', '1분기', '2분기', '3분기', '4분기',
    '상반기', '하반기', '2024', '2025',
    
    // 이벤트/행사
    '행사', '이벤트', '세미나', '워크샵', '교육',
    
    // 제품/서비스
    '제품', '서비스', '앱', '웹사이트', '플랫폼',
    
    // 성과/목표
    '목표', '성과', 'KPI', 'OKR', '매출', '성장',
  ];
  
  // 텍스트에 포함된 키워드 찾기
  const found = keywords.filter(kw => text.includes(kw));
  
  // 중복 제거 및 빈도순 정렬
  return [...new Set(found)];
}

/**
 * 회의 주제 분석
 * 
 * 여러 메모의 내용을 종합하여 회의 주제를 파악합니다.
 * 
 * @param notes - 회의록 메모 배열
 * @returns 주제 키워드 배열 (최대 3개)
 */
function analyzeTopicKeywords(notes: StickyNote[]): string[] {
  // 모든 메모 내용 합치기
  const allContent = notes.map(n => n.content).join(' ');
  
  // 키워드 추출
  const keywords = extractKeywords(allContent);
  
  // 키워드별 빈도 계산
  const frequency: Record<string, number> = {};
  keywords.forEach(kw => {
    frequency[kw] = (frequency[kw] || 0) + 1;
  });
  
  // 빈도순 정렬하여 상위 3개 반환
  return Object.entries(frequency)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([kw]) => kw);
}

/**
 * AI로 회의 제목 생성
 * 
 * 회의록 모드에서 작성된 모든 메모를 분석하여
 * 적절한 회의 제목을 자동으로 생성합니다.
 * 
 * @param meetingId - 회의 ID
 * @param notes - 전체 메모 배열 (회의 ID로 필터링됨)
 * @returns 생성된 회의 제목
 */
export async function generateMeetingTitle(
  meetingId: string,
  notes: StickyNote[]
): Promise<string> {
  // 해당 회의의 메모만 필터링
  const meetingNotes = notes.filter(note => note.meetingId === meetingId);
  
  if (meetingNotes.length === 0) {
    return '제목 없는 회의';
  }
  
  // 첫 메모의 작성 시간 기준
  const firstNote = meetingNotes[0];
  const date = format(
    firstNote.createdAt instanceof Date ? firstNote.createdAt : new Date(firstNote.createdAt), 
    'MM/dd', 
    { locale: ko }
  );
  const time = format(
    firstNote.createdAt instanceof Date ? firstNote.createdAt : new Date(firstNote.createdAt), 
    'HH:mm', 
    { locale: ko }
  );
  
  // 주제 키워드 추출
  const topicKeywords = analyzeTopicKeywords(meetingNotes);
  
  // 제목 생성
  let title = '';
  
  if (topicKeywords.length >= 2) {
    // 키워드가 2개 이상: "키워드1 키워드2 회의"
    title = `${topicKeywords.slice(0, 2).join(' ')} 회의`;
  } else if (topicKeywords.length === 1) {
    // 키워드가 1개: "키워드 관련 회의"
    title = `${topicKeywords[0]} 관련 회의`;
  } else {
    // 키워드 없음: "날짜 시간 회의"
    title = `${date} ${time} 회의`;
  }
  
  return title;
}

/**
 * 간단한 회의 제목 생성 (동기)
 * 
 * 키워드 추출 없이 날짜 기반으로 빠르게 생성
 * 
 * @param firstNoteDate - 첫 메모의 작성 시간
 * @returns 기본 회의 제목
 */
export function generateSimpleMeetingTitle(firstNoteDate: Date): string {
  const date = format(firstNoteDate, 'MM/dd', { locale: ko });
  const time = format(firstNoteDate, 'HH:mm', { locale: ko });
  return `${date} ${time} 회의`;
}

/**
 * 회의 요약 생성
 * 
 * 회의록 메모들을 바탕으로 간단한 요약을 생성합니다.
 * 
 * @param notes - 회의록 메모 배열
 * @returns 요약 텍스트
 */
export function generateMeetingSummary(notes: StickyNote[]): string {
  if (notes.length === 0) return '';
  
  const topicKeywords = analyzeTopicKeywords(notes);
  const noteCount = notes.length;
  
  if (topicKeywords.length > 0) {
    return `${topicKeywords.join(', ')} 관련 내용 (${noteCount}개 메모)`;
  } else {
    return `${noteCount}개의 메모`;
  }
}
