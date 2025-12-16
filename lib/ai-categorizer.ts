/**
 * 🧠 AI 기반 콘텐츠 분류 시스템 v3.0
 * 개선된 통합 분류 로직 + 컨텍스트 분석 + 밸런스 최적화 + 회의록 지원
 */

// 카테고리 타입 정의
export type Category = 'To-Do' | '메모' | '아이디어' | '회의록';

// 📝 강화된 To-Do 패턴 정의
const TODO_PATTERNS = {
  // 🎯 핵심 행동 동사 (정확한 어미 매칭)
  actionVerbs: [
    { verb: '하기', weight: 3, exact: true },
    { verb: '가기', weight: 3, exact: true },
    { verb: '보기', weight: 2, exact: true },
    { verb: '듣기', weight: 2, exact: true },
    { verb: '읽기', weight: 2, exact: true },
    { verb: '사기', weight: 3, exact: true },
    { verb: '만들기', weight: 2, exact: true },
    { verb: '준비하기', weight: 3, exact: true },
    { verb: '정리하기', weight: 2, exact: true },
    { verb: '공부하기', weight: 3, exact: true },
    { verb: '운동하기', weight: 3, exact: true },
    { verb: '예약하기', weight: 4, exact: true },
  ],
  
  // 🏢 장소 기반 패턴 (문맥 고려)
  places: [
    { place: '은행', weight: 4 },
    { place: '병원', weight: 4 },
    { place: '학교', weight: 3 },
    { place: '회사', weight: 3 },
    { place: '마트', weight: 3 },
    { place: '카페', weight: 2 },
    { place: '헬스장', weight: 3 },
    { place: '도서관', weight: 3 },
    { place: '우체국', weight: 4 },
    { place: '관공서', weight: 4 },
  ],
  
  // ⏰ 시간 표현 (긴급성 고려)
  timeExpressions: [
    { time: '오늘', weight: 4 },
    { time: '내일', weight: 3 },
    { time: '이번주', weight: 2 },
    { time: '다음주', weight: 2 },
    { time: '아침', weight: 2 },
    { time: '점심', weight: 2 },
    { time: '저녁', weight: 2 },
    { time: '마감', weight: 5 },
    { time: '데드라인', weight: 5 },
  ],
  
  // 📋 할일 키워드 (의도성 중심)
  taskKeywords: [
    { keyword: '해야', weight: 4 },
    { keyword: '해야지', weight: 4 },
    { keyword: '하자', weight: 3 },
    { keyword: '예약', weight: 4 },
    { keyword: '신청', weight: 4 },
    { keyword: '제출', weight: 4 },
    { keyword: '완료', weight: 3 },
    { keyword: '계획', weight: 2 },
    { keyword: '목표', weight: 2 },
  ],
  
  // 🔍 문장 패턴 (한국어 문법 고려)
  sentencePatterns: [
    { pattern: /^(.+)\s*(해야|해야지|하자)(\s|$)/, weight: 5, description: '의무/계획 표현' },
    { pattern: /^(.+)\s*(가야|가자)(\s|$)/, weight: 4, description: '이동 계획' },
    { pattern: /^(.+)\s*(예약|신청|제출|접수)/, weight: 5, description: '공식 절차' },
    { pattern: /(오늘|내일|이번주)\s+(.+)/, weight: 3, description: '시간 기반 계획' },
    { pattern: /(.+)\s*(까지|전에|후에)\s*(해야|하기|완료)/, weight: 4, description: '기한 포함 할일' },
  ]
};

// 💡 강화된 아이디어 패턴 정의
const IDEA_PATTERNS = {
  // 🎨 창의성 키워드 (가중치 차등)
  keywords: [
    { keyword: '아이디어', weight: 5 },
    { keyword: '생각', weight: 3 },
    { keyword: '제안', weight: 4 },
    { keyword: '기획', weight: 4 },
    { keyword: '컨셉', weight: 4 },
    { keyword: '창의', weight: 4 },
    { keyword: '혁신', weight: 4 },
    { keyword: '개선', weight: 3 },
    { keyword: '새로운', weight: 3 },
    { keyword: '디자인', weight: 3 },
    { keyword: '전략', weight: 3 },
  ],
  
  // 🤔 창의적 사고 패턴
  patterns: [
    { pattern: /(.+)하면\s+(어떨까|어때)/, weight: 5, description: '제안/가정' },
    { pattern: /(.+)는\s+어때/, weight: 4, description: '의견 제시' },
    { pattern: /만약\s+(.+)/, weight: 4, description: '가정 상황' },
    { pattern: /(.+)면\s+좋겠다/, weight: 4, description: '희망/제안' },
    { pattern: /(.+)\?$/, weight: 3, description: '질문/탐구' },
    { pattern: /(왜|어떻게|언제)\s+(.+)/, weight: 3, description: '탐구 질문' },
  ]
};

// 📄 강화된 메모 패턴 정의
const MEMO_PATTERNS = {
  // 📚 정보성 키워드
  keywords: [
    { keyword: '메모', weight: 4 },
    { keyword: '기록', weight: 4 },
    { keyword: '참고', weight: 3 },
    { keyword: '정보', weight: 3 },
    { keyword: '내용', weight: 2 },
    { keyword: '사실', weight: 3 },
    { keyword: '데이터', weight: 3 },
    { keyword: '알림', weight: 3 },
    { keyword: '공지', weight: 3 },
    { keyword: '중요', weight: 2 },
  ],
  
  // 📋 정보성 패턴
  patterns: [
    { pattern: /(.+)(이다|입니다|임)(\s|$)/, weight: 4, description: '사실 진술' },
    { pattern: /(.+)(있다|없다|있음|없음)(\s|$)/, weight: 3, description: '상태 기술' },
    { pattern: /(.+)(였다|었다|던)(\s|$)/, weight: 3, description: '과거 사실' },
    { pattern: /^(\d+|[가-힣]+\s*\d+|[A-Za-z]+\s*\d+)/, weight: 2, description: '숫자/코드 정보' },
    { pattern: /(연락처|전화번호|주소|이메일|URL|링크)/, weight: 4, description: '연락 정보' },
  ]
};

// 🎤 회의록 패턴 정의
const MEETING_PATTERNS = {
  // 🎙️ 회의 관련 키워드
  keywords: [
    { keyword: '회의', weight: 5 },
    { keyword: '미팅', weight: 5 },
    { keyword: '논의', weight: 4 },
    { keyword: '안건', weight: 5 },
    { keyword: '결정', weight: 4 },
    { keyword: '의견', weight: 3 },
    { keyword: '발표', weight: 4 },
    { keyword: '보고', weight: 4 },
    { keyword: '공유', weight: 3 },
    { keyword: '검토', weight: 3 },
    { keyword: '협의', weight: 4 },
    { keyword: '회의록', weight: 5 },
  ],
  
  // 🗣️ 회의 진행 패턴
  patterns: [
    { pattern: /(회의|미팅)\s*(시작|종료|진행)/, weight: 5, description: '회의 진행' },
    { pattern: /(.+)(말씀|의견|발표|보고)/, weight: 4, description: '발언' },
    { pattern: /(안건|주제|논의)\s*(.+)/, weight: 4, description: '회의 주제' },
    { pattern: /(결정|합의|동의)/, weight: 4, description: '회의 결정사항' },
    { pattern: /(.+님|팀장|부장|과장|대리).+(말씀|의견|발표)/, weight: 5, description: '참석자 발언' },
  ]
};

/**
 * 🧠 컨텍스트 분석 기능
 */
interface ContextAnalysis {
  isNegative: boolean;      // 부정적 표현 포함
  isQuestion: boolean;      // 질문 형태
  isEmotional: boolean;     // 감정 표현 포함
  isPastTense: boolean;     // 과거형 표현
  isFactual: boolean;       // 사실 진술
  isUrgent: boolean;        // 긴급성 표현
}

/**
 * 컨텍스트 분석 함수
 */
function analyzeContext(text: string): ContextAnalysis {
  return {
    isNegative: /(안|못|싫|어려워|힘들어|불가능|안돼|아니)/.test(text),
    isQuestion: /(\?|어떨까|어때|왜|어떻게|언제|뭐|무엇)/.test(text),
    isEmotional: /(기뻐|슬퍼|화나|짜증|좋아|싫어|사랑|행복|우울)/.test(text),
    isPastTense: /(었다|았다|였다|던|했던|갔던|봤던)/.test(text),
    isFactual: /(이다|입니다|임|있다|없다|였다|였음)/.test(text),
    isUrgent: /(급히|빨리|당장|즉시|곧|마감|데드라인|오늘)/.test(text),
  };
}

/**
 * 🎯 통합 고급 분류 함수 v2.0
 */
export function categorizeByKeywords(content: string): Category {
  const text = content.toLowerCase().trim();
  
  if (!text) return '메모';
  
  // 컨텍스트 분석
  const context = analyzeContext(text);
  
  let todoScore = 0;
  let ideaScore = 0;
  let memoScore = 0;
  let meetingScore = 0;
  
  // === 1. To-Do 점수 계산 ===
  
  // 🎯 행동 동사 체크 (정확한 매칭)
  TODO_PATTERNS.actionVerbs.forEach(({ verb, weight, exact }) => {
    if (exact) {
      // 정확한 단어 경계 매칭 (예: "하기"는 매칭, "하기싫어"는 매칭 안됨)
      const regex = new RegExp(`\\b${verb}\\b|${verb}$`);
      if (regex.test(text)) {
        todoScore += weight;
      }
    } else {
      if (text.includes(verb)) {
        todoScore += weight;
      }
    }
  });
  
  // 🏢 장소 기반 패턴 (부정문 제외)
  if (!context.isNegative) {
    TODO_PATTERNS.places.forEach(({ place, weight }) => {
      if (text.includes(place)) {
        todoScore += weight;
      }
    });
  }
  
  // ⏰ 시간 표현 (긴급성 가중치)
  TODO_PATTERNS.timeExpressions.forEach(({ time, weight }) => {
    if (text.includes(time)) {
      todoScore += context.isUrgent ? weight * 1.5 : weight;
    }
  });
  
  // 📋 할일 키워드 (부정문 제외)
  if (!context.isNegative) {
    TODO_PATTERNS.taskKeywords.forEach(({ keyword, weight }) => {
      if (text.includes(keyword)) {
        todoScore += weight;
      }
    });
  }
  
  // 🔍 문장 패턴 체크 (컨텍스트 고려)
  TODO_PATTERNS.sentencePatterns.forEach(({ pattern, weight }) => {
    if (pattern.test(text) && !context.isNegative && !context.isPastTense) {
      todoScore += weight;
    }
  });
  
  // === 2. 아이디어 점수 계산 ===
  
  // 🎨 아이디어 키워드
  IDEA_PATTERNS.keywords.forEach(({ keyword, weight }) => {
    if (text.includes(keyword)) {
      ideaScore += weight;
    }
  });
  
  // 🤔 창의적 사고 패턴 (질문형 가중치)
  IDEA_PATTERNS.patterns.forEach(({ pattern, weight }) => {
    if (pattern.test(text)) {
      ideaScore += context.isQuestion ? weight * 1.3 : weight;
    }
  });
  
  // === 3. 메모 점수 계산 ===
  
  // 📚 정보성 키워드
  MEMO_PATTERNS.keywords.forEach(({ keyword, weight }) => {
    if (text.includes(keyword)) {
      memoScore += weight;
    }
  });
  
  // 📋 정보성 패턴 (사실 진술 가중치)
  MEMO_PATTERNS.patterns.forEach(({ pattern, weight }) => {
    if (pattern.test(text)) {
      memoScore += context.isFactual ? weight * 1.2 : weight;
    }
  });
  
  // === 4. 회의록 점수 계산 ===
  
  // 🎤 회의 관련 키워드
  MEETING_PATTERNS.keywords.forEach(({ keyword, weight }) => {
    if (text.includes(keyword)) {
      meetingScore += weight;
    }
  });
  
  // 🗣️ 회의 진행 패턴
  MEETING_PATTERNS.patterns.forEach(({ pattern, weight }) => {
    if (pattern.test(text)) {
      meetingScore += weight;
    }
  });
  
  // === 5. 컨텍스트 기반 조정 ===
  
  // 🚫 부정적 표현 시 To-Do 점수 감소
  if (context.isNegative) {
    todoScore *= 0.3;
  }
  
  // 🤔 질문 형태는 아이디어 가중치
  if (context.isQuestion) {
    ideaScore *= 1.4;
  }
  
  // 📚 과거형/사실 진술은 메모 가중치
  if (context.isPastTense || context.isFactual) {
    memoScore *= 1.3;
  }
  
  // 😢 감정 표현은 메모 경향
  if (context.isEmotional) {
    memoScore += 2;
    todoScore *= 0.7;
  }
  
  // === 6. 디버깅 로그 (개선된 상세 정보) ===
  console.log(`📊 분류 분석: "${content}"`);
  console.log(`🔍 컨텍스트:`, context);
  console.log(`📈 점수 - To-Do: ${todoScore.toFixed(1)}, 아이디어: ${ideaScore.toFixed(1)}, 메모: ${memoScore.toFixed(1)}, 회의록: ${meetingScore.toFixed(1)}`);
  
  // === 7. 밸런스 최적화된 분류 결정 ===
  const maxScore = Math.max(todoScore, ideaScore, memoScore, meetingScore);
  const minThreshold = 2; // 최소 임계값 낮춤
  
  if (maxScore < minThreshold) {
    // 모든 점수가 낮으면 컨텍스트로 판단
    if (context.isQuestion) {
      console.log('🤔 최종 분류: 아이디어 (컨텍스트: 질문)');
      return '아이디어';
    } else if (context.isFactual || context.isPastTense) {
      console.log('📚 최종 분류: 메모 (컨텍스트: 사실/과거)');
      return '메모';
    } else {
      console.log('📝 최종 분류: 메모 (기본값)');
      return '메모';
    }
  }
  
  // 명확한 승자가 있는 경우
  if (meetingScore === maxScore && meetingScore >= minThreshold) {
    console.log('🎤 최종 분류: 회의록');
    return '회의록';
  } else if (todoScore === maxScore && todoScore >= minThreshold) {
    console.log('✅ 최종 분류: To-Do');
    return 'To-Do';
  } else if (ideaScore === maxScore && ideaScore >= minThreshold) {
    console.log('💡 최종 분류: 아이디어');
    return '아이디어';
  } else if (memoScore === maxScore && memoScore >= minThreshold) {
    console.log('📝 최종 분류: 메모');
    return '메모';
  }
  
  // 동점이거나 애매한 경우 컨텍스트로 판단
  console.log('🎯 최종 분류: 메모 (동점/애매한 경우)');
  return '메모';
}

/**
 * AI 분류 함수 (API 호출)
 */
export async function categorizeWithAI(content: string): Promise<Category> {
  try {
    const response = await fetch('/api/categorize', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ content }),
    });

    if (!response.ok) {
      throw new Error('API 요청 실패');
    }

    const data = await response.json();
    return data.category as Category;
  } catch (error) {
    console.warn('AI 분류 실패, 키워드 분류로 대체:', error);
    return categorizeByKeywords(content);
  }
}

/**
 * 🚀 실시간 미리보기용 빠른 분류 함수 (성능 최적화)
 * 메인 분류와 동일한 로직 사용하여 일관성 보장
 */
export function categorizeForPreview(content: string): Category {
  // 너무 짧은 텍스트는 기본값 반환 (성능 최적화)
  if (!content || content.trim().length < 2) {
    return '메모';
  }
  
  // 동일한 로직 사용 (일관성 보장)
  return categorizeByKeywords(content);
}

/**
 * 🔧 디바운싱 유틸리티 (실시간 미리보기 최적화용)
 */
let debounceTimer: NodeJS.Timeout | null = null;

export function debouncedCategorizeForPreview(
  content: string, 
  callback: (category: Category) => void, 
  delay: number = 300
): void {
  if (debounceTimer) {
    clearTimeout(debounceTimer);
  }
  
  debounceTimer = setTimeout(() => {
    const category = categorizeForPreview(content);
    callback(category);
  }, delay);
}

/**
 * 메인 분류 함수
 */
export async function categorizeContent(content: string): Promise<Category> {
  // 통합된 분류 시스템 사용
  return categorizeByKeywords(content);
}

/**
 * 카테고리별 색상 반환
 */
export function getCategoryColor(category: Category): 'yellow' | 'pink' | 'blue' | 'green' | 'purple' {
  const colorMap = {
    'To-Do': 'pink',
    '아이디어': 'blue',
    '메모': 'yellow',
    '회의록': 'purple'
  };
  return colorMap[category] as 'yellow' | 'pink' | 'blue' | 'green' | 'purple';
}

/**
 * 카테고리 우선순위 반환 (정렬용)
 */
export function getCategoryPriority(category: Category): number {
  const priorityMap: Record<Category, number> = {
    'To-Do': 1,
    '아이디어': 2,
    '메모': 3,
    '회의록': 4
  };
  return priorityMap[category] || 99;
}

/**
 * 🧪 알고리즘 테스트 및 검증 함수
 */
export function testCategorizeAlgorithm(): void {
  const testCases: Array<{input: string, expected: Category, description: string}> = [
    // To-Do 테스트 케이스
    { input: '은행 가기', expected: 'To-Do' as Category, description: '장소 + 행동' },
    { input: '오늘 회의 준비하기', expected: 'To-Do' as Category, description: '시간 + 업무' },
    { input: '내일까지 보고서 제출해야', expected: 'To-Do' as Category, description: '기한 + 의무' },
    { input: '운동하기', expected: 'To-Do' as Category, description: '행동 동사' },
    { input: '병원 예약하기', expected: 'To-Do' as Category, description: '장소 + 예약' },
    
    // 아이디어 테스트 케이스
    { input: '새로운 앱 아이디어가 있어', expected: '아이디어' as Category, description: '창의성 키워드' },
    { input: '이렇게 하면 어떨까?', expected: '아이디어' as Category, description: '제안 질문' },
    { input: 'UI 디자인을 개선하면 좋겠다', expected: '아이디어' as Category, description: '개선 제안' },
    { input: '만약 AI를 추가한다면', expected: '아이디어' as Category, description: '가정 상황' },
    
    // 메모 테스트 케이스
    { input: '회의 시간은 3시입니다', expected: '메모' as Category, description: '사실 진술' },
    { input: '연락처: 010-1234-5678', expected: '메모' as Category, description: '연락 정보' },
    { input: '어제 배운 내용 정리', expected: '메모' as Category, description: '과거 사실' },
    { input: 'API 키가 있다', expected: '메모' as Category, description: '상태 기술' },
    
    // 컨텍스트 테스트 케이스 (부정문, 감정 등)
    { input: '운동하기 싫어', expected: '메모' as Category, description: '부정 + 감정 표현' },
    { input: '은행 안 가기', expected: '메모' as Category, description: '부정문' },
    { input: '어제 병원에 갔었다', expected: '메모' as Category, description: '과거형' },
  ];

  console.log('🧪 AI 분류 알고리즘 테스트 시작...\n');
  
  let correctCount = 0;
  const results: Array<{test: string, expected: Category, actual: Category, passed: boolean, description: string}> = [];
  
  testCases.forEach(({ input, expected, description }) => {
    const actual: Category = categorizeByKeywords(input);
    const passed = actual === expected;
    
    results.push({ test: input, expected, actual, passed, description });
    
    if (passed) {
      correctCount++;
      console.log(`✅ "${input}" → ${actual} (${description})`);
    } else {
      console.log(`❌ "${input}" → 예상: ${expected}, 실제: ${actual} (${description})`);
    }
  });
  
  const accuracy = (correctCount / testCases.length * 100).toFixed(1);
  console.log(`\n📊 테스트 결과: ${correctCount}/${testCases.length} 성공 (정확도: ${accuracy}%)`);
  
  // 카테고리별 성공률 분석
  const categoryStats = ['To-Do', '아이디어', '메모'].map(category => {
    const categoryTests = results.filter(r => r.expected === category);
    const categorySuccess = categoryTests.filter(r => r.passed).length;
    return {
      category,
      accuracy: categoryTests.length > 0 ? (categorySuccess / categoryTests.length * 100).toFixed(1) : '0',
      total: categoryTests.length
    };
  });
  
  console.log('\n📈 카테고리별 정확도:');
  categoryStats.forEach(({ category, accuracy, total }) => {
    console.log(`  ${category}: ${accuracy}% (${total}개 테스트)`);
  });
  
  return;
}