"use client";
// 카드 아래쪽에 떠 있는 역량 탭: 다른 역량으로 바로 이동.
// 펼친 카드를 가리지 않도록 사용자가 직접 접고 펼 수 있다. 접으면 지금 역량 이름이 든 작은 버튼만 화면 오른쪽 아래 구석에 남는다
// (넓은 화면에서는 콘텐츠 바깥 여백에 놓여 카드를 가리지 않음).
// 접었는지는 브라우저에 기억한다 (새로고침해도 유지).
import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { COMPETENCIES, competencyName } from "@/lib/domain/competencies";
import type { CompetencyId } from "@/lib/domain/types";
import { COMPETENCY_ICONS } from "./competencyIcons";

const KEY = "dots:tabs-collapsed";
const readCollapsed = () => {
  try {
    return localStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
};

export default function CompetencyTabs({ selected, counts, onSelect }: {
  selected: CompetencyId;
  counts: Record<CompetencyId, number>;
  onSelect: (id: CompetencyId) => void;
}) {
  const [collapsed, setCollapsed] = useState(readCollapsed);
  const toggle = (next: boolean) => {
    setCollapsed(next);
    try {
      if (next) localStorage.setItem(KEY, "1");
      else localStorage.removeItem(KEY);
    } catch {
      // 저장소를 못 쓰면 이번 방문 동안만 유지
    }
  };
  const SelectedIcon = COMPETENCY_ICONS[selected];
  const panel = "pointer-events-auto rounded-2xl border border-line bg-surface/90 shadow-[0_12px_32px_-12px_rgb(0_0_0/0.35)] backdrop-blur";

  return (
    <nav
      aria-label="다른 역량으로 이동"
      // 접힌 버튼: 카드 옆에 자리가 있으면 카드 오른쪽 끝 + 14px에 붙인다(카드 오른쪽 끝 = 가운데 + 552px, 사용자 결정).
      // 1292px 이상 = 화살표 + 아이콘만 들어감, 1460px 이상 = 이름까지 들어감. 그보다 좁으면 화면 오른쪽 아래 구석
      className={`pointer-events-none z-10 flex ${
        collapsed
          ? "fixed right-4 bottom-4 sm:right-6 sm:bottom-6 min-[1292px]:right-auto min-[1292px]:left-[calc(50%+566px)]"
          : "sticky bottom-4 mt-6 justify-center"
      }`}
    >
      {collapsed ? (
        <button
          type="button"
          onClick={() => toggle(false)}
          aria-expanded={false}
          aria-label={`역량 탭 펼치기 (지금: ${competencyName(selected)})`}
          title={`역량 탭 펼치기 (지금: ${competencyName(selected)})`}
          className={`${panel} press flex min-h-11 cursor-pointer items-center gap-1.5 rounded-full px-3.5 text-sm font-semibold whitespace-nowrap text-primary-text sm:max-[1291px]:rounded-2xl sm:max-[1291px]:px-4 min-[1460px]:rounded-2xl min-[1460px]:px-4`}
        >
          {/* 작은 화면·카드 옆 자리가 좁을 때: 화살표 + 역량 아이콘만 (사용자 결정) */}
          <ChevronLeft className="size-4 text-ink-faint" aria-hidden />
          <SelectedIcon className="size-5 sm:max-[1291px]:size-4 min-[1460px]:size-4" aria-hidden />
          <span className="hidden sm:max-[1291px]:inline min-[1460px]:inline">{competencyName(selected)}</span>
        </button>
      ) : (
        // overflow-hidden: 모바일에서 옆으로 넘치는 탭 목록이 페이지 너비를 넓혀(화면이 축소되어) 막대가 아래로 밀려 사라지던 문제를 막는다
        <div className={`${panel} flex max-w-full items-center overflow-hidden p-1.5`}>
          <div className="min-w-0 overflow-x-auto [scrollbar-width:none]">
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
          {/* 접기: 스크롤되는 탭 목록 밖에 두어 항상 보이게 */}
          <span aria-hidden className="mx-1 h-6 w-px shrink-0 bg-line" />
          <button
            type="button"
            onClick={() => toggle(true)}
            aria-expanded
            aria-label="역량 탭 접기"
            title="접기"
            className="flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-xl text-ink-faint transition-colors duration-150 hover:bg-subtle hover:text-ink"
          >
            <ChevronRight className="size-4" aria-hidden />
          </button>
        </div>
      )}
    </nav>
  );
}
