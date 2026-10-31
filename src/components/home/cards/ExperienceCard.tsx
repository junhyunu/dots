"use client";
// 경험 결과물 카드 (앞에 나온 카드). 왼쪽: 프로필·버튼·세부 정보 / 오른쪽: Summary + STAR 칸들.
// 선택한 역량의 장면과 관련 행동을 강조한다.
import { useLayoutEffect, useRef, useState } from "react";
import Link from "next/link";
import { BookOpen, Check, ChevronDown, ChevronUp, Copy, Download, Loader2, Flag, Footprints, LayoutGrid, Pencil, PenLine, Sparkles, Target, Trophy } from "lucide-react";
import { competency, competencyName } from "@/lib/domain/competencies";
import { matchFor, summaryKeyword, type ShowcaseExperience } from "@/lib/domain/showcase";
import { copyText, starText } from "@/lib/domain/text";
import type { StarFormat } from "@/lib/export/download";
import type { CompetencyId } from "@/lib/domain/types";
import { href } from "@/lib/mode";

const workHref = (id: string, step?: string) => href(`/work?id=${encodeURIComponent(id)}${step ? `&step=${step}` : ""}`);

function Cell({ title, icon: Icon, children, className = "", emphasis = false, badge }: {
  title: string; icon: typeof Flag; children: React.ReactNode; className?: string; emphasis?: boolean;
  /** 있으면 칸 맨 위에 배지를 두고, 제목은 그 아래로 내린다 (장면 칸: 대표/보조 역량 배지) */
  badge?: React.ReactNode;
}) {
  return (
    <section
      className={`flex flex-col rounded-xl border p-4 ${emphasis ? "border-primary-soft-line bg-primary-soft" : "border-line bg-surface"} ${className}`}
    >
      <header className="mb-3 flex items-center justify-between gap-2 text-sm text-ink-soft">
        {badge ?? <h4 className="font-medium">{title}</h4>}
        <Icon className="size-4 text-ink-faint" aria-hidden />
      </header>
      {badge && <h4 className="mb-1 text-sm font-medium text-ink-soft">{title}</h4>}
      <div className="leading-relaxed text-ink">{children}</div>
    </section>
  );
}

/** 긴 글은 5줄까지만 보여 주고 [더 보기]로 펼친다 — 칸이 길어져 아래 "행동"이 화면 밖으로 밀리지 않게 */
function ClampText({ text }: { text: string }) {
  const ref = useRef<HTMLParagraphElement>(null);
  const [open, setOpen] = useState(false);
  const [overflow, setOverflow] = useState(false);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => setOverflow(el.scrollHeight > el.clientHeight + 1);
    measure();
    const ro = new ResizeObserver(() => !open && measure());
    ro.observe(el);
    return () => ro.disconnect();
  }, [text, open]);
  return (
    <>
      <p ref={ref} className={`text-[15px] ${open ? "" : "line-clamp-5"}`}>{text}</p>
      {(overflow || open) && (
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="press -mx-2 mt-1 inline-flex min-h-11 cursor-pointer items-center gap-0.5 rounded-lg px-2 text-sm font-medium text-ink-soft sm:min-h-8"
        >
          {open ? "접기" : "더 보기"}
          {open ? <ChevronUp className="size-4" aria-hidden /> : <ChevronDown className="size-4" aria-hidden />}
        </button>
      )}
    </>
  );
}

// primary = 파란 바탕, outline = 흰 바탕 + 파란 글자·테두리, 기본 = 회색 테두리
const FORMATS: { format: StarFormat; label: string }[] = [
  { format: "txt", label: "TXT" },
  { format: "docx", label: "Word" },
  { format: "md", label: "MD" },
];

/** STAR 원고를 파일로 내려받기 (브라우저 안에서 만들어 저장, 스토리는 넣지 않음) */
function StarDownload({ item }: { item: ShowcaseExperience }) {
  const [busy, setBusy] = useState<StarFormat | null>(null);
  const [failed, setFailed] = useState(false);
  const run = async (format: StarFormat) => {
    setBusy(format);
    setFailed(false);
    try {
      const { downloadStar } = await import("@/lib/export/download");
      await downloadStar(item, format);
    } catch {
      setFailed(true);
    } finally {
      setBusy(null);
    }
  };
  return (
    <section aria-labelledby={`dl-${item.id}`} className="border-t border-line px-5 py-4 sm:px-6">
      <h4 id={`dl-${item.id}`} className="text-sm text-ink-soft">STAR 원고 내려받기</h4>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {FORMATS.map(({ format, label }) => (
          <button
            key={format}
            type="button"
            onClick={() => run(format)}
            disabled={busy !== null}
            aria-label={`STAR 원고 ${label} 파일로 내려받기`}
            className="press inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-lg border border-line-strong bg-surface px-2.5 text-sm font-semibold disabled:cursor-wait sm:min-h-9"
          >
            {busy === format ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Download className="size-4" aria-hidden />}
            {label}
          </button>
        ))}
      </div>
      {failed && (
        <p role="alert" className="mt-2 text-sm text-danger">
          파일을 만들지 못했어요. 다시 눌러 주세요.
        </p>
      )}
    </section>
  );
}

function LinkButton({ href, icon: Icon, children, primary = false, outline = false }: { href: string; icon: typeof Flag; children: React.ReactNode; primary?: boolean; outline?: boolean }) {
  return (
    <Link
      href={href}
      className={`inline-flex min-h-11 items-center gap-1.5 whitespace-nowrap press rounded-lg px-2.5 text-[15px] font-semibold sm:min-h-10 ${
        primary ? "bg-primary-fill text-on-primary" : outline ? "border border-primary bg-surface text-primary-text" : "border border-line-strong bg-surface"
      }`}
    >
      <Icon className="size-4" aria-hidden />
      {children}
    </Link>
  );
}

export default function ExperienceCard({ item, competencyId }: { item: ShowcaseExperience; competencyId: CompetencyId }) {
  const [copied, setCopied] = useState(false);
  const match = matchFor(item, competencyId);
  const summary = summaryKeyword(item, competencyId);
  const primary = item.matches.find((m) => m.role === "primary");
  const secondaries = item.matches.filter((m) => m.role === "secondary");
  const highlighted = new Set(match?.actionRefs ?? []);

  const copy = async () => {
    if (await copyText(starText(item.basic.title, item.star))) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="card-in grid md:grid-cols-[300px_1fr] lg:grid-cols-[330px_1fr]">
      {/* 왼쪽 프로필 영역 */}
      <aside className="border-b border-line md:border-r md:border-b-0">
        <div className="p-5 sm:p-6">
          <h3 className="text-xl font-bold leading-snug break-keep">{item.basic.title}</h3>
          <p className="mt-1 text-sm text-ink-soft break-keep">{[item.basic.period, item.basic.role].filter(Boolean).join(" · ")}</p>

          <div className="mt-5 flex flex-wrap gap-1.5">
            {item.example ? (
              <LinkButton href={href("/work?new=1")} icon={PenLine} primary>
                내 경험 정리하기
              </LinkButton>
            ) : (
              <LinkButton href={workHref(item.id, "story")} icon={PenLine} outline>
                {item.hasStory ? "스토리 보기" : "스토리로 완성하기"}
              </LinkButton>
            )}
            <button
              type="button"
              onClick={copy}
              className="press inline-flex min-h-11 cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-lg border border-line-strong bg-surface px-2.5 text-[15px] font-semibold sm:min-h-10"
            >
              {copied ? <Check className="size-4 text-ok" aria-hidden /> : <Copy className="size-4" aria-hidden />}
              {copied ? "복사했어요" : "복사"}
            </button>
            {!item.example && (
              <LinkButton href={workHref(item.id, "star")} icon={Pencil}>
                수정
              </LinkButton>
            )}
          </div>
        </div>

        <details open className="group border-t border-line px-5 py-4 sm:px-6">
          <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-1.5 text-sm text-ink-soft sm:min-h-9 [&::-webkit-details-marker]:hidden">
            세부 정보
            {/* 닫힘 = 아래, 열림 = 위 */}
            <ChevronDown className="size-4 transition-transform duration-150 group-open:rotate-180" aria-hidden />
          </summary>
          <dl className="mt-2 grid grid-cols-[84px_1fr] gap-x-3 gap-y-2.5 text-[15px]">
            <dt className="text-ink-faint">경험명</dt>
            <dd className="break-keep">{item.basic.title}</dd>
            <dt className="text-ink-faint">시기</dt>
            <dd>{item.basic.period || "—"}</dd>
            <dt className="text-ink-faint">역할</dt>
            <dd className="break-keep">{item.basic.role || "—"}</dd>
            <dt className="text-ink-faint">대표 역량</dt>
            <dd>{primary ? <span className="rounded-md border border-line-strong px-2 py-0.5 text-sm">{competencyName(primary.competencyId)}</span> : "—"}</dd>
            <dt className="text-ink-faint">보조 역량</dt>
            <dd className="flex flex-wrap gap-1.5">
              {secondaries.length
                ? secondaries.map((m) => (
                    <span key={m.competencyId} className="rounded-md bg-subtle px-2 py-0.5 text-sm">
                      {competencyName(m.competencyId)}
                    </span>
                  ))
                : "—"}
            </dd>
          </dl>
        </details>
        {!item.example && <StarDownload item={item} />}
      </aside>

      {/* 오른쪽: 한눈에 보기 */}
      <div className="p-4 sm:p-6">
        <h3 className="mb-3 flex items-center gap-2 font-semibold">
          <LayoutGrid className="size-4 text-ink-faint" aria-hidden />
          한눈에 보기
        </h3>
        <div className="grid gap-3 lg:grid-cols-3">
          <Cell title="Summary" icon={Sparkles} className="lg:col-span-2">
            {summary ? (
              <>
                <p className="text-sm font-semibold text-ink-soft">{summary.keyword}</p>
                <p className="mt-1 text-[17px] font-medium">{summary.sentence}</p>
              </>
            ) : (
              <p className="text-ink-faint">역량 키워드가 아직 없어요.</p>
            )}
          </Cell>
          <Cell
            title={`${competency(competencyId).name} 장면`}
            icon={Target}
            emphasis
            badge={
              match && (
                <span className="inline-block rounded-md bg-primary-fill px-1.5 py-0.5 text-xs font-semibold text-on-primary">
                  {match.role === "primary" ? "대표 역량" : "보조 역량"}
                </span>
              )
            }
          >
            {match && <p className="font-medium break-keep">{match.scene}</p>}
          </Cell>
        </div>

        {/* STAR 순서대로: 상황 · 목표 → 행동 → 결과 → 배운 점 */}
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <Cell title="상황" icon={Flag}>
            <ClampText text={item.star.situation} />
          </Cell>
          <Cell title="목표" icon={Target}>
            <ClampText text={item.star.task} />
          </Cell>
        </div>

        <h3 className="mt-6 mb-3 flex items-center gap-2 font-semibold">
          <Footprints className="size-4 text-ink-faint" aria-hidden />
          행동
        </h3>
        <ol className="divide-y divide-line overflow-hidden rounded-xl border border-line">
          {item.star.actions.map((a, i) => {
            const on = highlighted.has(i);
            return (
              <li key={i} className={`flex gap-3 p-4 ${on ? "bg-primary-soft" : ""}`}>
                <span
                  className={`mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold tabular-nums ${
                    on ? "bg-primary-fill text-on-primary" : "border border-line-strong text-ink-faint"
                  }`}
                  aria-hidden
                >
                  {i + 1}
                </span>
                <div className="min-w-0">
                  <p className="font-semibold">
                    {a.label}
                    {on && <span className="ml-2 align-middle text-xs font-medium text-ink-soft">· {competency(competencyId).name}</span>}
                  </p>
                  <p className="mt-0.5 text-[15px] leading-relaxed text-ink-soft">{a.body}</p>
                </div>
              </li>
            );
          })}
        </ol>

        <h3 className="mt-6 mb-3 flex items-center gap-2 font-semibold">
          <Trophy className="size-4 text-ink-faint" aria-hidden />
          결과
        </h3>
        <p className="rounded-xl border border-line p-4 text-[15px] leading-relaxed">{item.star.result}</p>

        <h3 className="mt-6 mb-3 flex items-center gap-2 font-semibold">
          <BookOpen className="size-4 text-ink-faint" aria-hidden />
          배운 점
        </h3>
        <p className="rounded-xl border border-line p-4 text-[15px] leading-relaxed">{item.star.learning}</p>
      </div>
    </div>
  );
}
