// 시연 데이터 만들기: 같은 구성 번호(seed)면 항상 같은 결과가 나온다 ([다시 섞기]를 눌러야 바뀜).
// 역량마다 목표 수(1~10)를 뽑고, 가상 경험 22개에서 대표 1 + 보조 최대 2개로 연결해 채운다.
// 완성 안 된 경험 2개(질문 중, 역량 연결 전)도 넣어 작업 화면의 여러 상태를 볼 수 있게 한다.
import { COMPETENCY_IDS } from "@/lib/domain/competencies";
import { STAGE_ORDER } from "@/lib/domain/stages";
import { SCHEMA_VERSION, type AppState, type CompetencyId, type CompetencyMatch, type Experience, type QARound, type StageId, type StageLog } from "@/lib/domain/types";
import { DEMO_POOL, type DemoEntry } from "./pool";
import { alignKeywords } from "@/lib/domain/keywords";

export const DEFAULT_SEED = 1;
export const SEED_KEY = "dots:demo:seed";

/** 같은 seed면 같은 수열 (mulberry32) */
function random(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle<T>(list: T[], rnd: () => number): T[] {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const STAGE_QA: Record<StageId, [string, (s: DemoEntry["star"]) => string]> = {
  situation: ["그때 어떤 상황이었나요? 무엇이 문제였나요?", (s) => s.situation],
  goal: ["무엇을 이루려고 했나요?", (s) => s.task],
  action: ["직접 어떤 일을 했나요?", (s) => s.actions.map((a) => a.body).join(" ")],
  result: ["그 뒤 무엇이 달라졌나요?", (s) => s.result],
  learning: ["이 경험으로 무엇을 배웠나요?", (s) => s.learning],
};

const firstSentence = (t: string) => (t.match(/^.*?[.!?](\s|$)/)?.[0] ?? t).trim();

function stageLog(entry: DemoEntry, stage: StageId, status: StageLog["status"], at: string, id: string): StageLog {
  if (status !== "done") return { status, rounds: [], summary: null, summaryEdited: false };
  const [question, answer] = STAGE_QA[stage];
  const round: QARound = {
    id: `${id}-${stage}`,
    kind: "initial",
    items: [{ id: `${id}-${stage}-1`, question, answer: answer(entry.star), skipped: false }],
    submittedAt: at,
    reviewed: true,
    closedByUser: false,
  };
  return { status, rounds: [round], summary: firstSentence(answer(entry.star)), summaryEdited: false };
}

type Level = "done" | "matching" | "interviewing";

function toExperience(entry: DemoEntry, index: number, links: { id: CompetencyId; role: CompetencyMatch["role"] }[], level: Level, rnd: () => number): Experience {
  const id = `demo-${index}`;
  // 최근 1년 사이 날짜를 흩어 둔다
  const at = new Date(Date.UTC(2025, 0, 1) + Math.floor(rnd() * 300) * 86400000).toISOString();
  const doneUntil = level === "interviewing" ? 2 : STAGE_ORDER.length; // 질문 중이면 상황·목표까지만 답함
  const stages = Object.fromEntries(
    STAGE_ORDER.map((s, i) => [s, stageLog(entry, s, i < doneUntil ? "done" : i === doneUntil ? "active" : "pending", at, id)]),
  ) as Record<StageId, StageLog>;
  const base: Experience = {
    id,
    createdAt: at,
    updatedAt: at,
    basic: { title: entry.title, period: entry.period, role: entry.role },
    status: level === "interviewing" ? "interviewing" : level === "matching" ? "matching" : "done",
    interview: {
      currentStage: level === "interviewing" ? STAGE_ORDER[doneUntil] : "complete",
      stages,
      finalCheck: level === "interviewing" ? null : [],
    },
    star: null,
    keyword: null,
    matches: null,
    matchesConfirmed: false,
    stories: [],
  };
  if (level === "interviewing") return base;

  base.star = { ...structuredClone(entry.star), generatedAt: at, edited: false };
  // 역량 연결 전: 원고까지만 (키워드는 역량 연결 뒤에 만든다)
  if (level === "matching") return base;

  base.matches = links.map(({ id: cid, role }) => {
    const comp = entry.comps.find((c) => c[0] === cid)!;
    return { competencyId: cid, role, scene: comp[3], actionRefs: comp[4].map((n) => n - 1) };
  });
  // 키워드 = 연결한 역량마다 1개, 대표 역량 먼저
  const candidates = entry.comps.map(([competencyId, keyword, sentence]) => ({ competencyId, keyword, sentence }));
  base.keyword = alignKeywords({ candidates, selectedIndex: null }, base.matches);
  base.matchesConfirmed = true;
  if (entry.story) {
    base.stories = [{ id: `${id}-story`, prompt: entry.story.prompt, checked: true, followups: [], subtitle: entry.story.subtitle, body: entry.story.body, createdAt: at, updatedAt: at }];
  }
  return base;
}

export function buildDemoState(seed: number): AppState {
  const rnd = random(seed);
  const target = Object.fromEntries(COMPETENCY_IDS.map((c) => [c, 1 + Math.floor(rnd() * 10)])) as Record<CompetencyId, number>;
  const count = Object.fromEntries(COMPETENCY_IDS.map((c) => [c, 0])) as Record<CompetencyId, number>;
  const shuffled = shuffle(DEMO_POOL.map((_, i) => i), rnd);
  // 작업 중 경험 2개를 먼저 떼어 둔다 (나머지로 역량을 채움)
  const working = shuffled.slice(0, 2);
  const order = shuffled.slice(2);

  const used = new Map<number, { id: CompetencyId; role: CompetencyMatch["role"] }[]>();
  const link = (i: number, cids: CompetencyId[]) => {
    // 이 경험에서 가장 잘 맞는(앞에 적힌) 역량이 대표
    const ranked = DEMO_POOL[i].comps.map((c) => c[0]).filter((c) => cids.includes(c));
    used.set(i, ranked.map((id, k) => ({ id, role: k === 0 ? "primary" : "secondary" })));
    ranked.forEach((c) => count[c]++);
  };

  for (const i of order) {
    const open = shuffle(
      DEMO_POOL[i].comps.map((c) => c[0]).filter((c) => count[c] < target[c]),
      rnd,
    );
    const take = Math.min(open.length, 1 + Math.floor(rnd() * 3));
    if (take > 0) link(i, open.slice(0, take));
  }
  // 아직 0개인 역량이 있으면, 자리가 남은 경험에 보조로 붙여 최소 1개를 보장한다
  for (const cid of COMPETENCY_IDS) {
    if (count[cid] > 0) continue;
    const host = [...used.entries()].find(([i, l]) => l.length < 3 && DEMO_POOL[i].comps.some((c) => c[0] === cid));
    if (host) {
      host[1].push({ id: cid, role: "secondary" });
      count[cid]++;
    }
  }

  const experiences: Record<string, Experience> = {};
  for (const [i, links] of used) experiences[`demo-${i}`] = toExperience(DEMO_POOL[i], i, links, "done", rnd);
  // 떼어 둔 2개는 작업 중 상태로 (홈 카드에는 나오지 않음)
  const levels: Level[] = ["matching", "interviewing"];
  working.forEach((i, k) => (experiences[`demo-${i}`] = toExperience(DEMO_POOL[i], i, [], levels[k], rnd)));

  const experienceOrder = Object.values(experiences)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map((e) => e.id);
  return { schemaVersion: SCHEMA_VERSION, experienceOrder, experiences, activeExperienceId: experienceOrder[0] ?? null };
}
