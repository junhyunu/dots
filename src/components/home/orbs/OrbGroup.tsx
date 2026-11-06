"use client";
// 역량 구슬 7개. 태블릿 이상은 한 줄, 모바일은 캐러셀(가운데 온 구슬이 선택됨).
// 키보드: 하나의 라디오 그룹 — Tab으로 들어와 ←→(↑↓)로 이동하며 선택, Home/End.
import { useCallback, useEffect, useRef, type KeyboardEvent } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { COMPETENCIES } from "@/lib/domain/competencies";
import type { CompetencyId } from "@/lib/domain/types";
import GlassOrb from "./GlassOrb";

interface Props {
  selected: CompetencyId;
  counts: Record<CompetencyId, number>;
  onSelect: (id: CompetencyId) => void;
}

const IDS = COMPETENCIES.map((c) => c.id);
const SCROLL_TIMELINE = typeof CSS !== "undefined" && CSS.supports("animation-timeline: view()");

function useArrowKeys(selected: CompetencyId, onSelect: (id: CompetencyId) => void, focus: (id: CompetencyId) => void) {
  return (e: KeyboardEvent) => {
    const i = IDS.indexOf(selected);
    const next =
      e.key === "ArrowRight" || e.key === "ArrowDown" ? IDS[(i + 1) % IDS.length]
      : e.key === "ArrowLeft" || e.key === "ArrowUp" ? IDS[(i - 1 + IDS.length) % IDS.length]
      : e.key === "Home" ? IDS[0]
      : e.key === "End" ? IDS[IDS.length - 1]
      : null;
    if (!next) return;
    e.preventDefault();
    onSelect(next);
    focus(next);
  };
}

/** 화면 밖이면 구슬 애니메이션을 멈춘다 */
function usePauseOffscreen(ref: React.RefObject<HTMLElement | null>) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => el.setAttribute("data-orbs-paused", String(!entry.isIntersecting)));
    io.observe(el);
    return () => io.disconnect();
  }, [ref]);
}

// 선택 표시는 구슬의 빛(= 경험이 있는지)과 섞이지 않게 따로 보여 준다:
// 구슬 아래 잉크색 막대 + (한 줄 배치에서) 선택 안 된 구슬은 조금 작고 흐리게
function OrbButton({ id, name, count, selected, onSelect, compact, dim, refFn }: {
  id: CompetencyId; name: string; count: number; selected: boolean; onSelect: (id: CompetencyId) => void; compact?: boolean;
  /** 선택 안 된 구슬을 작고 흐리게 (모바일 캐러셀은 자체 크기 변화가 있어 쓰지 않음) */
  dim?: boolean;
  refFn: (el: HTMLButtonElement | null) => void;
}) {
  return (
    <div>
      <button
        ref={refFn}
        type="button"
        role="radio"
        aria-checked={selected}
        aria-label={`${name}, ${count ? `경험 ${count}개` : "경험 없음"}`}
        tabIndex={selected ? 0 : -1}
        onClick={() => onSelect(id)}
        className="orb-button block w-full cursor-pointer rounded-full focus-visible:outline-offset-4"
      >
        <span
          className={`block transition-[transform,opacity] duration-300 ease-out ${
            dim && !selected ? "scale-90 opacity-75 motion-reduce:scale-100" : ""
          }`}
        >
          <GlassOrb competencyId={id} name={name} count={count} selected={selected} compact={compact} />
        </span>
      </button>
      <span
        aria-hidden
        className={`mx-auto mt-3 block h-1 w-8 rounded-full bg-ink transition-[transform,opacity] duration-200 ease-out ${
          selected ? "opacity-100" : "scale-x-0 opacity-0"
        }`}
      />
    </div>
  );
}

export default function OrbGroup({ selected, counts, onSelect }: Props) {
  const rowRefs = useRef<Partial<Record<CompetencyId, HTMLButtonElement | null>>>({});
  const slideRefs = useRef<Partial<Record<CompetencyId, HTMLButtonElement | null>>>({});
  const wrapRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  usePauseOffscreen(wrapRef);

  const onRowKey = useArrowKeys(selected, onSelect, (id) => rowRefs.current[id]?.focus());
  const onSlideKey = useArrowKeys(selected, onSelect, (id) => slideRefs.current[id]?.focus({ preventScroll: true }));

  // ----- 모바일 캐러셀 -----
  const fromScroll = useRef(false);
  const selectedRef = useRef(selected);
  selectedRef.current = selected;

  /** 각 슬라이드의 가운데와의 거리(0~1)를 --d로 넘겨 크기·투명도를 바꾼다 (transform·opacity만) */
  const paint = useCallback(() => {
    const track = trackRef.current;
    if (!track || SCROLL_TIMELINE) return; // CSS가 처리함
    const center = track.scrollLeft + track.clientWidth / 2;
    for (const el of track.children as HTMLCollectionOf<HTMLElement>) {
      const mid = el.offsetLeft + el.offsetWidth / 2;
      const d = Math.min(1, Math.abs(mid - center) / el.offsetWidth);
      el.style.setProperty("--d", d.toFixed(3));
    }
  }, []);

  const nearest = useCallback((): CompetencyId | null => {
    const track = trackRef.current;
    if (!track) return null;
    const center = track.scrollLeft + track.clientWidth / 2;
    let best: CompetencyId | null = null;
    let bestDist = Infinity;
    [...(track.children as HTMLCollectionOf<HTMLElement>)].forEach((el, i) => {
      const dist = Math.abs(el.offsetLeft + el.offsetWidth / 2 - center);
      if (dist < bestDist) [bestDist, best] = [dist, IDS[i]];
    });
    return best;
  }, []);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    let frame = 0;
    let settle: ReturnType<typeof setTimeout>;
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(paint);
      clearTimeout(settle);
      // 스크롤이 멈추면 가운데 구슬을 선택
      settle = setTimeout(() => {
        const id = nearest();
        if (id && id !== selectedRef.current) {
          fromScroll.current = true;
          onSelect(id);
        }
      }, 120);
    };
    paint();
    track.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", paint);
    return () => {
      track.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", paint);
      cancelAnimationFrame(frame);
      clearTimeout(settle);
    };
  }, [paint, nearest, onSelect]);

  // 탭·키보드로 선택이 바뀌면 그 구슬을 가운데로
  useEffect(() => {
    if (fromScroll.current) {
      fromScroll.current = false;
      return;
    }
    const track = trackRef.current;
    const el = slideRefs.current[selected];
    if (!track || !el || track.offsetParent === null) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    // 버튼을 감싼 상자가 아니라 슬라이드 칸 자체를 기준으로 가운데에 맞춘다
    const slide = el.closest<HTMLElement>(".orb-slide");
    if (!slide) return;
    track.scrollTo({ left: slide.offsetLeft - (track.clientWidth - slide.offsetWidth) / 2, behavior: reduce ? "auto" : "smooth" });
  }, [selected]);

  const prevRef = useRef<HTMLButtonElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);
  const step = (dir: 1 | -1) => {
    const i = IDS.indexOf(selected);
    const next = IDS[Math.min(IDS.length - 1, Math.max(0, i + dir))];
    if (next !== selected) onSelect(next);
    // 끝까지 가면 누른 버튼이 꺼져 키보드 위치를 잃으므로 반대쪽 버튼으로 옮긴다
    if (next === IDS[IDS.length - 1]) prevRef.current?.focus({ preventScroll: true });
    else if (next === IDS[0]) nextRef.current?.focus({ preventScroll: true });
  };

  return (
    <div ref={wrapRef}>
      {/* 태블릿 이상: 한 줄 */}
      <div role="radiogroup" aria-label="역량 선택" onKeyDown={onRowKey} className="hidden grid-cols-7 gap-3 md:grid lg:gap-6">
        {COMPETENCIES.map((c) => (
          <OrbButton
            key={c.id}
            id={c.id}
            name={c.name}
            count={counts[c.id]}
            selected={selected === c.id}
            onSelect={onSelect}
            dim
            refFn={(el) => void (rowRefs.current[c.id] = el)}
          />
        ))}
      </div>

      {/* 모바일: 캐러셀 */}
      <div className="relative md:hidden">
        <div
          ref={trackRef}
          role="radiogroup"
          aria-label="역량 선택 (옆으로 넘겨 보세요)"
          onKeyDown={onSlideKey}
          className="orb-track -mx-4 flex overflow-x-auto py-4 [padding-inline:calc(50%-21vw)]"
        >
          {COMPETENCIES.map((c) => (
            <div key={c.id} className="orb-slide w-[42vw] shrink-0 px-[3vw]">
              <OrbButton
                id={c.id}
                name={c.name}
                count={counts[c.id]}
                selected={selected === c.id}
                onSelect={onSelect}
                compact
                refFn={(el) => void (slideRefs.current[c.id] = el)}
              />
            </div>
          ))}
        </div>
        <div className="mt-1 flex items-center justify-center gap-3">
          <button
            ref={prevRef}
            type="button"
            onClick={() => step(-1)}
            disabled={selected === IDS[0]}
            aria-label="이전 역량"
            className="flex size-11 cursor-pointer items-center justify-center rounded-full border border-line text-ink-soft disabled:opacity-30"
          >
            <ChevronLeft className="size-5" aria-hidden />
          </button>
          <span className="text-sm tabular-nums text-ink-faint" aria-hidden>
            {IDS.indexOf(selected) + 1} / {IDS.length}
          </span>
          <button
            ref={nextRef}
            type="button"
            onClick={() => step(1)}
            disabled={selected === IDS[IDS.length - 1]}
            aria-label="다음 역량"
            className="flex size-11 cursor-pointer items-center justify-center rounded-full border border-line text-ink-soft disabled:opacity-30"
          >
            <ChevronRight className="size-5" aria-hidden />
          </button>
        </div>
      </div>
    </div>
  );
}
