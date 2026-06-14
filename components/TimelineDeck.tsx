'use client';

import { useRef, useState, useMemo, useEffect, useLayoutEffect } from 'react';
import { StickyNote } from '@/lib/types';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { Plus } from 'lucide-react';

/**
 * TimelineDeck — 모바일 전용 "시간 축 카드 덱" 브라우저.
 *
 * - 메모를 Z축 깊이 스택(덱)으로 표시. 앞 카드 = 현재 보는 메모.
 * - 하단 일자형 시간 룰러(카메라 줌 눈금자 느낌). 중앙 고정 인디케이터.
 * - 좌우 스와이프로 시간 탐색(인덱스 기반, 손 떼면 스냅).
 *     · 손가락 왼→오  = 과거로 (index 감소)
 *     · 손가락 오→왼  = 현재로 (index 증가)
 * - 최신(맨 오른쪽)에서 더 오→왼으로 당기면 → + 버튼/빈 메모지 등장 →
 *   임계점 넘기면 햅틱 + 새 메모 작성 화면.
 *
 * 데스크탑은 AffinityDiagram의 기존 탭+그리드를 그대로 사용 — 이 컴포넌트는 md:hidden 안에서만 마운트된다.
 */

interface TimelineDeckProps {
  notes: StickyNote[];
  onNoteSelect: (note: StickyNote) => void;
  onSwitchToMemo: () => void;
  onCreateNew: () => void;
}

// ── 튜닝 상수 ──────────────────────────────────────────────
const TICK_GAP = 28;             // 룰러 눈금 간격(px)
const NEW_MEMO_THRESHOLD = 180;  // 새 메모 생성 임계 오버스크롤(raw px) — 의도적 제스처 필요
const DY = 28;                   // 깊이당 위로 이동(px) — Apple Wallet 수준 깊이감
const DSCALE = 0.08;             // 깊이당 축소 — 뒤 카드가 확연히 작아짐
const DOPA = 0.22;               // 깊이당 투명도 감소
const DX = 3;                    // 깊이당 오른쪽 stagger(px) — 엇갈려 쌓인 느낌
const MAXBEH = 3;                // 뒤로 보이는 최대 카드 수
const SETTLE_MS = 320;           // 스냅 애니메이션 시간
const FLICK_V = 0.35;            // 플릭 판정 속도(px/ms) — 더 관대한 플릭
const RUBBER_C = 0.55;           // 러버밴드 계수
const OVER_FRICTION = 0.45;      // 새 메모 오버스크롤 감쇠 — 일반보다 뻑뻑
const AXIS_LOCK_PX = 8;          // 축 잠금 임계
const BASE_Z = 100;
const RULER_H = 132;             // 하단 룰러 영역 높이(px)

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

function rubber(x: number, W: number) {
  const lim = RUBBER_C * (W || 360);
  return Math.sign(x) * (1 - 1 / (Math.abs(x) / lim + 1)) * lim;
}

function dayKeyOf(note: StickyNote) {
  const d = note.createdAt instanceof Date ? note.createdAt : new Date(note.createdAt);
  return format(d, 'yyyy-MM-dd');
}

function gradientFor(color: StickyNote['color']) {
  switch (color) {
    case 'yellow': return 'bg-gradient-to-br from-amber-100 via-orange-200 to-rose-300';
    case 'pink': return 'bg-gradient-to-br from-fuchsia-100 via-violet-200 to-indigo-300';
    case 'blue': return 'bg-gradient-to-br from-sky-100 via-blue-200 to-indigo-300';
    default: return 'bg-gradient-to-br from-lime-100 via-emerald-200 to-teal-300';
  }
}

function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const m = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(m.matches);
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches);
    m.addEventListener?.('change', handler);
    return () => m.removeEventListener?.('change', handler);
  }, []);
  return reduced;
}

export default function TimelineDeck({
  notes,
  onNoteSelect,
  onSwitchToMemo,
  onCreateNew,
}: TimelineDeckProps) {
  // 과거 → 현재 오름차순. index 0 = 가장 오래됨(룰러 왼쪽), maxIndex = 최신(오른쪽).
  const notesAsc = useMemo(() => {
    return [...notes].sort((a, b) => {
      const da = a.createdAt instanceof Date ? a.createdAt : new Date(a.createdAt);
      const db = b.createdAt instanceof Date ? b.createdAt : new Date(b.createdAt);
      return da.getTime() - db.getTime();
    });
  }, [notes]);
  const maxIndex = Math.max(0, notesAsc.length - 1);

  // 같은 날 내 순번 (0-base) — 룰러 밀집 시 시간 라벨 표시에 사용
  const dayLocalRanks = useMemo(() => {
    const ranks: number[] = new Array(notesAsc.length);
    const counts: Record<string, number> = {};
    notesAsc.forEach((note, i) => {
      const key = dayKeyOf(note);
      ranks[i] = counts[key] ?? 0;
      counts[key] = (counts[key] ?? 0) + 1;
    });
    return ranks;
  }, [notesAsc]);

  const reduced = useReducedMotion();

  // 홈 = 최신(maxIndex)에서 시작
  const [progress, setProgress] = useState(maxIndex);
  const [overshoot, setOvershoot] = useState(0); // 현재 끝 너머 raw px (>=0)
  const [containerW, setContainerW] = useState(0);

  // ── refs (제스처 중 60fps 유지를 위해 상태 대신 ref로 추적) ──
  const containerRef = useRef<HTMLDivElement | null>(null);
  const progressRef = useRef(progress);
  const overshootRef = useRef(overshoot);
  const maxIndexRef = useRef(maxIndex);
  const reducedRef = useRef(reduced);
  const notesAscRef = useRef(notesAsc);
  progressRef.current = progress;
  overshootRef.current = overshoot;
  maxIndexRef.current = maxIndex;
  reducedRef.current = reduced;
  notesAscRef.current = notesAsc;

  const activeRef = useRef(false);
  const axisRef = useRef<'h' | 'v' | null>(null);
  const startXRef = useRef(0);
  const startYRef = useRef(0);
  const startProgressRef = useRef(0);
  const lastXRef = useRef(0);
  const lastTRef = useRef(0);
  const velRef = useRef(0);
  const committingRef = useRef(false);
  const hapticLatchRef = useRef(false);
  const rafRef = useRef<number | null>(null);
  const tweenRef = useRef<number | null>(null);

  // 노트 수가 바뀌면 progress 범위 보정
  useEffect(() => {
    setProgress((p) => clamp(p, 0, maxIndex));
  }, [maxIndex]);

  // 컨테이너 너비 측정
  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const measure = () => setContainerW(el.clientWidth);
    measure();
    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(measure);
      ro.observe(el);
    }
    return () => ro?.disconnect();
  }, []);

  useEffect(() => {
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      if (tweenRef.current != null) cancelAnimationFrame(tweenRef.current);
    };
  }, []);

  // ── 렌더 코얼레싱 (drag 중) ──
  const scheduleRender = () => {
    if (rafRef.current != null) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      setProgress(progressRef.current);
      setOvershoot(overshootRef.current);
    });
  };

  const cancelTween = () => {
    if (tweenRef.current != null) {
      cancelAnimationFrame(tweenRef.current);
      tweenRef.current = null;
    }
  };

  // progress/overshoot를 목표값으로 부드럽게 tween (스냅/스프링백)
  const startTween = (toProgress: number, toOvershoot: number) => {
    cancelTween();
    const fromP = progressRef.current;
    const fromO = overshootRef.current;
    const dur = reducedRef.current ? 0 : SETTLE_MS;
    if (dur === 0 || (Math.abs(toProgress - fromP) < 0.001 && Math.abs(toOvershoot - fromO) < 0.5)) {
      progressRef.current = toProgress;
      overshootRef.current = toOvershoot;
      setProgress(toProgress);
      setOvershoot(toOvershoot);
      return;
    }
    const startT = performance.now();
    const step = (now: number) => {
      const t = clamp((now - startT) / dur, 0, 1);
      const e = 1 - Math.pow(1 - t, 3); // easeOutCubic
      const p = fromP + (toProgress - fromP) * e;
      const o = fromO + (toOvershoot - fromO) * e;
      progressRef.current = p;
      overshootRef.current = o;
      setProgress(p);
      setOvershoot(o);
      if (t < 1) {
        tweenRef.current = requestAnimationFrame(step);
      } else {
        tweenRef.current = null;
        progressRef.current = toProgress;
        overshootRef.current = toOvershoot;
        setProgress(toProgress);
        setOvershoot(toOvershoot);
      }
    };
    tweenRef.current = requestAnimationFrame(step);
  };

  const fireHapticOnce = () => {
    if (hapticLatchRef.current) return;
    hapticLatchRef.current = true;
    // iOS Safari는 Vibration API 미지원 → navigator.vibrate 부재 → 무음 no-op (Android Chrome만 진동)
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      navigator.vibrate(15);
    }
  };

  const openFront = () => {
    const idx = clamp(Math.round(progressRef.current), 0, maxIndexRef.current);
    const note = notesAscRef.current[idx];
    if (note) {
      onNoteSelect(note);
      onSwitchToMemo();
    }
  };

  // ── 터치 핸들러 (touch-action:none으로 브라우저 기본 스크롤 차단) ──
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length !== 1) return;
    cancelTween();
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    const t = e.touches[0];
    activeRef.current = true;
    axisRef.current = null;
    committingRef.current = false;
    hapticLatchRef.current = false;
    startXRef.current = t.clientX;
    startYRef.current = t.clientY;
    startProgressRef.current = progressRef.current;
    lastXRef.current = t.clientX;
    lastTRef.current = e.timeStamp;
    velRef.current = 0;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!activeRef.current || e.touches.length !== 1) return;
    const t = e.touches[0];
    const dx = t.clientX - startXRef.current;
    const dy = t.clientY - startYRef.current;

    if (axisRef.current === null) {
      if (Math.abs(dx) < AXIS_LOCK_PX && Math.abs(dy) < AXIS_LOCK_PX) return;
      axisRef.current = Math.abs(dx) > Math.abs(dy) ? 'h' : 'v';
    }
    if (axisRef.current === 'v') return; // 세로 제스처는 무시(덱은 전체화면)

    // 속도 샘플
    const now = e.timeStamp;
    const dt = now - lastTRef.current;
    if (dt > 0) velRef.current = (t.clientX - lastXRef.current) / dt;
    lastXRef.current = t.clientX;
    lastTRef.current = now;

    const W = (typeof window !== 'undefined' && window.innerWidth) || containerW || 360;
    const STEP_PX = Math.min(W * 0.35, 150); // 카드 1장당 131px(375px 폰) — 더 빠른 스와이프
    const maxIdx = maxIndexRef.current;
    const target = startProgressRef.current - dx / STEP_PX; // 손가락 왼→오(dx>0) = 과거(index 감소)

    let nextProgress: number;
    let nextOvershoot = 0;

    if (target < 0) {
      // 가장 오래된 것 너머 → 러버밴드(시각 동작 없음), progress 0 고정
      nextProgress = 0;
      committingRef.current = false;
      hapticLatchRef.current = false;
    } else if (target > maxIdx) {
      // 현재 너머 → 새 메모 오버스크롤 (OVER_FRICTION 감쇠로 저항감)
      nextProgress = maxIdx;
      const rawOver = (target - maxIdx) * STEP_PX; // raw px
      nextOvershoot = rubber(rawOver * OVER_FRICTION, W); // 감쇠 후 러버밴드
      if (rawOver >= NEW_MEMO_THRESHOLD) {
        committingRef.current = true;
        fireHapticOnce();
      } else {
        committingRef.current = false;
        hapticLatchRef.current = false;
      }
    } else {
      nextProgress = target;
      committingRef.current = false;
    }

    progressRef.current = nextProgress;
    overshootRef.current = nextOvershoot;
    scheduleRender();
  };

  const handleTouchEnd = () => {
    if (!activeRef.current) return;
    activeRef.current = false;
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }

    const axis = axisRef.current;
    const dxTotal = lastXRef.current - startXRef.current;

    // 탭(거의 안 움직임) → 앞 카드 열기
    if (axis === null || (axis === 'v' && Math.abs(dxTotal) < AXIS_LOCK_PX)) {
      if (Math.abs(dxTotal) < AXIS_LOCK_PX) {
        openFront();
      }
      startTween(clamp(Math.round(progressRef.current), 0, maxIndexRef.current), 0);
      return;
    }
    if (axis === 'v') {
      startTween(clamp(Math.round(progressRef.current), 0, maxIndexRef.current), 0);
      return;
    }

    // 가로 릴리즈 — 새 메모 커밋
    if (committingRef.current) {
      setOvershoot(0);
      overshootRef.current = 0;
      onCreateNew();
      return;
    }

    // 스냅 (플릭이면 한 칸 더)
    const maxIdx = maxIndexRef.current;
    const v = velRef.current; // +: 손가락 오른쪽 이동 → 과거
    let snapped = Math.round(progressRef.current);
    if (Math.abs(v) > FLICK_V) {
      snapped += v > 0 ? -1 : 1;
    }
    snapped = clamp(snapped, 0, maxIdx);
    startTween(snapped, 0);
  };

  // ── 렌더 계산 ──
  const W = containerW || 360;
  const centerX = W / 2;
  // overP: 감쇠된 overshoot를 commit 시점 기준으로 정규화 (overP=1 ↔ rawOver=NEW_MEMO_THRESHOLD)
  const dampedThreshold = rubber(NEW_MEMO_THRESHOLD * OVER_FRICTION, W);
  const overP = clamp(overshoot / Math.max(dampedThreshold, 1), 0, 1.15);
  const crossed = overshoot >= dampedThreshold;

  // 마운트할 덱 카드 인덱스 (앞 + 뒤 MAXBEH + 들어오는 카드)
  const floorP = Math.floor(progress);
  const lo = clamp(floorP, 0, maxIndex);
  const hi = clamp(floorP + MAXBEH + 1, 0, maxIndex);
  const deckIndices: number[] = [];
  for (let n = lo; n <= hi; n++) deckIndices.push(n);

  const getCardStyle = (n: number): React.CSSProperties => {
    const d = n - progress; // 0 = 앞, +면 뒤(더 최신), -면 앞으로 나오는(더 과거)
    let tx: number, ty: number, sc: number, op: number, tz: number, z: number;
    if (d >= 0) {
      const k = clamp(d, 0, MAXBEH + 1);
      tx = DX * k;        // 깊이당 오른쪽으로 stagger — 엇갈려 쌓인 느낌
      ty = -DY * k;
      sc = 1 - DSCALE * k;
      op = clamp(1 - DOPA * k, 0, 1);
      tz = -40 * k;
      z = BASE_Z - Math.round(k * 10);
    } else {
      const a = clamp(-d, 0, 1); // 0..1, 1이면 화면 밖(아래)
      tx = 0;
      ty = DY * a * 1.4;
      sc = 1 - 0.03 * a;
      op = clamp(1 - a, 0, 1);
      tz = 0;
      z = BASE_Z + 10;
    }
    return {
      transform: `translate(-50%, -50%) translate3d(${tx}px, ${ty}px, ${tz}px) scale(${sc})`,
      opacity: op,
      zIndex: z,
    };
  };

  // 현재 중심 메모 날짜 리드아웃
  const centerIdx = clamp(Math.round(progress), 0, maxIndex);
  const centerNote = notesAsc[centerIdx];
  const todayKey = format(new Date(), 'yyyy-MM-dd');
  let centerDateLabel = '';
  if (centerNote) {
    const d = centerNote.createdAt instanceof Date ? centerNote.createdAt : new Date(centerNote.createdAt);
    centerDateLabel = dayKeyOf(centerNote) === todayKey ? '오늘' : format(d, 'M월 d일 (E)', { locale: ko });
  }

  // 룰러: 화면 안 눈금만 렌더
  const stripTranslateX = centerX - progress * TICK_GAP;
  const halfSpan = centerX / TICK_GAP;
  const tickLo = clamp(Math.floor(progress - halfSpan) - 1, 0, maxIndex);
  const tickHi = clamp(Math.ceil(progress + halfSpan) + 1, 0, maxIndex);
  const tickIndices: number[] = [];
  for (let n = tickLo; n <= tickHi; n++) tickIndices.push(n);

  return (
    <div
      ref={containerRef}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
      className="relative w-full h-[100dvh] overflow-hidden bg-gradient-to-b from-slate-50 via-white to-slate-50 select-none"
      style={{ touchAction: 'none' }}
    >
      {/* 상단 날짜 리드아웃 */}
      <div className="absolute top-0 inset-x-0 pt-6 pb-2 flex flex-col items-center pointer-events-none z-[200]">
        <span className="text-xs font-semibold tracking-wider text-slate-400 uppercase">Timeline</span>
        <span className="mt-1 text-xl font-bold text-slate-800">{centerDateLabel}</span>
        <span className="mt-0.5 text-xs text-slate-400">
          {maxIndex >= 0 ? `${centerIdx + 1} / ${notesAsc.length}` : ''}
        </span>
      </div>

      {/* 덱 영역 */}
      <div
        className="absolute inset-x-0 top-0"
        style={{ bottom: RULER_H, perspective: '1200px' }}
      >
        <div className="relative w-full h-full" style={{ transformStyle: 'preserve-3d' }}>
          {deckIndices.map((n) => {
            const note = notesAsc[n];
            if (!note) return null;
            const isFront = Math.abs(n - progress) < 0.5;
            const style = getCardStyle(n);
            return (
              <div
                key={note.id}
                className="absolute left-1/2 top-1/2 w-[78vw] max-w-[340px] aspect-square will-change-transform"
                style={style}
              >
                <DeckCard note={note} isFront={isFront} />
              </div>
            );
          })}

          {/* 오버스크롤: 들어오는 빈 메모지 (오른쪽 → 중앙, 상단 바이어스) */}
          {overshoot > 0 && (
            <div
              className="absolute left-1/2 top-1/2 w-[78vw] max-w-[340px] aspect-square will-change-transform"
              style={{
                transform: `translate(-50%, -50%) translate3d(${(1 - clamp(overP, 0, 1)) * W}px, ${-(1 - clamp(overP, 0, 1)) * 24}px, 0) scale(${0.9 + 0.1 * clamp(overP, 0, 1)})`,
                opacity: clamp(overP * 1.2, 0, 1),
                zIndex: BASE_Z + 50,
              }}
            >
              <div className="relative w-full h-full rounded-2xl shadow-2xl bg-gradient-to-br from-amber-100 via-orange-200 to-rose-300 flex flex-col items-center justify-center">
                <div className="pointer-events-none absolute inset-0 rounded-2xl bg-[radial-gradient(circle_at_20%_12%,rgba(255,255,255,0.20),transparent_40%),radial-gradient(circle_at_82%_88%,rgba(0,0,0,0.10),transparent_45%)]" />
                <Plus className="w-10 h-10 text-slate-700/80" strokeWidth={2.5} />
                <span className="mt-2 text-sm font-semibold text-slate-700/90">
                  {crossed ? '놓으면 새 메모' : '새 메모'}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 오버스크롤: 하단에서 솟아오르는 + 버튼 */}
      {overshoot > 0 && (
        <div
          className="absolute left-1/2 z-[210] pointer-events-none"
          style={{ bottom: RULER_H + 24 }}
        >
          <div
            style={{
              transform: `translate(-50%, ${(1 - clamp(overP, 0, 1)) * 80}px) scale(${0.4 + 0.6 * clamp(overP, 0, 1)})`,
              opacity: clamp(overP, 0, 1),
            }}
            className={`w-14 h-14 rounded-2xl shadow-xl flex items-center justify-center transition-colors duration-150 ${
              crossed ? 'bg-blue-600 text-white' : 'bg-slate-400 text-white'
            }`}
          >
            <Plus className="w-7 h-7" strokeWidth={2.5} />
          </div>
        </div>
      )}

      {/* 하단 시간 룰러 (카메라 줌 눈금자) */}
      <div
        className="absolute inset-x-0 bottom-0 overflow-hidden"
        style={{ height: RULER_H }}
      >
        {/* 중앙 고정 인디케이터 */}
        <div className="absolute left-1/2 -translate-x-1/2 top-3 z-20 flex flex-col items-center pointer-events-none">
          <div className="w-0 h-0 border-l-[6px] border-r-[6px] border-t-[8px] border-transparent border-t-blue-500" />
        </div>
        <div
          className="absolute left-1/2 -translate-x-1/2 z-10 w-[2px] bg-blue-500/80 pointer-events-none"
          style={{ top: 12, height: 44 }}
        />

        {/* 눈금 strip */}
        <div
          className="absolute top-0 left-0 h-full will-change-transform"
          style={{ transform: `translateX(${stripTranslateX}px)` }}
        >
          {tickIndices.map((n) => {
            const note = notesAsc[n];
            if (!note) return null;
            const dist = Math.abs(n - progress);
            const fade = clamp(1 - (dist * TICK_GAP) / (W * 0.6), 0.18, 1);
            const tickH = 12 + 22 * fade;
            const isDayStart = n === 0 || dayKeyOf(note) !== dayKeyOf(notesAsc[n - 1]);
            const d = note.createdAt instanceof Date ? note.createdAt : new Date(note.createdAt);
            // 하루 30개 밀집 시: 같은 날 5번째마다 시:분 부제목 표시
            const dayLocalIdx = dayLocalRanks[n] ?? 0;
            const showTimeLabel = !isDayStart && dayLocalIdx > 0 && dayLocalIdx % 5 === 0;
            return (
              <div
                key={note.id}
                className="absolute flex flex-col items-center"
                style={{ left: n * TICK_GAP, top: 16, transform: 'translateX(-50%)' }}
              >
                <div
                  className="w-[2px] rounded-full bg-slate-400"
                  style={{ height: tickH, opacity: fade }}
                />
                {isDayStart && (
                  <span
                    className="mt-2 whitespace-nowrap text-[10px] font-semibold text-slate-500"
                    style={{ opacity: clamp(fade + 0.15, 0, 1) }}
                  >
                    {dayKeyOf(note) === todayKey ? '오늘' : format(d, 'M.d', { locale: ko })}
                  </span>
                )}
                {showTimeLabel && (
                  <span
                    className="mt-1 whitespace-nowrap text-[9px] text-slate-400"
                    style={{ opacity: clamp(fade, 0, 0.85) }}
                  >
                    {format(d, 'H:mm')}
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* 힌트 */}
        <div className="absolute inset-x-0 bottom-2 text-center pointer-events-none">
          <span className="text-[11px] text-slate-400">← 과거 · 현재 → · 끝에서 더 당기면 새 메모</span>
        </div>
      </div>
    </div>
  );
}

function DeckCard({ note, isFront }: { note: StickyNote; isFront: boolean }) {
  return (
    <div
      className={`relative w-full h-full rounded-2xl ${gradientFor(note.color)} ${
        isFront ? 'shadow-2xl' : 'shadow-md'
      }`}
    >
      <div className="pointer-events-none absolute inset-0 rounded-2xl bg-[radial-gradient(circle_at_20%_12%,rgba(255,255,255,0.20),transparent_40%),radial-gradient(circle_at_82%_88%,rgba(0,0,0,0.10),transparent_45%),linear-gradient(to_bottom_right,rgba(255,255,255,0.05),rgba(0,0,0,0.03))]" />

      <div className="relative h-full flex flex-col justify-between p-6 pt-8">
        <div className="flex-1 flex items-center justify-center">
          <p className="text-slate-900 text-center leading-relaxed font-medium text-base">
            {note.content}
          </p>
        </div>
        <div className="flex items-center justify-between pt-4 border-t border-black/10">
          <span className="text-xs text-slate-700 font-medium">{note.category}</span>
          <span className="text-xs text-slate-700 font-semibold">
            {note.meetingSessionId ? '회의' : ''}
          </span>
        </div>
      </div>

      {note.isCompleted && (
        <div className="absolute inset-0 bg-black/50 rounded-2xl flex items-center justify-center">
          <span className="font-bold text-sm text-white">완료됨</span>
        </div>
      )}
    </div>
  );
}
