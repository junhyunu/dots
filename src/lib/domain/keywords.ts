// 역량 키워드 규칙: 역량 연결을 먼저 정하고, 연결한 역량마다 키워드 1개를 둔다 (2026-11-01 사용자 결정).
// 대표 키워드 = 대표 역량의 키워드. 키워드 화면에서는 대표를 바꿀 수 없고 역량 연결에서 바꾼다.
import type { CompetencyId, CompetencyMatch, KeywordCandidate, KeywordSet } from "./types";

/** 연결한 역량 순서(대표 먼저)로 맞춘다: 연결 안 한 역량의 키워드는 빼고, 대표 역량의 키워드를 대표로 */
export function alignKeywords(keyword: KeywordSet | null, matches: CompetencyMatch[] | null): KeywordSet | null {
  if (!keyword || !matches) return keyword;
  const ordered = [...matches.filter((m) => m.role === "primary"), ...matches.filter((m) => m.role === "secondary")];
  const candidates = ordered.flatMap((m) => keyword.candidates.filter((c) => c.competencyId === m.competencyId).slice(0, 1));
  const primary = ordered.find((m) => m.role === "primary");
  const selectedIndex = candidates.findIndex((c) => c.competencyId === primary?.competencyId);
  return { candidates, selectedIndex: selectedIndex >= 0 ? selectedIndex : null };
}

/** 연결했지만 아직 키워드가 없는 역량 */
export function missingKeywordComps(keyword: KeywordSet | null, matches: CompetencyMatch[] | null): CompetencyId[] {
  if (!matches) return [];
  return matches.map((m) => m.competencyId).filter((cid) => !keyword?.candidates.some((c) => c.competencyId === cid));
}

/** 새로 받은 키워드를 역량별로 넣거나 바꾼다 */
export function mergeKeywords(keyword: KeywordSet | null, incoming: KeywordCandidate[]): KeywordSet {
  const byComp = new Map((keyword?.candidates ?? []).map((c) => [c.competencyId, c]));
  for (const c of incoming) byComp.set(c.competencyId, c);
  return { candidates: [...byComp.values()], selectedIndex: keyword?.selectedIndex ?? null };
}
