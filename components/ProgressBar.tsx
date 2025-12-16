/**
 * ProgressBar 컴포넌트
 * 
 * To-Do 완료율을 막대 그래프로 시각화합니다.
 * 완료된 항목과 전체 항목 수를 표시하며, 퍼센트로 진행률을 보여줍니다.
 * 
 * @example
 * <ProgressBar completed={4} total={10} />
 * // 결과: [■■■■□□□□□□] 4/10 (40%)
 */

'use client';

interface ProgressBarProps {
  completed: number;      // 완료된 항목 수
  total: number;         // 전체 항목 수
  size?: 'sm' | 'md' | 'lg';  // 막대 크기
  showLabel?: boolean;   // 라벨 표시 여부
}

export function ProgressBar({ 
  completed, 
  total, 
  size = 'md',
  showLabel = true 
}: ProgressBarProps) {
  // 퍼센트 계산 (0으로 나누기 방지)
  const percentage = total === 0 ? 0 : Math.round((completed / total) * 100);
  
  // 크기별 스타일
  const sizeClasses = {
    sm: 'h-2',
    md: 'h-3',
    lg: 'h-4'
  };
  
  return (
    <div className="flex items-center gap-3">
      {/* 막대 그래프 */}
      <div className={`flex-1 bg-gray-200 rounded-full overflow-hidden ${sizeClasses[size]}`}>
        <div 
          className="h-full bg-gradient-to-r from-green-400 to-green-600 transition-all duration-500 ease-out"
          style={{ width: `${percentage}%` }}
        />
      </div>
      
      {/* 라벨: 4/10 (40%) */}
      {showLabel && (
        <div className="flex items-center gap-2 text-sm font-medium min-w-[120px]">
          <span className="text-green-600">{completed}</span>
          <span className="text-gray-400">/</span>
          <span className="text-gray-600">{total}</span>
          <span className="text-gray-500">({percentage}%)</span>
        </div>
      )}
    </div>
  );
}
