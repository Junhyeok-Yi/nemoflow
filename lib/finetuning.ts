/**
 * AI 파인튜닝 데이터 관리
 * 
 * 사용자가 AI 예측을 수정한 데이터를 수집하여
 * 향후 AI 모델의 정확도를 향상시키는 데 사용합니다.
 */

import { Category } from './types';

/**
 * 파인튜닝 데이터 타입
 */
export interface FinetuningData {
  originalContent: string;      // 원본 메모 내용
  aiPredicted: Category;        // AI가 예측한 카테고리
  userCorrected: Category;      // 사용자가 수정한 카테고리
  timestamp: Date;              // 수정 시간
}

const FINETUNING_STORAGE_KEY = 'ai-finetuning-data';

/**
 * 파인튜닝 데이터 저장
 * 
 * 사용자가 AI 예측을 수정했을 때 호출됩니다.
 * 
 * @param data - 파인튜닝 데이터 (원본, AI 예측, 사용자 수정)
 */
export function saveFinetuningData(data: FinetuningData): void {
  try {
    const existing = getFinetuningData();
    existing.push(data);
    
    // LocalStorage에 저장
    localStorage.setItem(FINETUNING_STORAGE_KEY, JSON.stringify(existing));
    
    console.log('🎓 파인튜닝 데이터 저장:', {
      content: data.originalContent.substring(0, 20) + '...',
      aiPredicted: data.aiPredicted,
      userCorrected: data.userCorrected,
    });
    
    // 통계 출력
    const stats = calculateAccuracy(existing);
    console.log(`📊 현재 정확도: ${stats.accuracy.toFixed(1)}% (${stats.correct}/${stats.total})`);
  } catch (error) {
    console.error('파인튜닝 데이터 저장 실패:', error);
  }
}

/**
 * 저장된 파인튜닝 데이터 가져오기
 * 
 * @returns 저장된 모든 파인튜닝 데이터 배열
 */
export function getFinetuningData(): FinetuningData[] {
  try {
    const data = localStorage.getItem(FINETUNING_STORAGE_KEY);
    if (!data) return [];
    
    const parsed = JSON.parse(data);
    
    // Date 객체로 변환
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return parsed.map((item: any) => ({
      ...item,
      timestamp: new Date(item.timestamp)
    }));
  } catch (error) {
    console.error('파인튜닝 데이터 로드 실패:', error);
    return [];
  }
}

/**
 * 파인튜닝 데이터 초기화
 */
export function clearFinetuningData(): void {
  localStorage.removeItem(FINETUNING_STORAGE_KEY);
  console.log('🗑️ 파인튜닝 데이터 초기화 완료');
}

/**
 * AI 정확도 계산
 * 
 * @param data - 파인튜닝 데이터 배열
 * @returns 정확도 통계
 */
export function calculateAccuracy(data: FinetuningData[]): {
  accuracy: number;
  correct: number;
  total: number;
  byCategory: Record<Category, { correct: number; total: number }>;
} {
  if (data.length === 0) {
    return {
      accuracy: 0,
      correct: 0,
      total: 0,
      byCategory: {
        'To-Do': { correct: 0, total: 0 },
        '메모': { correct: 0, total: 0 },
        '아이디어': { correct: 0, total: 0 },
        '회의록': { correct: 0, total: 0 },
      }
    };
  }
  
  // 전체 정확도
  const correct = data.filter(d => d.aiPredicted === d.userCorrected).length;
  const total = data.length;
  const accuracy = (correct / total) * 100;
  
  // 카테고리별 정확도
  const byCategory: Record<Category, { correct: number; total: number }> = {
    'To-Do': { correct: 0, total: 0 },
    '메모': { correct: 0, total: 0 },
    '아이디어': { correct: 0, total: 0 },
    '회의록': { correct: 0, total: 0 },
  };
  
  data.forEach(d => {
    const category = d.userCorrected;
    byCategory[category].total++;
    if (d.aiPredicted === d.userCorrected) {
      byCategory[category].correct++;
    }
  });
  
  return { accuracy, correct, total, byCategory };
}

/**
 * 파인튜닝 통계 출력
 */
export function printFinetuningStats(): void {
  const data = getFinetuningData();
  const stats = calculateAccuracy(data);
  
  console.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎓 AI 파인튜닝 통계
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

전체 정확도: ${stats.accuracy.toFixed(1)}%
총 데이터: ${stats.total}개
정확한 예측: ${stats.correct}개
잘못된 예측: ${stats.total - stats.correct}개

카테고리별 정확도:
  To-Do: ${stats.byCategory['To-Do'].total > 0 ? ((stats.byCategory['To-Do'].correct / stats.byCategory['To-Do'].total) * 100).toFixed(1) : 0}% (${stats.byCategory['To-Do'].correct}/${stats.byCategory['To-Do'].total})
  메모: ${stats.byCategory['메모'].total > 0 ? ((stats.byCategory['메모'].correct / stats.byCategory['메모'].total) * 100).toFixed(1) : 0}% (${stats.byCategory['메모'].correct}/${stats.byCategory['메모'].total})
  아이디어: ${stats.byCategory['아이디어'].total > 0 ? ((stats.byCategory['아이디어'].correct / stats.byCategory['아이디어'].total) * 100).toFixed(1) : 0}% (${stats.byCategory['아이디어'].correct}/${stats.byCategory['아이디어'].total})
  회의록: ${stats.byCategory['회의록'].total > 0 ? ((stats.byCategory['회의록'].correct / stats.byCategory['회의록'].total) * 100).toFixed(1) : 0}% (${stats.byCategory['회의록'].correct}/${stats.byCategory['회의록'].total})

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  `);
}

/**
 * 최근 N개의 파인튜닝 데이터 가져오기
 * 
 * @param count - 가져올 데이터 개수
 * @returns 최근 데이터 배열
 */
export function getRecentFinetuningData(count: number = 10): FinetuningData[] {
  const data = getFinetuningData();
  return data
    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
    .slice(0, count);
}
