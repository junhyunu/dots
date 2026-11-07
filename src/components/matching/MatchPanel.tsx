"use client";
// 이 경험의 역량 연결: 대표 1개 + 보조 최대 2개. AI가 제안하고 사용자가 확인하거나 바꾼다.
// 원고 다음 단계이고, 여기서 정한 역량으로 다음 단계에서 역량 키워드를 만든다.
import { useRef, type KeyboardEvent } from "react";
import { ArrowRight, RefreshCw } from "lucide-react";
import { generate } from "@/lib/api";
import { COMPETENCIES } from "@/lib/domain/competencies";
import { starBody } from "@/lib/domain/context";
import { normalizeMatches } from "@/lib/domain/matching";
import { MAX_SECONDARY_COMPETENCIES } from "@/lib/domain/stages";
import type { Experience, MatchRole } from "@/lib/domain/types";
import { getStore, useAppStore } from "@/lib/store/useAppStore";
import { runTask, useAutoTask } from "@/lib/store/useTaskRunner";
import AutoTextarea from "@/components/ui/AutoTextarea";
import Button from "@/components/ui/Button";
import TaskState from "@/components/ui/TaskState";
import { confirmAction } from "@/components/ui/ConfirmDialog";

async function draftMatches(id: string) {
  const exp = getStore().experiences[id];
  if (!exp.star) return;
  const r = await generate("match", { basic: exp.basic, star: starBody(exp.star) });
  getStore().setMatches(id, normalizeMatches(r.matches, exp.star.actions.length));
}

const ROLE_OPTIONS: { value: MatchRole | null; label: string }[] = [
  { value: "primary", label: "대표" },
  { value: "secondary", label: "보조" },
  { value: null, label: "연결 안 함" },
];

export default function MatchPanel({ experience, onKeyword }: { experience: Experience; onKeyword: () => void }) {
  const { id, matches, matchesConfirmed } = experience;
  const setMatchRole = useAppStore((s) => s.setMatchRole);
  const updateMatchScene = useAppStore((s) => s.updateMatchScene);
  const confirmMatches = useAppStore((s) => s.confirmMatches);

  const key = `${id}:match`;
  const status = useAutoTask(key, !!experience.star && matches === null, () => draftMatches(id));
  const secondaryCount = matches?.filter((m) => m.role === "secondary").length ?? 0;
  const primary = matches?.find((m) => m.role === "primary");
  const emptyScenes = COMPETENCIES.filter((c) => matches?.some((m) => m.competencyId === c.id && !m.scene.trim()));
  const canConfirm = !!primary && emptyScenes.length === 0;
  // 다음 버튼이 꺼진 이유. 완성 전·후 화면이 같은 문장을 쓴다 (완성한 경험에서도 말없이 꺼지지 않게)
  const blockReason = !matches
    ? null
    : !primary
      ? "대표 역량을 하나 골라 주세요."
      : emptyScenes.length
        ? `장면을 적어 주세요: ${emptyScenes.map((c) => c.name).join(", ")}`
        : null;

  // [다시 제안받기]를 기다리는 동안 버튼이 꺼져 키보드 위치를 잃으므로, 끝나면 그 버튼으로 돌려놓는다
  const redoRef = useRef<HTMLButtonElement>(null);
  const redo = async () => {
    const ok = await confirmAction({ title: "역량 연결을 새로 제안받을까요?", body: "지금 고친 내용은 사라져요.", confirmLabel: "다시 제안받기" });
    if (!ok) return;
    await runTask(key, () => draftMatches(id));
    const now = document.activeElement;
    if (!now || now === document.body) redoRef.current?.focus();
  };

  // 세 칸(Segmented Control) = 라디오 묶음: Tab은 고른 칸 하나만 지나고, 안에서는 화살표·Home/End로 고른다 (홈 구슬과 같은 방식)
  const onRoleKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const radios = Array.from(e.currentTarget.querySelectorAll<HTMLButtonElement>('[role="radio"]:not(:disabled)'));
    const i = radios.indexOf(document.activeElement as HTMLButtonElement);
    if (i < 0) return;
    const n = radios.length;
    const next =
      e.key === "ArrowRight" || e.key === "ArrowDown" ? (i + 1) % n
      : e.key === "ArrowLeft" || e.key === "ArrowUp" ? (i - 1 + n) % n
      : e.key === "Home" ? 0
      : e.key === "End" ? n - 1
      : -1;
    if (next < 0) return;
    e.preventDefault();
    radios[next].focus();
    radios[next].click();
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-lg font-bold sm:text-xl">역량 연결</h2>
          <p className="mt-1 text-sm text-ink-soft">
            이 경험이 가장 잘 보여주는 <b className="font-semibold text-ink">대표 역량 1개</b>와 <b className="font-semibold text-ink">보조 역량 최대 {MAX_SECONDARY_COMPETENCIES}개</b>를 골라 주세요. 연결한 역량마다 홈에 이 경험이 나타나요.
          </p>
        </div>
        {matches && (
          <Button ref={redoRef} variant="secondary" size="sm" loading={status?.state === "loading"} onClick={() => void redo()}>
            {status?.state !== "loading" && <RefreshCw className="size-4" aria-hidden />}
            다시 제안받기
          </Button>
        )}
      </div>

      <TaskState status={status} loadingText="이 경험에 맞는 역량을 고르고 있어요" />

      {matches && (
        <>
          {secondaryCount >= MAX_SECONDARY_COMPETENCIES && (
            <p id="secondary-full" className="rounded-lg bg-subtle px-3 py-2 text-sm text-ink-soft">
              보조 역량 {MAX_SECONDARY_COMPETENCIES}개를 모두 골랐어요. 다른 역량을 보조로 바꾸려면 지금 보조 중 하나를 &lsquo;연결 안 함&rsquo;으로 바꿔 주세요.
            </p>
          )}
          <ul className="space-y-2">
            {COMPETENCIES.map((c) => {
              const m = matches.find((x) => x.competencyId === c.id);
              const role = m?.role ?? null;
              return (
                <li key={c.id} className={`rounded-xl border p-4 transition-colors duration-150 ${m ? "border-line-strong bg-surface" : "border-line bg-subtle"}`}>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                    <div className="min-w-0 flex-1">
                      <p className={`font-semibold ${m ? "" : "text-ink-soft"}`}>{c.name}</p>
                      <p className="text-sm text-ink-faint">{c.description}</p>
                    </div>
                    {/* 몽타주 Segmented Control: 세 칸 같은 너비, 선택 칸 = 흰 손잡이. 둥글기 바깥 12px·안쪽 8px(= 바깥 − 여백 4px, 사용자 결정) */}
                    <div role="radiogroup" aria-label={`${c.name} 연결`} onKeyDown={onRoleKey} className="grid shrink-0 grid-cols-3 rounded-lg bg-ink/[0.06] p-1 sm:w-[17rem]">
                      {ROLE_OPTIONS.map((o) => {
                        const active = role === o.value;
                        const blocked = o.value === "secondary" && role !== "secondary" && secondaryCount >= MAX_SECONDARY_COMPETENCIES;
                        return (
                          <button
                            key={o.label}
                            type="button"
                            role="radio"
                            aria-checked={active}
                            tabIndex={active ? 0 : -1}
                            disabled={blocked}
                            title={blocked ? `보조 역량은 최대 ${MAX_SECONDARY_COMPETENCIES}개예요` : undefined}
                            aria-describedby={blocked ? "secondary-full" : undefined}
                            onClick={() => setMatchRole(id, c.id, o.value)}
                            className={`min-h-10 cursor-pointer whitespace-nowrap rounded-[8px] px-2 text-sm font-semibold transition-colors duration-150 disabled:cursor-not-allowed disabled:text-placeholder ${
                              active ? "bg-surface text-ink shadow-[0_1px_3px_rgb(23_23_23/0.12)]" : "text-ink-faint hover:text-ink"
                            }`}
                          >
                            {o.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  {m && (
                    <div className="mt-3">
                      <label htmlFor={`scene-${c.id}`} className="mb-1 block text-xs font-medium text-ink-faint">
                        이 역량을 보여주는 장면
                      </label>
                      <AutoTextarea
                        id={`scene-${c.id}`}
                        value={m.scene}
                        onChange={(e) => updateMatchScene(id, c.id, e.target.value)}
                        placeholder="장면 한 줄 (예: 지도형 홈 제안에 근거로 설득)"
                        minRows={1}
                        aria-invalid={!m.scene.trim() || undefined}
                        aria-describedby={!m.scene.trim() ? `scene-${c.id}-empty` : undefined}
                      />
                      {/* 빈 칸 바로 아래에 안내 (맨 아래 안내만으로는 어느 칸이 비었는지 찾기 어려워서) */}
                      {!m.scene.trim() && (
                        <p id={`scene-${c.id}-empty`} className="mt-1 text-sm text-danger-text">
                          장면을 적어야 다음으로 넘어갈 수 있어요.
                        </p>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>

          {experience.status === "matching" ? (
            // 좁은 화면에서는 안내를 버튼 위로 올려 둘 다 한 줄로 읽히게 (옆에 두면 둘 다 두 줄로 꺾임)
            <div className="flex flex-col items-end gap-2 pt-2 sm:flex-row sm:items-center sm:justify-end sm:gap-3">
              {blockReason && <p id="match-block-reason" className="text-right text-sm text-ink-soft">{blockReason}</p>}
              <Button className="shrink-0 whitespace-nowrap" disabled={!canConfirm} aria-describedby={blockReason ? "match-block-reason" : undefined} onClick={() => confirmMatches(id)}>
                다음: 역량 키워드
                <ArrowRight className="size-4" aria-hidden />
              </Button>
            </div>
          ) : (
            // 키워드 단계 이후: 여기서 바꾸면 키워드도 맞춰진다 (새로 연결한 역량의 키워드는 키워드 단계에서 만듦)
            <div className="flex flex-col gap-3 rounded-xl bg-subtle p-4 sm:flex-row sm:items-center sm:justify-between">
              {/* 한 문장씩 줄을 나눠 읽기 쉽게 */}
              <p className="text-[15px] text-ink-soft break-keep">
                {matchesConfirmed && <span className="block">완성한 경험이라 여기서 고치면 홈에도 바로 반영돼요.</span>}
                {blockReason ? (
                  <span id="match-block-reason" className="block font-medium text-ink">{blockReason}</span>
                ) : (
                  <span className="block">역량을 바꾸면 키워드도 맞춰서 바뀌어요.</span>
                )}
              </p>
              <Button variant="secondary" size="sm" className="shrink-0 self-end whitespace-nowrap sm:self-auto" disabled={!canConfirm} aria-describedby={blockReason ? "match-block-reason" : undefined} onClick={() => { confirmMatches(id); onKeyword(); }}>
                역량 키워드로
                <ArrowRight className="size-4" aria-hidden />
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
