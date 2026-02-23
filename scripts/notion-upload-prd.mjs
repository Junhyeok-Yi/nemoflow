import { Client } from '@notionhq/client';

const NOTION_TOKEN = process.env.NOTION_TOKEN;
const NOTION_PAGE_ID = process.env.NOTION_PAGE_ID;

if (!NOTION_TOKEN || !NOTION_PAGE_ID) {
  console.error('❌ Missing env vars. Set NOTION_TOKEN and NOTION_PAGE_ID');
  process.exit(1);
}

const notion = new Client({ auth: NOTION_TOKEN });

const prdTitle = process.argv[2] || 'Post-things PRD — Phase 1 (Meeting Mode + 정리 품질 개선)';

function h2(text) {
  return {
    object: 'block',
    type: 'heading_2',
    heading_2: { rich_text: [{ type: 'text', text: { content: text } }] },
  };
}

function h3(text) {
  return {
    object: 'block',
    type: 'heading_3',
    heading_3: { rich_text: [{ type: 'text', text: { content: text } }] },
  };
}

function p(text) {
  return {
    object: 'block',
    type: 'paragraph',
    paragraph: { rich_text: [{ type: 'text', text: { content: text } }] },
  };
}

function bullet(text) {
  return {
    object: 'block',
    type: 'bulleted_list_item',
    bulleted_list_item: { rich_text: [{ type: 'text', text: { content: text } }] },
  };
}

const blocks = [
  h2(prdTitle),
  p('작성일: ' + new Date().toISOString().slice(0, 10)),

  h3('1) 배경 / 문제'),
  p('현재 Post-things는 입력 속도는 빠르지만, 회의 이후 정리 단계에서 시간이 다시 많이 듭니다.'),
  bullet('회의 단위로 묶어서 보기 어려움'),
  bullet('AI 분류 정확도가 애매해 최근순 중심으로만 사용'),
  bullet('정리 시간 절감이라는 핵심 가치가 충분히 나오지 않음'),

  h3('2) 목표 (Phase 1)'),
  bullet('회의 단위 관리 가능하게 만들기'),
  bullet('기존 카테고리(To-Do / Idea / 메모) 유지'),
  bullet('애매한 항목은 강제 분류하지 않고 검토 필요(?)로 처리'),

  h3('3) Non-Goal'),
  bullet('완전 자동 분류(무교정)'),
  bullet('새 대분류 체계 도입(Now/Later/Drop)'),
  bullet('OpenClaw 에이전트 자동 실행(Phase 3 예정)'),

  h3('4) 제품 원칙'),
  bullet('Single Source of Truth: 포스트잇 원본은 하나'),
  bullet('탭은 필터/뷰: 같은 카드가 여러 탭에서 다르게 그룹핑되어 보임'),
  bullet('기존 카테고리 유지: To-Do / Idea / 메모'),
  bullet('애매함은 상태값으로 처리: 검토 필요(?) 배지'),
  bullet('조작 안정성 우선: 카드 이동은 드래그앤드롭만 사용'),

  h3('5) 사용자 플로우'),
  p('A. 회의 중'),
  bullet('메모 입력 화면 상단의 작은 Meeting 토글 ON'),
  bullet('회의 중 작성되는 노트에 meeting_session_id 자동 부여'),
  bullet('작성 흐름은 기존과 동일'),
  p('B. 회의 후 정리'),
  bullet('Diagram 화면에서 Meeting 탭 선택'),
  bullet('해당 회의 노트만 모아 확인'),
  bullet('애매한 노트는 ? 배지로 표시'),
  bullet('필요 시 드래그앤드롭으로 카테고리 정리'),
  bullet('완료/삭제는 기존 방식 유지'),

  h3('6) 기능 요구사항 (FR)'),
  bullet('FR-1 Meeting Session: 회의 시작/종료 및 session 자동 연결'),
  bullet('FR-2 Meeting 탭: session 필터 뷰 제공'),
  bullet('FR-3 검토 필요 배지: needs_review=true 일 때 ? 노출'),
  bullet('FR-4 Drag & Drop: 이동 즉시 저장 및 전 탭 동기 반영'),
  bullet('FR-5 기존 UX 보존: Categories/Topics/Timeline 유지'),

  h3('7) 데이터 모델 (최소안)'),
  bullet('meeting_sessions(id, title, status, started_at, ended_at, created_at)'),
  bullet('sticky_notes 확장: meeting_session_id, needs_review, classification_confidence'),
  bullet('note_reclassifications(id, note_id, from_category, to_category, source, created_at)'),

  h3('8) API 초안'),
  bullet('POST /api/meetings/start'),
  bullet('POST /api/meetings/:id/end'),
  bullet('GET /api/meetings/active'),
  bullet('GET /api/meetings/:id/notes'),
  bullet('PATCH /api/notes/:id'),

  h3('9) QA Acceptance Criteria'),
  bullet('Meeting ON 상태 노트는 session 연결'),
  bullet('Meeting OFF/종료 후 노트는 session 미연결'),
  bullet('Meeting 탭은 해당 session 노트만 노출'),
  bullet('needs_review=true 노트는 ? 배지 노출'),
  bullet('드래그 이동 결과가 새로고침 후에도 유지'),
  bullet('다른 탭에서도 동일 노트 상태 즉시 반영'),

  h3('10) 일정 (1~2주)'),
  bullet('D1~D2: 스키마/마이그레이션'),
  bullet('D3~D4: Meeting 토글 + session lifecycle'),
  bullet('D5~D6: Meeting 탭 + 필터링'),
  bullet('D7~D8: ? 배지 + confidence 연결'),
  bullet('D9~D10: DnD/QA/버그 수정'),

  h3('11) 리스크 & 대응'),
  bullet('분류 오탐: 강제 분류 대신 ? 배지'),
  bullet('UX 혼란: 탭은 필터라는 온보딩 문구 제공'),
  bullet('DnD 오작동: 모바일/데스크탑 제스처 충돌 집중 QA'),
  bullet('스코프 확장 위험: Phase 1은 session + 필터 일관성까지만'),
];

async function run() {
  try {
    await notion.blocks.children.append({
      block_id: NOTION_PAGE_ID.replace(/-/g, ''),
      children: blocks,
    });

    console.log('✅ PRD blocks uploaded to Notion page.');
  } catch (error) {
    console.error('❌ Upload failed:', error?.body || error?.message || error);
    process.exit(1);
  }
}

run();
