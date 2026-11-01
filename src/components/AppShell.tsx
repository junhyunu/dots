"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FileText, LayoutGrid, Menu, Plus, Search, X } from "lucide-react";
import { useActiveExperience, useAppStore, type View } from "@/lib/store/useAppStore";
import { DotsWordmark } from "./brand/DotsLogo";
import ThemeToggle from "./brand/ThemeToggle";
import NewExperienceForm from "./experience/NewExperienceForm";
import ExperienceWorkspace, { type Step } from "./experience/ExperienceWorkspace";
import CompetencyMatrix from "./matching/CompetencyMatrix";
import { href } from "@/lib/mode";
import { highlightRange, matchExperience, snippetAround, type SearchHit } from "@/lib/domain/search";
import type { Experience } from "@/lib/domain/types";

const STATUS_LABEL = { interviewing: "질문 중", drafting: "원고", keyword: "키워드", matching: "역량 연결", done: "완료" };
const STEPS: Step[] = ["interview", "star", "keyword", "match", "story"];
/** 경험이 이만큼 이상일 때만 검색칸을 보여 준다 */
const SEARCH_MIN = 5;

function Highlighted({ text, query }: { text: string; query: string }) {
  const r = highlightRange(text, query);
  if (!r) return <>{text}</>;
  return (
    <>
      {text.slice(0, r[0])}
      <mark className="rounded-sm bg-primary-soft font-semibold text-primary-text">{text.slice(r[0], r[1])}</mark>
      {text.slice(r[1])}
    </>
  );
}

function ExperienceItem({ exp, hit, query, active, onClick }: { exp: Experience; hit: SearchHit; query: string; active: boolean; onClick: () => void }) {
  const working = exp.status !== "done";
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        aria-current={active ? "page" : undefined}
        className={`flex min-h-11 w-full cursor-pointer items-start gap-2 rounded-lg px-3 py-2 text-left transition-colors duration-150 ${
          active ? "bg-primary-soft text-primary-text" : "hover:bg-subtle"
        }`}
      >
        <FileText className="mt-1 size-4 shrink-0" aria-hidden />
        <span className="min-w-0 flex-1">
          {/* 비슷한 이름도 구분되게 두 줄까지 */}
          <span className="line-clamp-2 text-[15px] leading-snug break-keep">
            <Highlighted text={exp.basic.title} query={query} />
          </span>
          {hit.field && (
            <span className="mt-0.5 block truncate text-xs text-ink-faint">
              {hit.field} · <Highlighted text={snippetAround(hit.text, query)} query={query} />
            </span>
          )}
        </span>
        {/* 완료는 표시하지 않고, 작업 중일 때만 어느 단계인지 보여 준다 */}
        {working && <span className="mt-0.5 shrink-0 rounded-md bg-subtle px-1.5 py-0.5 text-xs font-medium text-ink-soft">{STATUS_LABEL[exp.status]}</span>}
      </button>
    </li>
  );
}

/** 홈에서 넘어온 주소(?new=1, ?id=...&step=...)를 읽어 화면을 맞춘다.
 *  링크로 넘어올 때는 화면이 먼저 그려진 뒤 주소가 바뀌므로 window.location 대신 useSearchParams를 쓴다. */
function useUrlIntent(): Step | undefined {
  const params = useSearchParams();
  const router = useRouter();
  const setView = useAppStore((s) => s.setView);
  const readStep = (q: URLSearchParams) => {
    const s = q.get("step") as Step | null;
    return s && STEPS.includes(s) ? s : undefined;
  };
  const [step, setStep] = useState<Step | undefined>(() => readStep(params));
  // 주소가 바뀔 때마다 읽는다: 이미 작업 화면에 있을 때 [새 경험 시연] 같은 링크로 ?new=1이 붙어도 반영되게
  const query = params.toString();
  useEffect(() => {
    if (!query) return;
    const q = new URLSearchParams(query);
    setStep(readStep(q));
    if (q.get("new")) setView("new");
    else {
      const id = q.get("id");
      if (id && useAppStore.getState().experiences[id]) setView("experience", id);
    }
    // 읽은 주소는 정리한다 (새로고침 시 다시 적용되지 않게)
    router.replace(href("/work"), { scroll: false });
  }, [query, setView, router]);
  return step;
}

function Sidebar({ onNavigate }: { onNavigate: () => void }) {
  const order = useAppStore((s) => s.experienceOrder);
  const experiences = useAppStore((s) => s.experiences);
  const view = useAppStore((s) => s.view);
  const activeId = useAppStore((s) => s.activeExperienceId);
  const setView = useAppStore((s) => s.setView);

  const go = (v: View, id?: string) => {
    setView(v, id);
    onNavigate();
  };

  // 검색어는 저장하지 않는다 (새로고침하면 비워짐)
  const [query, setQuery] = useState("");
  const all = order.map((id) => experiences[id]).filter((e): e is Experience => !!e);
  const hits = all.flatMap((exp) => {
    const hit = matchExperience(exp, query);
    return hit ? [{ exp, hit }] : [];
  });
  const working = all.filter((e) => e.status !== "done").length;

  return (
    <nav aria-label="경험 목록" className="flex h-full flex-col gap-6 p-4">
      <button
        type="button"
        onClick={() => go("new")}
        // 새 경험 화면에 있을 때 = 잉크색 글자 테두리 버튼(현재 페이지), 다른 화면 = 파란 글자 테두리 버튼 (사용자 결정)
        aria-current={view === "new" ? "page" : undefined}
        className={`flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border px-3 font-medium transition-colors duration-150 ${
          view === "new" ? "border-line-strong bg-surface font-semibold text-ink" : "border-line-strong bg-surface font-semibold text-primary-text hover:bg-subtle"
        }`}
      >
        <Plus className="size-4" aria-hidden />새 경험 정리하기
      </button>

      <div className="flex min-h-0 flex-1 flex-col">
        <p className="mb-2 flex items-center justify-between px-1 text-xs font-semibold text-ink-faint">
          경험
          {all.length > 0 && <span className="tabular-nums">{all.length}</span>}
        </p>
        {all.length >= SEARCH_MIN && (
          <div className="relative mb-2">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-faint" aria-hidden />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                // Esc: 검색어부터 지운다 (비어 있으면 서랍 닫기로 넘어감)
                if (e.key === "Escape" && query) {
                  e.stopPropagation();
                  setQuery("");
                }
              }}
              aria-label="경험 검색"
              aria-describedby="exp-search-hint"
              placeholder="경험 검색"
              className="block min-h-11 w-full rounded-lg border border-line-strong bg-surface pr-10 pl-9 text-[15px] placeholder:text-placeholder focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none sm:min-h-10 [&::-webkit-search-cancel-button]:hidden"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                aria-label="검색어 지우기"
                className="absolute top-1/2 right-0.5 flex size-10 -translate-y-1/2 cursor-pointer items-center justify-center rounded-lg text-ink-faint hover:text-ink"
              >
                <X className="size-4" aria-hidden />
              </button>
            )}
          </div>
        )}
        <p id="exp-search-hint" className="sr-only">경험명, 시기, 역할, 연결 역량, 역량 키워드에서 찾아요</p>
        <p aria-live="polite" className="sr-only">
          {query ? `${hits.length}개 찾음` : ""}
        </p>
        <div className="min-h-0 flex-1 overflow-y-auto">
          {all.length === 0 ? (
            <p className="px-1 text-sm text-ink-faint">아직 정리한 경험이 없어요.</p>
          ) : hits.length === 0 ? (
            <p className="px-1 py-2 text-sm break-keep text-ink-faint">&lsquo;{query.trim()}&rsquo;와 맞는 경험이 없어요.</p>
          ) : (
            <>
              {/* 작업 중인 경험을 위에 모은다 */}
              {[
                { label: "작업 중", list: hits.filter((h) => h.exp.status !== "done") },
                { label: "완료", list: hits.filter((h) => h.exp.status === "done") },
              ].map(
                (g) =>
                  g.list.length > 0 && (
                    <section key={g.label} aria-label={g.label} className="mb-3">
                      {working > 0 && <p className="mb-1 px-1 text-xs text-ink-faint">{g.label}</p>}
                      <ul className="space-y-0.5">
                        {g.list.map(({ exp, hit }) => (
                          <ExperienceItem
                            key={exp.id}
                            exp={exp}
                            hit={hit}
                            query={query}
                            active={view === "experience" && activeId === exp.id}
                            onClick={() => go("experience", exp.id)}
                          />
                        ))}
                      </ul>
                    </section>
                  ),
              )}
            </>
          )}
        </div>
      </div>

      <button
        type="button"
        onClick={() => go("matrix")}
        aria-current={view === "matrix" ? "page" : undefined}
        className={`flex min-h-11 cursor-pointer items-center gap-2 rounded-lg px-3 transition-colors duration-150 ${
          view === "matrix" ? "bg-primary-soft text-primary-text" : "hover:bg-subtle"
        }`}
      >
        <LayoutGrid className="size-4" aria-hidden />
        전체 역량 연결 목록
      </button>
    </nav>
  );
}

export default function AppShell() {
  const initialStep = useUrlIntent();
  const view = useAppStore((s) => s.view);
  const experience = useActiveExperience();
  const [drawerOpen, setDrawerOpen] = useState(false);
  // 메뉴 아이콘의 파란 점: 지금 보고 있는 경험 말고 작업 중인 경험이 더 있을 때만 (사용자 결정 A)
  const viewingId = view === "experience" ? experience?.id : undefined;
  const waiting = useAppStore((s) => Object.values(s.experiences).filter((e) => e.status !== "done" && e.id !== viewingId).length);

  useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setDrawerOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [drawerOpen]);

  // 선택된 경험이 지워졌으면 새 경험 화면으로
  const content =
    view === "matrix" ? <CompetencyMatrix /> : view === "experience" && experience ? <ExperienceWorkspace key={experience.id} experience={experience} initialStep={initialStep} /> : <NewExperienceForm />;

  return (
    <div className="flex min-h-dvh">
      {/* 데스크톱 사이드바 */}
      <aside className="sticky top-(--top-offset) hidden h-[calc(100dvh-var(--top-offset))] w-64 shrink-0 flex-col border-r border-line bg-bg lg:flex">
        <div className="flex items-center justify-between pl-5 pr-3 pt-3">
          <Link href={href("/")} aria-label="Dots 닷츠 홈으로" className="flex items-center rounded-lg">
            <DotsWordmark />
          </Link>
          <ThemeToggle />
        </div>
        <div className="min-h-0 flex-1">
          <Sidebar onNavigate={() => {}} />
        </div>
      </aside>

      {/* 모바일 상단 바 + 서랍 */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-(--top-offset) z-20 flex h-14 items-center gap-2 border-b border-line bg-bg/95 px-2 backdrop-blur lg:hidden">
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            aria-label={waiting ? `메뉴 열기, 작업 중인 경험 ${waiting}개` : "메뉴 열기"}
            className="relative flex size-11 cursor-pointer items-center justify-center rounded-lg hover:bg-subtle"
          >
            <Menu className="size-6" aria-hidden />
            {waiting > 0 && <span aria-hidden className="absolute top-2 right-2 size-2 rounded-full bg-primary ring-2 ring-bg" />}
          </button>
          <Link href={href("/")} aria-label="Dots 닷츠 홈으로" className="flex flex-1 items-center rounded-lg">
            <DotsWordmark />
          </Link>
          <ThemeToggle large />
        </header>

        {drawerOpen && (
          <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="메뉴">
            <div className="absolute inset-0 bg-ink/30" onClick={() => setDrawerOpen(false)} />
            <div className="absolute inset-y-0 left-0 w-72 max-w-[85vw] bg-bg shadow-xl">
              <div className="flex h-14 items-center justify-between px-4">
                <Link href={href("/")} aria-label="Dots 닷츠 홈으로" className="flex items-center rounded-lg">
                  <DotsWordmark />
                </Link>
                <button
                  type="button"
                  onClick={() => setDrawerOpen(false)}
                  aria-label="메뉴 닫기"
                  className="flex size-11 cursor-pointer items-center justify-center rounded-lg hover:bg-subtle"
                >
                  <X className="size-5" aria-hidden />
                </button>
              </div>
              <div className="h-[calc(100dvh-56px)]">
                <Sidebar onNavigate={() => setDrawerOpen(false)} />
              </div>
            </div>
          </div>
        )}

        <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6 sm:px-6 lg:py-10">{content}</main>
      </div>
    </div>
  );
}
