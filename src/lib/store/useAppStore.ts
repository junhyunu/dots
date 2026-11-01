"use client";
// 앱 전체 상태. persist로 localStorage("dots:state")에 저장되어 새로고침해도 유지된다.
// 로딩·오류 같은 작업 중 상태는 여기에 두지 않는다 (컴포넌트 지역 상태).
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import {
  SCHEMA_VERSION,
  type AppState,
  type CompetencyId,
  type CompetencyMatch,
  type Experience,
  type ExperienceBasic,
  type KeywordCandidate,
  type MatchRole,
  type QARound,
  type StageId,
  type StageLog,
  type StarDraft,
  type Story,
} from "@/lib/domain/types";
import { alignKeywords, mergeKeywords, missingKeywordComps } from "@/lib/domain/keywords";
import { MAX_SECONDARY_COMPETENCIES, STAGE_ORDER, nextStage } from "@/lib/domain/stages";
import { migrate } from "./migrations";
import { DEMO } from "@/lib/mode";

export type View = "experience" | "new" | "matrix";

export interface NewQuestion {
  question: string;
  reason?: string;
}

interface Actions {
  setView: (view: View, experienceId?: string) => void;
  createExperience: (basic: ExperienceBasic) => string;
  updateBasic: (id: string, basic: ExperienceBasic) => void;
  deleteExperience: (id: string) => void;

  addRound: (id: string, target: StageId | "final_check", kind: QARound["kind"], questions: NewQuestion[]) => void;
  updateAnswer: (id: string, roundId: string, itemId: string, answer: string) => void;
  toggleSkip: (id: string, roundId: string, itemId: string) => void;
  submitRound: (id: string, roundId: string, closedByUser?: boolean) => void;
  /** AI 검토 결과 반영: 요약 갱신, 라운드 검토 완료, 필요하면 추가 질문 라운드 */
  applyReview: (id: string, stage: StageId, roundId: string, summary: string, followups: NewQuestion[]) => void;
  editStageSummary: (id: string, stage: StageId, summary: string) => void;
  advanceStage: (id: string, stage: StageId) => void;
  finishFinalCheck: (id: string) => void;
  markFinalCheckEmpty: (id: string) => void;

  setStar: (id: string, star: Omit<StarDraft, "generatedAt" | "edited">) => void;
  editStar: (id: string, patch: Partial<Omit<StarDraft, "generatedAt" | "edited">>) => void;
  /** 원고 확인 → 역량 연결 단계로 */
  confirmStar: (id: string) => void;

  setMatches: (id: string, matches: CompetencyMatch[]) => void;
  /** 역량의 역할 바꾸기 (null = 연결 해제). 대표는 1개, 보조는 최대 2개를 지킨다 */
  setMatchRole: (id: string, competencyId: CompetencyId, role: MatchRole | null) => void;
  updateMatchScene: (id: string, competencyId: CompetencyId, scene: string) => void;
  /** 역량 연결 확인 → 역량 키워드 단계로 */
  confirmMatches: (id: string) => void;

  /** 받은 키워드를 역량별로 넣거나 바꾼다 (연결한 역량 순서로 맞춤) */
  setKeywords: (id: string, candidates: KeywordCandidate[]) => void;
  editKeyword: (id: string, competencyId: CompetencyId, patch: Pick<KeywordCandidate, "keyword" | "sentence">) => void;
  /** 경험 완성: 연결한 역량마다 키워드가 있어야 한다 */
  completeExperience: (id: string) => void;

  createStory: (id: string, options: { prompt?: string; charLimit?: number }) => string;
  addStoryRound: (id: string, storyId: string, questions: NewQuestion[]) => void;
  markStoryChecked: (id: string, storyId: string) => void;
  setStoryResult: (id: string, storyId: string, result: { subtitle: string; body: string }) => void;
  editStory: (id: string, storyId: string, patch: Partial<Pick<Story, "subtitle" | "body">>) => void;
  deleteStory: (id: string, storyId: string) => void;
}

export type Store = AppState & { view: View } & Actions;

const now = () => new Date().toISOString();
/** 역량 연결에서 "연결 안 함"으로 바꾼 역량의 장면·관련 행동·키워드 (expId:competencyId). 저장하지 않는다 */
const parked = new Map<string, { match: CompetencyMatch; keyword?: KeywordCandidate }>();
// randomUUID는 https·localhost에서만 있다. 휴대폰으로 개발 서버(http://IP:3000)를 열 때는 없어서
// getRandomValues로 같은 모양(UUID v4)을 만든다
const uid = (): string => {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  const b = crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = [...b].map((x) => x.toString(16).padStart(2, "0")).join("");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
};

function emptyStage(status: StageLog["status"]): StageLog {
  return { status, rounds: [], summary: null, summaryEdited: false };
}

function newExperience(basic: ExperienceBasic): Experience {
  const stages = Object.fromEntries(
    STAGE_ORDER.map((s, i) => [s, emptyStage(i === 0 ? "active" : "pending")]),
  ) as Record<StageId, StageLog>;
  return {
    id: uid(),
    createdAt: now(),
    updatedAt: now(),
    basic,
    status: "interviewing",
    interview: { currentStage: "situation", stages, finalCheck: null },
    star: null,
    keyword: null,
    matches: null,
    matchesConfirmed: false,
    stories: [],
  };
}

function newRound(kind: QARound["kind"], questions: NewQuestion[]): QARound {
  return {
    id: uid(),
    kind,
    submittedAt: null,
    reviewed: false,
    closedByUser: false,
    items: questions.map((q) => ({ id: uid(), question: q.question, reason: q.reason || undefined, answer: "", skipped: false })),
  };
}

/** 라운드를 어디서든(단계, 전체 점검, 스토리 추가 질문) 찾는다 */
function findRound(exp: Experience, roundId: string): QARound | undefined {
  for (const s of STAGE_ORDER) {
    const r = exp.interview.stages[s].rounds.find((r) => r.id === roundId);
    if (r) return r;
  }
  const r = exp.interview.finalCheck?.find((r) => r.id === roundId);
  if (r) return r;
  for (const story of exp.stories) {
    const sr = story.followups.find((r) => r.id === roundId);
    if (sr) return sr;
  }
}

export const useAppStore = create<Store>()(
  persist(
    (set, get) => {
      /** 경험 하나를 복제해 고친 뒤 저장한다 */
      const edit = (id: string, fn: (exp: Experience) => void) =>
        set((state) => {
          const current = state.experiences[id];
          if (!current) return {};
          const exp = structuredClone(current);
          fn(exp);
          exp.updatedAt = now();
          return { experiences: { ...state.experiences, [id]: exp } };
        });

      return {
        schemaVersion: SCHEMA_VERSION,
        experienceOrder: [],
        experiences: {},
        activeExperienceId: null,
        view: "new",

        setView: (view, experienceId) =>
          set((s) => ({ view, activeExperienceId: experienceId ?? s.activeExperienceId })),

        createExperience: (basic) => {
          const exp = newExperience(basic);
          set((s) => ({
            experiences: { ...s.experiences, [exp.id]: exp },
            // 최신 경험이 맨 위 (사이드바·홈·전체 역량 연결 목록이 이 순서를 쓴다)
            experienceOrder: [exp.id, ...s.experienceOrder],
            activeExperienceId: exp.id,
            view: "experience",
          }));
          return exp.id;
        },

        updateBasic: (id, basic) => edit(id, (e) => void (e.basic = basic)),

        deleteExperience: (id) =>
          set((s) => {
            const experiences = { ...s.experiences };
            delete experiences[id];
            const order = s.experienceOrder.filter((x) => x !== id);
            const active = s.activeExperienceId === id ? null : s.activeExperienceId;
            return {
              experiences,
              experienceOrder: order,
              activeExperienceId: active,
              view: active ? s.view : "new",
            };
          }),

        addRound: (id, target, kind, questions) =>
          edit(id, (e) => {
            const round = newRound(kind, questions);
            if (target === "final_check") e.interview.finalCheck = [...(e.interview.finalCheck ?? []), round];
            else e.interview.stages[target].rounds.push(round);
          }),

        updateAnswer: (id, roundId, itemId, answer) =>
          edit(id, (e) => {
            const item = findRound(e, roundId)?.items.find((i) => i.id === itemId);
            if (item) item.answer = answer;
          }),

        toggleSkip: (id, roundId, itemId) =>
          edit(id, (e) => {
            const item = findRound(e, roundId)?.items.find((i) => i.id === itemId);
            if (item) item.skipped = !item.skipped;
          }),

        submitRound: (id, roundId, closedByUser = false) =>
          edit(id, (e) => {
            const round = findRound(e, roundId);
            if (!round) return;
            round.submittedAt = now();
            round.closedByUser = closedByUser;
          }),

        applyReview: (id, stage, roundId, summary, followups) =>
          edit(id, (e) => {
            const log = e.interview.stages[stage];
            const round = log.rounds.find((r) => r.id === roundId);
            if (round) round.reviewed = true;
            log.summary = summary;
            log.summaryEdited = false;
            if (followups.length) log.rounds.push(newRound("followup", followups));
          }),

        editStageSummary: (id, stage, summary) =>
          edit(id, (e) => {
            e.interview.stages[stage].summary = summary;
            e.interview.stages[stage].summaryEdited = true;
          }),

        advanceStage: (id, stage) =>
          edit(id, (e) => {
            e.interview.stages[stage].status = "done";
            const next = nextStage(stage);
            if (next) {
              e.interview.stages[next].status = "active";
              e.interview.currentStage = next;
            } else {
              e.interview.currentStage = "final_check";
            }
          }),

        markFinalCheckEmpty: (id) =>
          edit(id, (e) => {
            e.interview.finalCheck = [];
            e.interview.currentStage = "complete";
            e.status = "drafting";
          }),

        finishFinalCheck: (id) =>
          edit(id, (e) => {
            e.interview.currentStage = "complete";
            e.status = "drafting";
          }),

        setStar: (id, star) =>
          edit(id, (e) => {
            e.star = { ...star, generatedAt: now(), edited: false };
            if (e.status === "interviewing") e.status = "drafting";
          }),

        editStar: (id, patch) =>
          edit(id, (e) => {
            if (e.star) e.star = { ...e.star, ...patch, edited: true };
          }),

        confirmStar: (id) => edit(id, (e) => void (e.status === "drafting" && (e.status = "matching"))),

        setMatches: (id, matches) =>
          edit(id, (e) => {
            for (const k of [...parked.keys()]) if (k.startsWith(`${id}:`)) parked.delete(k);
            e.matches = matches;
            e.keyword = alignKeywords(e.keyword, e.matches);
          }),

        setMatchRole: (id, competencyId, role) =>
          edit(id, (e) => {
            const list = (e.matches ??= []);
            const park = (m: CompetencyMatch) =>
              parked.set(`${id}:${m.competencyId}`, { match: { ...m }, keyword: e.keyword?.candidates.find((c) => c.competencyId === m.competencyId) });
            if (role === null) {
              const gone = list.find((m) => m.competencyId === competencyId);
              if (gone) park(gone);
              e.matches = list.filter((m) => m.competencyId !== competencyId);
              e.keyword = alignKeywords(e.keyword, e.matches);
              return;
            }
            // 새 대표를 고르면 기존 대표는 보조로 내려간다
            if (role === "primary") for (const m of list) if (m.role === "primary") m.role = "secondary";
            const existing = list.find((m) => m.competencyId === competencyId);
            if (existing) existing.role = role;
            else {
              // 연결 안 함으로 바꿨던 역량을 다시 켜면 장면·관련 행동·키워드를 되살린다 (새로고침 전까지, 사용자 결정 A)
              const back = parked.get(`${id}:${competencyId}`);
              parked.delete(`${id}:${competencyId}`);
              list.push(back ? { ...back.match, role } : { competencyId, role, scene: "", actionRefs: [] });
              if (back?.keyword) e.keyword = mergeKeywords(e.keyword, [back.keyword]);
            }
            // 보조가 넘치면 방금 바꾼 역량이 아닌 것 중 가장 뒤의 보조를 뺀다
            const extra = list.filter((m) => m.role === "secondary" && m.competencyId !== competencyId);
            const overflow = list.filter((m) => m.role === "secondary").length - MAX_SECONDARY_COMPETENCIES;
            if (overflow > 0) {
              const dropped = extra.slice(-overflow);
              dropped.forEach(park);
              const drop = new Set(dropped.map((m) => m.competencyId));
              e.matches = list.filter((m) => !drop.has(m.competencyId));
            }
            e.keyword = alignKeywords(e.keyword, e.matches);
          }),

        updateMatchScene: (id, competencyId, scene) =>
          edit(id, (e) => {
            const m = e.matches?.find((x) => x.competencyId === competencyId);
            if (m) m.scene = scene;
          }),

        confirmMatches: (id) =>
          edit(id, (e) => {
            if (!e.matches?.some((m) => m.role === "primary")) return;
            if (e.status === "matching") e.status = "keyword";
            e.keyword = alignKeywords(e.keyword, e.matches);
          }),

        setKeywords: (id, candidates) =>
          edit(id, (e) => {
            e.keyword = alignKeywords(mergeKeywords(e.keyword, candidates), e.matches);
          }),

        editKeyword: (id, competencyId, patch) =>
          edit(id, (e) => {
            const c = e.keyword?.candidates.find((x) => x.competencyId === competencyId);
            if (c) Object.assign(c, patch);
          }),

        completeExperience: (id) =>
          edit(id, (e) => {
            if (!e.matches?.some((m) => m.role === "primary") || missingKeywordComps(e.keyword, e.matches).length) return;
            e.matchesConfirmed = true;
            e.status = "done";
          }),

        createStory: (id, { prompt, charLimit }) => {
          const storyId = uid();
          edit(id, (e) => {
            e.stories.push({
              id: storyId,
              prompt: prompt?.trim() || undefined,
              charLimit: charLimit || undefined,
              checked: false,
              followups: [],
              subtitle: "",
              body: "",
              createdAt: now(),
              updatedAt: now(),
            });
          });
          return storyId;
        },

        addStoryRound: (id, storyId, questions) =>
          edit(id, (e) => {
            e.stories.find((s) => s.id === storyId)?.followups.push(newRound("followup", questions));
          }),

        markStoryChecked: (id, storyId) =>
          edit(id, (e) => {
            const story = e.stories.find((s) => s.id === storyId);
            if (story) story.checked = true;
          }),

        setStoryResult: (id, storyId, result) =>
          edit(id, (e) => {
            const story = e.stories.find((s) => s.id === storyId);
            if (story) Object.assign(story, result, { updatedAt: now() });
          }),

        editStory: (id, storyId, patch) =>
          edit(id, (e) => {
            const story = e.stories.find((s) => s.id === storyId);
            if (story) Object.assign(story, patch, { updatedAt: now() });
          }),

        deleteStory: (id, storyId) =>
          edit(id, (e) => {
            e.stories = e.stories.filter((s) => s.id !== storyId);
          }),
      };
    },
    {
      // 시연 모드(/demo)는 따로 저장해 실제 데이터를 건드리지 않는다
      name: DEMO ? "dots:demo" : "dots:state",
      version: SCHEMA_VERSION,
      storage: createJSONStorage(() => localStorage),
      migrate: (persisted, version) => migrate(persisted, version) as Store,
      // 불러올 때 경험 순서를 만든 날짜 최신순으로 맞춘다 (예전에 맨 뒤에 붙여 저장된 데이터도 바로잡힌다)
      merge: (persisted, current) => {
        const merged = { ...current, ...(persisted as Partial<Store>) };
        merged.experienceOrder = [...merged.experienceOrder].sort((a, b) =>
          (merged.experiences[b]?.createdAt ?? "").localeCompare(merged.experiences[a]?.createdAt ?? ""),
        );
        return merged;
      },
      partialize: (s) => ({
        schemaVersion: s.schemaVersion,
        experienceOrder: s.experienceOrder,
        experiences: s.experiences,
        activeExperienceId: s.activeExperienceId,
        view: s.view,
      }),
    },
  ),
);

/** 현재 선택된 경험 */
export function useActiveExperience(): Experience | null {
  return useAppStore((s) => (s.activeExperienceId ? s.experiences[s.activeExperienceId] ?? null : null));
}

export const getStore = () => useAppStore.getState();
