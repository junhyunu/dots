"use client";
// 메인 홈: 상단 바 → 타이틀 → 역량 구슬 7개 → 선택한 역량의 경험 결과물 카드 → 역량 탭
import { useCallback, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import { EXAMPLES } from "@/content/examples";
import { COMPETENCIES } from "@/lib/domain/competencies";
import { itemsFor, toShowcase, type ShowcaseExperience } from "@/lib/domain/showcase";
import type { CompetencyId } from "@/lib/domain/types";
import { useAppStore } from "@/lib/store/useAppStore";
import { DotsWordmark } from "@/components/brand/DotsLogo";
import ThemeToggle from "@/components/brand/ThemeToggle";
import OrbGroup from "./orbs/OrbGroup";
import ExperienceDeck from "./cards/ExperienceDeck";
import CompetencyTabs from "./cards/CompetencyTabs";
import EmptyCompetency from "./cards/EmptyCompetency";
import { href } from "@/lib/mode";

function useShowcase() {
  const order = useAppStore((s) => s.experienceOrder);
  const experiences = useAppStore((s) => s.experiences);
  return useMemo(() => {
    const done = order.map((id) => experiences[id]).flatMap((e) => (e ? [toShowcase(e)].filter((x): x is ShowcaseExperience => !!x) : []));
    // 구슬 숫자는 내 경험만 센다 (예시는 반영하지 않음)
    const counts = Object.fromEntries(
      COMPETENCIES.map((c) => [c.id, done.filter((d) => d.matches.some((m) => m.competencyId === c.id)).length]),
    ) as Record<CompetencyId, number>;
    return { done, counts, showExamples: done.length === 0 };
  }, [order, experiences]);
}

export default function HomePage() {
  const { done, counts, showExamples } = useShowcase();
  const [selected, setSelected] = useState<CompetencyId>(() => COMPETENCIES.find((c) => counts[c.id] > 0)?.id ?? COMPETENCIES[0].id);
  // 구슬 선택은 바로 반영하고, 큰 카드 영역은 낮은 우선순위로 다시 그려 넘기기·호버가 끊기지 않게 한다
  const [cardCompetency, setCardCompetency] = useState(selected);
  const [, startTransition] = useTransition();
  const select = useCallback((id: CompetencyId) => {
    setSelected(id);
    startTransition(() => setCardCompetency(id));
  }, []);
  const cardItems = itemsFor(showExamples ? EXAMPLES : done, cardCompetency);

  return (
    <div className="min-h-dvh">
      {/* 상단 바: 로고 + 서비스명 / 테마 전환. 다른 버튼은 두지 않는다 */}
      <header className="sticky top-(--top-offset) z-20 border-b border-line bg-bg/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link href={href("/")} aria-label="Dots 닷츠 홈" className="flex items-center rounded-lg">
            <DotsWordmark />
          </Link>
          <ThemeToggle />
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        {/* 중앙 상단: 타이틀 (ux-writing C안) */}
        <section aria-labelledby="hero-title" className="flex flex-col items-center pb-12 pt-16 text-center sm:pb-16 sm:pt-24">
          <p className="inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1 text-sm text-ink-soft">
            <Sparkles className="size-3.5" aria-hidden />
            자기소개서·면접 경험 정리
          </p>
          <h1 id="hero-title" className="mt-6 text-[40px] font-extrabold leading-[1.15] tracking-[-0.03em] break-keep sm:text-6xl lg:text-7xl">
            점을 이으면,
            <br />
            나의 이야기가 돼요
          </h1>
          <p className="mt-6 max-w-xl text-lg text-ink-soft break-keep sm:text-xl">
            흩어진 경험을 하나씩 정리하면 역량이 채워져요.
            <br />
            비어 있는 역량은 다음에 꺼낼 경험을 알려줘요.
          </p>
          <Link
            href={href("/work?new=1")}
            className="press rainbow-cta mt-9 inline-flex min-h-12 items-center gap-2 rounded-lg px-6 text-[17px] font-semibold"
          >
            경험 정리하기
            <ArrowRight className="size-4" aria-hidden />
          </Link>
        </section>

        {/* 역량 구슬 7개 */}
        <section aria-label="역량" className="pb-10 md:pt-4 md:pb-14">
          <OrbGroup selected={selected} counts={counts} onSelect={select} />
        </section>

        {/* 경험 결과물 카드 */}
        <section aria-label="선택한 역량의 경험 결과물" className="pb-16">
          {showExamples && (
            <p className="mb-4 text-center text-sm text-ink-faint break-keep">
              아직 완성한 경험이 없어 예시를 보여 드려요. 첫 경험을 완성하면 예시는 사라져요.
            </p>
          )}
          {cardItems.length > 0 ? (
            <ExperienceDeck key={cardCompetency} items={cardItems} competencyId={cardCompetency} />
          ) : (
            <EmptyCompetency competencyId={cardCompetency} />
          )}
          <CompetencyTabs selected={selected} counts={counts} onSelect={select} />
        </section>
      </div>
    </div>
  );
}
