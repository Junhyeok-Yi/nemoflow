/**
 * useDebounce 커스텀 훅
 * 
 * 빠르게 변경되는 값을 지연시켜서 성능을 최적화합니다.
 * 예: 검색어 입력 시 매 타이핑마다 API 호출하지 않고 입력이 멈춘 후에만 호출
 * 
 * @example
 * const [searchTerm, setSearchTerm] = useState('');
 * const debouncedSearchTerm = useDebounce(searchTerm, 500);
 * 
 * useEffect(() => {
 *   // 사용자가 0.5초 동안 타이핑을 멈춘 후에만 실행됨
 *   searchAPI(debouncedSearchTerm);
 * }, [debouncedSearchTerm]);
 */

'use client';

import { useState, useEffect } from 'react';

/**
 * 값을 지연시키는 디바운스 훅
 * 
 * @param value - 디바운스할 값
 * @param delay - 지연 시간 (밀리초)
 * @returns 지연된 값
 */
export function useDebounce<T>(value: T, delay: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    // delay 시간 후에 값 업데이트
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // 값이 변경되면 이전 타이머를 취소하고 새로운 타이머 시작
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * 콜백 함수를 디바운스하는 훅
 * 
 * @example
 * const debouncedSave = useDebouncedCallback((value) => {
 *   saveToAPI(value);
 * }, 1000);
 * 
 * <input onChange={(e) => debouncedSave(e.target.value)} />
 */
export function useDebouncedCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number = 300
): (...args: Parameters<T>) => void {
  const [timeoutId, setTimeoutId] = useState<NodeJS.Timeout | null>(null);

  return (...args: Parameters<T>) => {
    // 이전 타이머가 있으면 취소
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    // 새로운 타이머 시작
    const newTimeoutId = setTimeout(() => {
      callback(...args);
    }, delay);

    setTimeoutId(newTimeoutId);
  };
}
