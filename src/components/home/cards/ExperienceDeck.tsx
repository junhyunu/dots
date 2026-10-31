"use client";
// 선택한 역량에 연결된 경험 목록. 제목 줄(경험명·장면 한 줄·대표/보조)만 보이고, 누르면 그 아래로 결과물 카드가 펼쳐진다.
// 처음엔 모두 접힘, 한 번에 하나만 펼친다. 펼치면 화면이 그 제목 줄로 따라가 상단바 바로 아래에 맞춘다 (목록 순서는 그대로, 사용자 결정).
import { useLayoutEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { competencyName } from "@/lib/domain/competencies";
import { matchFor, type ShowcaseExperience } from "@/lib/domain/showcase";
import type { CompetencyId } from "@/lib/domain/types";
import ExperienceCard from "./ExperienceCard";

function Row({ item, cid, open, onToggle, rowRef }: {
  item: ShowcaseExperience;
  cid: CompetencyId;
  open: boolean;
  onToggle: () => void;
  rowRef: (el: HTMLButtonElement | null) => void;
}) {
  const match = matchFor(item, cid);
  const panelId = `exp-panel-${item.id}`;
  return (
    <li
      // 펼칠 때 화면을 맞출 위치: 홈 상단바(4rem) + 시연 띠(--top-offset) + 여백
      className={`scroll-mt-[calc(var(--top-offset)+5rem)] overflow-hidden rounded-2xl border bg-surface transition-shadow duration-150 ${
        open ? "border-line-strong shadow-[0_24px_60px_-30px_rgb(0_0_0/0.35)] dark:shadow-[0_24px_60px_-30px_rgb(0_0_0/0.9)]" : "border-line"
      }`}
    >
      <h3>
        <button
          ref={rowRef}
          type="button"
          onClick={onToggle}
          aria-expanded={open}
          aria-controls={panelId}
          className={`flex min-h-14 w-full cursor-pointer items-center gap-3 px-4 py-3 text-left transition-colors duration-150 sm:px-5 ${
            open ? "bg-subtle/60" : "hover:bg-subtle/60"
          }`}
        >
          <span className="min-w-0 flex-1">
            <span className="block truncate font-semibold text-ink">{item.basic.title}</span>
            {/* 펼치지 않아도 어떤 장면인지 알 수 있게 */}
            {match?.scene.trim() && <span className="mt-0.5 block truncate text-sm text-ink-soft">{match.scene}</span>}
          </span>
          <span className="flex shrink-0 items-center gap-1.5">
            {item.example && <span className="rounded-md bg-subtle px-1.5 py-0.5 text-xs font-semibold text-ink-soft">예시</span>}
            {match && <span className="text-xs text-ink-faint">{match.role === "primary" ? "대표" : "보조"}</span>}
            <ChevronDown
              className={`size-5 text-ink-faint transition-transform duration-150 ${open ? "rotate-180" : ""}`}
              aria-hidden
            />
          </span>
        </button>
      </h3>
      {open && (
        <div id={panelId} role="region" aria-label={`${item.basic.title} 결과물`} className="card-in border-t border-line">
          <ExperienceCard item={item} competencyId={cid} />
        </div>
      )}
    </li>
  );
}

export default function ExperienceDeck({ items, competencyId }: { items: ShowcaseExperience[]; competencyId: CompetencyId }) {
  const [openId, setOpenId] = useState<string | null>(null);
  const rows = useRef<Record<string, HTMLButtonElement | null>>({});
  // 누른 제목 줄의 화면 위치를 기억했다가, 위쪽 카드가 닫혀 밀려 올라가면 스크롤을 되돌린다
  const anchor = useRef<{ id: string; top: number } | null>(null);

  const toggle = (id: string) => {
    const el = rows.current[id];
    anchor.current = el ? { id, top: el.getBoundingClientRect().top } : null;
    setOpenId((cur) => (cur === id ? null : id));
  };

  useLayoutEffect(() => {
    const a = anchor.current;
    anchor.current = null;
    const el = a && rows.current[a.id];
    if (!a || !el) return;
    // 1) 위쪽 카드가 바로 닫혀 줄이 밀려 올라간 만큼 먼저 되돌려 흔들림을 없애고
    const delta = el.getBoundingClientRect().top - a.top;
    if (Math.abs(delta) > 1) window.scrollBy({ top: delta, behavior: "instant" });
    // 2) 펼쳤으면 그 줄이 상단바 바로 아래에 오도록 부드럽게 따라간다 (닫을 때는 움직이지 않음)
    if (openId === a.id) {
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      el.closest("li")?.scrollIntoView({ block: "start", behavior: reduce ? "auto" : "smooth" });
    }
  }, [openId]);

  return (
    <ul aria-label={`${competencyName(competencyId)}에 연결된 경험 ${items.length}개`} className="space-y-2">
      {items.map((item) => (
        <Row
          key={item.id}
          item={item}
          cid={competencyId}
          open={openId === item.id}
          onToggle={() => toggle(item.id)}
          rowRef={(el) => void (rows.current[item.id] = el)}
        />
      ))}
    </ul>
  );
}
