// 테스트용 데이터 만들기. 필요한 칸만 바꿔 쓴다.
import type { CompetencyId, CompetencyMatch, Experience, KeywordCandidate, MatchRole, StarDraft } from "@/lib/domain/types";

export const match = (competencyId: CompetencyId, role: MatchRole, scene = `${competencyId} 장면`, actionRefs: number[] = []): CompetencyMatch => ({
  competencyId,
  role,
  scene,
  actionRefs,
});

export const kw = (competencyId: CompetencyId, keyword = `${competencyId} 키워드`): KeywordCandidate => ({
  competencyId,
  keyword,
  sentence: `${keyword}을 보여 주는 힘`,
});

export const star = (patch: Partial<StarDraft> = {}): StarDraft => ({
  situation: "상황",
  task: "목표",
  actions: [
    { label: "행동 1", body: "본문 1" },
    { label: "행동 2", body: "본문 2" },
  ],
  result: "결과",
  learning: "배운 점",
  generatedAt: "2026-11-01T00:00:00.000Z",
  edited: false,
  ...patch,
});

export function experience(patch: Partial<Experience> = {}): Experience {
  const stage = { status: "done" as const, rounds: [], summary: null, summaryEdited: false };
  return {
    id: "exp-1",
    createdAt: "2026-11-01T00:00:00.000Z",
    updatedAt: "2026-11-01T00:00:00.000Z",
    basic: { title: "학과 축제 먹거리 부스 운영", period: "2025년 5월", role: "부스 총괄" },
    status: "done",
    interview: {
      currentStage: "complete",
      stages: { situation: stage, goal: stage, action: stage, result: stage, learning: stage },
      finalCheck: [],
    },
    star: star(),
    keyword: null,
    matches: null,
    matchesConfirmed: false,
    stories: [],
    ...patch,
  };
}
