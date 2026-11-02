"use client";
// 내 역량 한눈에 보기: 역량 7개마다 연결된 경험을 카드로 모아 본다 (대표 먼저, 그다음 보조).
// 위쪽 바로가기로 역량을 오가고, 경험이 없는 역량은 "빈틈"과 떠올리기 질문을 보여 준다.
// 경험이 많아져도 가로로 넓어지지 않게 표 대신 목록으로 만든다 (사용자 결정).
import { ChevronDown, Plus } from "lucide-react";
import { COMPETENCIES, type Competency } from "@/lib/domain/competencies";
import { linkedMatch } from "@/lib/domain/matching";
import type { CompetencyMatch, Experience } from "@/lib/domain/types";
import { useAppStore } from "@/lib/store/useAppStore";
import Button from "@/components/ui/Button";

interface Row {
  exp: Experience;
  match: CompetencyMatch;
}

const sectionId = (cid: string) => `cm-${cid}`;

function rowsFor(exps: Experience[], c: Competency): Row[] {
  const rows = exps.flatMap((exp) => {
    const match = linkedMatch(exp, c.id);
    return match ? [{ exp, match }] : [];
  });
  return [...rows.filter((r) => r.match.role === "primary"), ...rows.filter((r) => r.match.role === "secondary")];
}

function ExperienceTile({ row, onOpen }: { row: Row; onOpen: () => void }) {
  const primary = row.match.role === "primary";
  return (
    <li>
      <button
        type="button"
        onClick={onOpen}
        className="press flex h-full w-full cursor-pointer flex-col items-start gap-1.5 rounded-xl border border-line bg-surface p-4 text-left"
      >
        <span
          className={`rounded-md border px-1.5 py-0.5 text-xs font-semibold ${primary ? "border-line-strong bg-surface text-primary-text" : "border-transparent bg-subtle text-ink-soft"}`}
        >
          {primary ? "대표" : "보조"}
        </span>
        <span className="font-semibold leading-snug break-keep">{row.exp.basic.title}</span>
        <span className="text-[15px] leading-relaxed break-keep text-ink-soft">{row.match.scene.trim() || "장면이 아직 없어요"}</span>
      </button>
    </li>
  );
}

export default function CompetencyMatrix() {
  const order = useAppStore((s) => s.experienceOrder);
  const all = useAppStore((s) => s.experiences);
  const setView = useAppStore((s) => s.setView);
  const exps = order.map((id) => all[id]).filter((e): e is Experience => !!e && e.matchesConfirmed);
  const groups = COMPETENCIES.map((c) => ({ c, rows: rowsFor(exps, c) }));

  const jump = (cid: string) => {
    const el = document.getElementById(sectionId(cid)) as HTMLDetailsElement | null;
    if (!el) return;
    el.open = true;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
    el.querySelector("summary")?.focus({ preventScroll: true });
  };

  const header = (
    <div>
      <h1 className="text-xl font-bold tracking-tight sm:text-2xl">내 역량 한눈에 보기</h1>
      <p className="mt-1 text-ink-soft">
        면접·자기소개서에서 역량을 물으면 꺼낼 장면이 여기 있어요.
        <br />
        비어 있는 역량은 다음에 채울 차례예요.
      </p>
    </div>
  );

  if (exps.length === 0) {
    return (
      <div className="space-y-6">
        {header}
        <div className="rounded-2xl border border-dashed border-line-strong bg-surface p-8 text-center">
          <p className="text-ink-soft">아직 완성한 경험이 없어요. 경험을 정리하고 마지막 ‘역량 키워드’ 단계에서 완성해 주세요.</p>
          <Button className="mt-4" onClick={() => setView("new")}>
            <Plus className="size-4" aria-hidden />새 경험 정리하기
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {header}

      {/* 역량 바로가기: 경험 수와 빈틈을 한눈에 */}
      <nav aria-label="역량 바로가기">
        <ul className="flex flex-wrap gap-1.5">
          {groups.map(({ c, rows }) => (
            <li key={c.id}>
              <button
                type="button"
                onClick={() => jump(c.id)}
                className={`press inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-full border px-3 text-sm sm:min-h-9 ${
                  rows.length ? "border-line-strong bg-surface font-medium" : "border-dashed border-primary-soft-line bg-primary-soft text-primary-text"
                }`}
              >
                {c.name}
                <span className={`tabular-nums ${rows.length ? "text-ink-faint" : "font-semibold"}`}>{rows.length ? rows.length : "빈틈"}</span>
              </button>
            </li>
          ))}
        </ul>
      </nav>

      <div className="space-y-3">
        {groups.map(({ c, rows }) => {
          const primaries = rows.filter((r) => r.match.role === "primary").length;
          return (
            // 처음엔 모두 접힘(다 열려 있으면 역량끼리 구분이 안 됨, 사용자 결정). 여러 칸을 함께 열 수 있고, 열린 칸은 테두리를 진하게 해 역량 경계를 보여 준다
            <details key={c.id} id={sectionId(c.id)} className="group scroll-mt-[calc(var(--top-offset)+5rem)] rounded-2xl border border-line bg-subtle open:border-ink-faint/40 lg:scroll-mt-[calc(var(--top-offset)+2rem)]">
              <summary className="flex min-h-14 cursor-pointer list-none items-start gap-3 rounded-2xl px-4 py-3 sm:px-5 [&::-webkit-details-marker]:hidden">
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-baseline gap-x-2">
                    <span className="text-lg font-bold">{c.name}</span>
                    {rows.length ? (
                      <span className="text-sm text-ink-faint tabular-nums">
                        경험 {rows.length}개 · 대표 {primaries} · 보조 {rows.length - primaries}
                      </span>
                    ) : (
                      <span className="rounded-md bg-primary-soft px-1.5 py-0.5 text-xs font-semibold text-primary-text">빈틈</span>
                    )}
                  </span>
                  <span className="mt-0.5 block text-sm text-ink-faint">{c.description}</span>
                </span>
                <ChevronDown className="mt-1.5 size-4 shrink-0 text-ink-faint transition-transform duration-150 group-open:rotate-180" aria-hidden />
              </summary>
              <div className="px-4 pb-4 sm:px-5 sm:pb-5">
                {rows.length === 0 ? (
                  <div className="flex flex-col gap-3 rounded-xl border border-dashed border-line-strong bg-surface p-4 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-[15px] break-keep text-ink-soft">{c.hint} 떠오르는 장면 하나면 충분해요.</p>
                    <Button variant="secondary" size="sm" onClick={() => setView("new")}>
                      <Plus className="size-4" aria-hidden />
                      경험 정리하기
                    </Button>
                  </div>
                ) : (
                  <ul className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                    {rows.map((row) => (
                      <ExperienceTile key={row.exp.id} row={row} onOpen={() => setView("experience", row.exp.id)} />
                    ))}
                  </ul>
                )}
              </div>
            </details>
          );
        })}
      </div>
    </div>
  );
}
