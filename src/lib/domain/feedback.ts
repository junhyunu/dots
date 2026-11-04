// 의견 남기기: 시트 한 줄로 보낼 내용과 검사 규칙. 화면(보내기)과 서버(받기)가 같은 규칙을 쓴다.
// 경험 내용(경험명·답변·원고)은 넣지 않는다. 어디서 보냈는지(화면·단계·기기)만 함께 보낸다.
import { stageDef } from "./stages";
import type { Experience } from "./types";

export const FEEDBACK_KINDS = ["막혔어요", "제안해요", "오류 같아요"] as const;
export type FeedbackKind = (typeof FEEDBACK_KINDS)[number];
export const FEEDBACK_MAX = 1000;

export interface FeedbackPlace {
  /** 홈 / 작업 화면 */
  screen: string;
  /** 작업 화면에서 보고 있던 곳 (예: "새 경험 입력", "역량 연결") */
  step: string;
  device: "PC" | "모바일";
}

/** 시트 한 줄 (칸 이름 = 시트 제목 줄) */
export interface FeedbackRow {
  제출시각: string;
  종류: FeedbackKind;
  내용: string;
  화면: string;
  단계: string;
  기기: string;
}

const STATUS_STEP: Record<Experience["status"], string> = {
  interviewing: "질문",
  drafting: "STAR 원고",
  matching: "역량 연결",
  keyword: "역량 키워드",
  done: "완성한 경험",
};

/** 작업 화면에서 지금 무엇을 하고 있는지 한 마디로 (경험명은 넣지 않는다) */
export function workStep(view: "experience" | "new" | "matrix", exp: Experience | null): string {
  if (view === "new" || !exp) return "새 경험 입력";
  if (view === "matrix") return "내 역량 한눈에 보기";
  if (exp.status !== "interviewing") return STATUS_STEP[exp.status];
  const stage = exp.interview.currentStage;
  if (stage === "final_check") return "질문 · 전체 점검";
  if (stage === "complete") return "질문 · 끝남";
  return `질문 · ${stageDef(stage).name}`;
}

/** 화면에 보여 주는 "함께 보내는 정보": 무엇을 보내는지 항목 이름과 함께 (값만 쓰면 "STAR 원고"가 원고 내용처럼 읽혀서, 2026-11-04 사용자 지적) */
export function placeLines(p: FeedbackPlace): [string, string][] {
  const lines: [string, string][] = [["보던 화면", p.screen]];
  if (p.step) lines.push(["진행 단계", p.step]);
  lines.push(["기기", p.device]);
  return lines;
}

export function feedbackRow(kind: FeedbackKind, message: string, place: FeedbackPlace, at: Date): FeedbackRow {
  return {
    제출시각: at.toLocaleString("sv-SE", { timeZone: "Asia/Seoul" }),
    종류: kind,
    내용: message.trim(),
    화면: place.screen,
    단계: place.step,
    기기: place.device,
  };
}

/** 서버가 받은 값을 검사한다. 맞으면 시트 한 줄, 아니면 null */
export function parseFeedbackRow(value: unknown): FeedbackRow | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const v = value as Record<string, unknown>;
  const str = (k: string, max: number) => (typeof v[k] === "string" && (v[k] as string).length <= max ? (v[k] as string) : null);
  const 종류 = FEEDBACK_KINDS.find((k) => k === v.종류);
  const 내용 = str("내용", FEEDBACK_MAX)?.trim();
  const 제출시각 = str("제출시각", 40);
  const 화면 = str("화면", 40);
  const 단계 = str("단계", 40);
  const 기기 = str("기기", 10);
  if (!종류 || !내용 || 제출시각 === null || 화면 === null || 단계 === null || 기기 === null) return null;
  return { 제출시각, 종류, 내용, 화면, 단계, 기기 };
}
