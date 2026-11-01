// UT 진행 상태: 닉네임·사전/사후 응답·시간 기록. 실제 데이터와 따로 localStorage("dots:ut")에 둔다.
// 새로고침하거나 창을 닫았다 와도 이어서 진행된다. 경험 내용은 여기 두지 않는다(그건 dots:ut-state).
import { useSyncExternalStore } from "react";
import type { Experience } from "@/lib/domain/types";

const KEY = "dots:ut";
const CHANGE = "dots:ut-change";

/** 단계별 시간을 재는 칸 (작업 화면 순서) */
export const STAGES = [
  ["input", "경험 입력"],
  ["situation", "상황"],
  ["goal", "목표"],
  ["action", "행동"],
  ["result", "결과"],
  ["learning", "배운 점"],
  ["final_check", "전체 점검"],
  ["star", "STAR 원고"],
  ["match", "역량 연결"],
  ["keyword", "역량 키워드"],
] as const;
export type StageKey = (typeof STAGES)[number][0] | "done";
export const stageLabel = (k: StageKey) => STAGES.find(([key]) => key === k)?.[1] ?? "완료";

export type UtStep = "intro" | "pre" | "work" | "post" | "done";

export interface UtState {
  step: UtStep;
  nickname: string;
  pre: { situation: string; situationOther: string; prevTime: string; likert: (number | null)[] };
  post: {
    device: string;
    likert: (number | null)[];
    extra: (number | null)[];
    stuck: string;
    error: "" | "없었다" | "있었다";
    errorText: string;
    stuckMoment: string;
    compare: string;
  };
  startedAt: string | null;
  endedAt: string | null;
  experienceId: string | null;
  stage: StageKey;
  stageSince: number | null;
  stageMs: Partial<Record<StageKey, number>>;
  outcome: "" | "완료" | "중단";
  stoppedAt: string;
  followups: Record<string, number>;
  aiFailures: number;
  submittedAt: string | null;
}

const initial = (): UtState => ({
  step: "intro",
  nickname: "",
  pre: { situation: "", situationOther: "", prevTime: "", likert: [null, null, null, null, null] },
  post: { device: "", likert: [null, null, null, null, null], extra: [null, null], stuck: "", error: "", errorText: "", stuckMoment: "", compare: "" },
  startedAt: null,
  endedAt: null,
  experienceId: null,
  stage: "input",
  stageSince: null,
  stageMs: {},
  outcome: "",
  stoppedAt: "",
  followups: {},
  aiFailures: 0,
  submittedAt: null,
});

let cache: UtState | null = null;
let raw: string | null = null;

export function readUt(): UtState {
  let now: string | null = null;
  try {
    now = localStorage.getItem(KEY);
  } catch {
    // 저장소를 못 쓰면 메모리로만
  }
  if (cache && now === raw) return cache;
  raw = now;
  try {
    cache = now ? { ...initial(), ...JSON.parse(now) } : initial();
  } catch {
    cache = initial();
  }
  return cache!;
}

export function writeUt(update: (s: UtState) => UtState) {
  const next = update(structuredClone(readUt()));
  cache = next;
  raw = JSON.stringify(next);
  try {
    localStorage.setItem(KEY, raw);
  } catch {
    // 저장 실패 시 이번 방문 동안만 유지
  }
  window.dispatchEvent(new Event(CHANGE));
}

export function useUt(): UtState {
  return useSyncExternalStore(
    (cb) => {
      window.addEventListener(CHANGE, cb);
      window.addEventListener("storage", cb);
      return () => {
        window.removeEventListener(CHANGE, cb);
        window.removeEventListener("storage", cb);
      };
    },
    readUt,
    readUt,
  );
}

/** 지금 경험이 어느 단계인지 (경험이 없으면 입력 중) */
export function stageOf(exp: Experience | undefined): StageKey {
  if (!exp) return "input";
  if (exp.status === "interviewing") {
    const c = exp.interview.currentStage;
    return c === "complete" ? "star" : c;
  }
  if (exp.status === "drafting") return "star";
  if (exp.status === "matching") return "match";
  if (exp.status === "keyword") return "keyword";
  return "done";
}

/** 지금 단계에 머문 시간을 더하고 다음 단계로 */
export function moveStage(s: UtState, next: StageKey, at = Date.now()): UtState {
  if (s.stage !== next || s.stageSince === null) {
    if (s.stageSince !== null) s.stageMs[s.stage] = (s.stageMs[s.stage] ?? 0) + Math.max(0, at - s.stageSince);
    s.stage = next;
    s.stageSince = at;
  }
  return s;
}

/** 단계별 추가 질문 횟수 */
export function countFollowups(exp: Experience | undefined): Record<string, number> {
  if (!exp) return {};
  return Object.fromEntries(Object.entries(exp.interview.stages).map(([k, log]) => [k, log.rounds.filter((r) => r.kind === "followup").length]));
}

/** 한국 시각 "2026-11-01 14:03:05" */
export const kst = (iso: string | null) => (iso ? new Date(iso).toLocaleString("sv-SE", { timeZone: "Asia/Seoul" }) : "");
const minutes = (ms: number | undefined) => (ms ? Math.round((ms / 60000) * 10) / 10 : 0);

/** 시트 한 줄. 경험 내용(답변·원고)은 넣지 않는다 */
export function sheetRow(s: UtState): Record<string, string | number> {
  const total = s.startedAt && s.endedAt ? new Date(s.endedAt).getTime() - new Date(s.startedAt).getTime() : 0;
  const row: Record<string, string | number> = {
    제출시각: kst(s.submittedAt ?? new Date().toISOString()),
    닉네임: s.nickname,
    상황: s.pre.situation === "기타" ? `기타: ${s.pre.situationOther}` : s.pre.situation,
    기존_정리시간: s.pre.prevTime,
  };
  s.pre.likert.forEach((v, i) => (row[`사전${i + 1}`] = v ?? ""));
  row.사용기기 = s.post.device;
  s.post.likert.forEach((v, i) => (row[`사후${i + 1}`] = v ?? ""));
  row.추가1_지어내지않음 = s.post.extra[0] ?? "";
  row.추가2_쓸만함 = s.post.extra[1] ?? "";
  row.가장_막힌_단계 = s.post.stuck;
  row.오류 = s.post.error;
  row.오류_문구 = s.post.errorText;
  row.가장_막힌_순간 = s.post.stuckMoment;
  row.기존방식_비교 = s.post.compare;
  row.시작시각 = kst(s.startedAt);
  row.종료시각 = kst(s.endedAt);
  row.총소요_분 = minutes(total);
  row.완료여부 = s.outcome;
  row.멈춘_단계 = s.stoppedAt;
  for (const [k, label] of STAGES) row[`시간_${label}_분`] = minutes(s.stageMs[k]);
  for (const [k, label] of STAGES.slice(1, 6)) row[`추가질문_${label}`] = s.followups[k] ?? 0;
  row.AI_실패 = s.aiFailures;
  return row;
}

/** 전송 실패 시 진행자에게 따로 보낼 수 있게 복사할 글 */
export const rowText = (row: Record<string, string | number>) => Object.entries(row).map(([k, v]) => `${k}: ${v}`).join("\n");
