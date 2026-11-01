// 역량 연결 규칙: 대표 1개 + 보조 최대 2개
import type { TaskOutput } from "@/lib/ai/contract";
import { MAX_SECONDARY_COMPETENCIES } from "./stages";
import type { CompetencyId, CompetencyMatch, Experience } from "./types";

/** AI 제안을 규칙에 맞게 정리한다: 중복 제거, 대표 정확히 1개, 보조 최대 2개, 행동 번호는 0부터 */
export function normalizeMatches(raw: TaskOutput<"match">["matches"], actionCount: number): CompetencyMatch[] {
  const seen = new Set<CompetencyId>();
  const unique = raw.filter((m) => m.scene.trim() && !seen.has(m.competencyId) && seen.add(m.competencyId));
  const primaryIdx = Math.max(0, unique.findIndex((m) => m.role === "primary"));
  const ordered = unique.length ? [unique[primaryIdx], ...unique.filter((_, i) => i !== primaryIdx)] : [];
  return ordered.slice(0, 1 + MAX_SECONDARY_COMPETENCIES).map((m, i) => ({
    competencyId: m.competencyId,
    role: i === 0 ? "primary" : "secondary",
    scene: m.scene.trim(),
    actionRefs: [...new Set(m.actionNumbers.map((n) => n - 1).filter((n) => n >= 0 && n < actionCount))],
  }));
}

/** 완성한 경험이 연결된 역량 */
export function linkedMatch(exp: Experience, cid: CompetencyId): CompetencyMatch | null {
  if (!exp.matchesConfirmed) return null;
  return exp.matches?.find((m) => m.competencyId === cid) ?? null;
}
