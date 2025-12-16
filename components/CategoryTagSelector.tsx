/**
 * CategoryTagSelector 컴포넌트
 * 
 * AI가 예측한 카테고리를 표시하고, 사용자가 수정할 수 있는 드롭다운입니다.
 * 사용자가 수정한 데이터는 파인튜닝에 활용됩니다.
 */

'use client';

import { Category } from '@/lib/types';
import { Tag, ChevronDown } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface CategoryTagSelectorProps {
  predictedCategory: Category;       // AI가 예측한 카테고리
  onSelect: (category: Category) => void;  // 카테고리 선택 시 콜백
  disabled?: boolean;                 // 비활성화 여부
}

/**
 * 카테고리별 이모지 및 색상
 */
const CATEGORY_CONFIG: Record<Category, { emoji: string; color: string }> = {
  'To-Do': { emoji: '📌', color: 'text-pink-600 bg-pink-50 border-pink-200' },
  '메모': { emoji: '📝', color: 'text-amber-600 bg-amber-50 border-amber-200' },
  '아이디어': { emoji: '💡', color: 'text-blue-600 bg-blue-50 border-blue-200' },
  '회의록': { emoji: '🎤', color: 'text-purple-600 bg-purple-50 border-purple-200' },
};

export function CategoryTagSelector({ 
  predictedCategory, 
  onSelect,
  disabled = false 
}: CategoryTagSelectorProps) {
  const config = CATEGORY_CONFIG[predictedCategory];
  
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild disabled={disabled}>
        <button 
          className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm font-medium transition-all hover:shadow-md ${config.color} ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        >
          <Tag className="w-3.5 h-3.5" />
          <span>{config.emoji} {predictedCategory}</span>
          {!disabled && <ChevronDown className="w-3 h-3 ml-1" />}
        </button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent align="start" className="w-40">
        <DropdownMenuItem 
          onClick={() => onSelect('To-Do')}
          className="cursor-pointer"
        >
          <span className="mr-2">{CATEGORY_CONFIG['To-Do'].emoji}</span>
          <span>To-Do</span>
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => onSelect('메모')}
          className="cursor-pointer"
        >
          <span className="mr-2">{CATEGORY_CONFIG['메모'].emoji}</span>
          <span>메모</span>
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => onSelect('아이디어')}
          className="cursor-pointer"
        >
          <span className="mr-2">{CATEGORY_CONFIG['아이디어'].emoji}</span>
          <span>아이디어</span>
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => onSelect('회의록')}
          className="cursor-pointer"
        >
          <span className="mr-2">{CATEGORY_CONFIG['회의록'].emoji}</span>
          <span>회의록</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
