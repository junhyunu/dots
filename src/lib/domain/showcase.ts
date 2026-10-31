// 홈 카드에 보여줄 경험 결과물. 실제 경험(완성된 것)과 예시를 같은 모양으로 다룬다.
import type { CompetencyId, CompetencyMatch, Experience, KeywordCandidate, KeywordSet, StarDraft } from "./types";

export interface ShowcaseExperience {
  id: string;
  example?: true;
  basic: Experience["basic"];
  star: Pick<StarDraft, "situation" | "task" | "actions" | "result" | "learning">;
  keyword: KeywordSet | null;
  matches: CompetencyMatch[];
  hasStory?: boolean;
}

/** 완성한(역량 연결까지 마친) 실제 경험만 홈에 보여준다 */
export function toShowcase(exp: Experience): ShowcaseExperience | null {
  if (!exp.matchesConfirmed || !exp.star || !exp.matches?.length) return null;
  return {
    id: exp.id,
    basic: exp.basic,
    star: exp.star,
    keyword: exp.keyword,
    matches: exp.matches,
    hasStory: exp.stories.some((s) => s.body),
  };
}

export function matchFor(item: ShowcaseExperience, cid: CompetencyId): CompetencyMatch | null {
  return item.matches.find((m) => m.competencyId === cid) ?? null;
}

/** Summary 칸: 선택한 역량의 키워드가 있으면 그것, 없으면 대표 키워드 */
export function summaryKeyword(item: ShowcaseExperience, cid: CompetencyId): KeywordCandidate | null {
  const k = item.keyword;
  if (!k?.candidates.length) return null;
  return k.candidates.find((c) => c.competencyId === cid) ?? k.candidates[k.selectedIndex ?? 0] ?? null;
}

/** 선택한 역량에 연결된 경험: 대표로 연결된 것을 먼저 */
export function itemsFor(items: ShowcaseExperience[], cid: CompetencyId): ShowcaseExperience[] {
  const linked = items.filter((i) => matchFor(i, cid));
  return [...linked.filter((i) => matchFor(i, cid)!.role === "primary"), ...linked.filter((i) => matchFor(i, cid)!.role === "secondary")];
}
