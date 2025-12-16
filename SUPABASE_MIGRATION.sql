-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- Supabase 데이터베이스 마이그레이션 SQL
-- 회의록 기능 추가를 위한 스키마 업데이트
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- Step 1: 회의록 관련 필드 추가
ALTER TABLE sticky_notes
ADD COLUMN IF NOT EXISTS meeting_id TEXT,
ADD COLUMN IF NOT EXISTS meeting_title TEXT,
ADD COLUMN IF NOT EXISTS is_meeting_mode BOOLEAN DEFAULT FALSE;

-- Step 2: 인덱스 추가 (성능 최적화)
CREATE INDEX IF NOT EXISTS idx_sticky_notes_meeting_id ON sticky_notes(meeting_id);

-- Step 3: category CHECK 제약 조건 업데이트
ALTER TABLE sticky_notes DROP CONSTRAINT IF EXISTS sticky_notes_category_check;
ALTER TABLE sticky_notes 
ADD CONSTRAINT sticky_notes_category_check 
CHECK (category IN ('To-Do', '메모', '아이디어', '회의록'));

-- Step 4: color CHECK 제약 조건 업데이트
ALTER TABLE sticky_notes DROP CONSTRAINT IF EXISTS sticky_notes_color_check;
ALTER TABLE sticky_notes 
ADD CONSTRAINT sticky_notes_color_check 
CHECK (color IN ('yellow', 'pink', 'blue', 'green', 'purple'));

-- Step 5: 회의별 메모 조회를 위한 함수 (선택사항)
CREATE OR REPLACE FUNCTION get_meeting_notes(p_meeting_id TEXT)
RETURNS TABLE (
  id TEXT,
  content TEXT,
  category TEXT,
  color TEXT,
  meeting_id TEXT,
  meeting_title TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    n.id,
    n.content,
    n.category,
    n.color,
    n.meeting_id,
    n.meeting_title,
    n.created_at,
    n.updated_at
  FROM sticky_notes n
  WHERE n.meeting_id = p_meeting_id
  ORDER BY n.created_at ASC;
END;
$$ LANGUAGE plpgsql;

-- Step 6: 회의 목록 조회 함수 (선택사항)
CREATE OR REPLACE FUNCTION get_meetings()
RETURNS TABLE (
  meeting_id TEXT,
  meeting_title TEXT,
  note_count BIGINT,
  first_note_time TIMESTAMPTZ,
  last_note_time TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    n.meeting_id,
    MAX(n.meeting_title) as meeting_title,
    COUNT(*) as note_count,
    MIN(n.created_at) as first_note_time,
    MAX(n.created_at) as last_note_time
  FROM sticky_notes n
  WHERE n.meeting_id IS NOT NULL
  GROUP BY n.meeting_id
  ORDER BY MAX(n.created_at) DESC;
END;
$$ LANGUAGE plpgsql;

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 실행 완료!
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- 검증 쿼리 (선택사항)
-- SELECT * FROM sticky_notes LIMIT 5;
-- SELECT * FROM get_meetings();
