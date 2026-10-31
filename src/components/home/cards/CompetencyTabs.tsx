"use client";
// 카드 아래쪽에 떠 있는 역량 탭: 다른 역량으로 바로 이동
import { COMPETENCIES } from "@/lib/domain/competencies";
import type { CompetencyId } from "@/lib/domain/types";
import { COMPETENCY_ICONS } from "./competencyIcons";

export default function CompetencyTabs({ selected, counts, onSelect }: {
  selected: CompetencyId;
  counts: Record<CompetencyId, number>;
  onSelect: (id: CompetencyId) => void;
}) {
  return (
    <nav aria-label="다른 역량으로 이동" className="pointer-events-none sticky bottom-4 z-10 mt-6 flex justify-center">
      <div className="pointer-events-auto max-w-full overflow-x-auto rounded-2xl border border-line bg-surface/90 p-1.5 shadow-[0_12px_32px_-12px_rgb(0_0_0/0.35)] backdrop-blur [scrollbar-width:none]">
        <ul className="flex gap-1">
          {COMPETENCIES.map((c) => {
            const Icon = COMPETENCY_ICONS[c.id];
            const active = c.id === selected;
            return (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => onSelect(c.id)}
                  aria-current={active ? "true" : undefined}
                  className={`flex min-h-11 cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-xl border px-3 text-sm transition-colors duration-150 ${
                    active ? "border-primary-soft-line bg-primary-soft font-semibold text-primary-text" : "border-transparent text-ink-soft hover:text-ink"
                  }`}
                >
                  <Icon className="size-4" aria-hidden />
                  {c.name}
                  {counts[c.id] === 0 && <span className="sr-only">(경험 없음)</span>}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}
