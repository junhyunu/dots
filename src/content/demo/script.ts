// 시연 모드의 AI 대본: /api/generate를 부르지 않고 정해 둔 응답을 돌려준다 (요금 없음, 인터넷 없어도 동작).
// 시나리오 "학과 축제 먹거리 부스 운영"으로 모든 기능(추가 질문, 전체 점검, STAR, 키워드, 역량 연결, 스토리 추가 질문)을 한 번씩 거친다.
// 다른 경험명이면 일반 질문으로, 가상 경험(pool)이면 그 경험의 내용으로 답한다.
import type { ExperienceContext, TaskName, TaskOutput, TaskPayloads } from "@/lib/ai/contract";
import { stageDef } from "@/lib/domain/stages";
import type { StageId } from "@/lib/domain/types";
import { DEMO_POOL } from "./pool";

export const DEMO_BASIC = { title: "학과 축제 먹거리 부스 운영", period: "2025년 5월, 축제 3일", role: "부스 운영 총괄 (5명 팀)" };

type QA = { question: string; reason?: string; answer: string };

const QUESTIONS: Record<StageId, QA[]> = {
  situation: [
    { question: "이 부스는 어떤 상황에서 맡게 됐나요? 팀은 어떻게 꾸려졌나요?", answer: "학과 축제에서 떡볶이 부스를 맡았어. 동기 5명이 팀이었고 내가 총괄이었음." },
    { question: "운영하면서 처음 마주친 문제는 무엇이었나요?", answer: "첫날 점심에 줄이 30m 넘게 늘어서 기다리다 그냥 가는 사람이 많았어. 줄이 옆 부스 앞까지 막아서 항의도 받음" },
    { question: "그 문제를 왜 바로 해결해야 했나요?", answer: "매출이 학과 행사비랑 연결돼 있었고, 둘째 날부터 더 붐빈다고 해서 그대로 두면 안 됐어" },
  ],
  goal: [
    { question: "그 상황에서 가장 먼저 이루고 싶었던 목표는 무엇이었나요?", answer: "대기 시간을 10분 안으로 줄이는 거. 그리고 옆 부스에 피해 안 주기" },
    { question: "무엇을 보면 목표를 이뤘다고 판단하려 했나요?", answer: "주문부터 받는 데까지 시간을 직접 재 보기로 했어. 첫날은 평균 25분 정도였어" },
  ],
  action: [
    { question: "줄이 길어진 원인은 어떻게 찾았나요?", answer: "첫날 저녁에 30분 동안 주문 과정을 지켜봤는데, 메뉴 고르고 현금 거스름돈 주는 데서 제일 오래 걸렸어" },
    { question: "원인을 알고 나서 어떤 방법을 골랐나요? 다른 선택지도 있었나요?", answer: "메뉴를 5개에서 3개로 줄이고 계좌이체 QR을 크게 붙였어. 사람을 늘리자는 의견도 있었는데 공간이 좁아서 오히려 부딪힐 것 같아서 안 했어" },
    { question: "팀원들과는 어떻게 역할을 나눴나요?", answer: "주문 받는 사람, 만드는 사람, 내주는 사람을 딱 나누고 줄 관리하는 사람을 한 명 따로 뒀어" },
  ],
  result: [
    { question: "바꾼 뒤 무엇이 달라졌나요?", answer: "둘째 날 평균 대기 시간이 8분 정도로 줄었어. 옆 부스 항의도 없었고" },
    { question: "숫자나 눈에 보이는 결과가 있었나요?", answer: "3일 동안 준비한 재료를 다 팔았어. 매출은 작년보다 많았다고 들었는데 정확한 금액은 기억 안 남" },
  ],
  learning: [
    { question: "이 경험으로 무엇을 배웠나요?", answer: "문제가 생기면 사람을 더 쓰기보다 과정을 먼저 보는 게 중요하다는 거" },
    { question: "비슷한 상황이 오면 어떻게 하겠어요?", answer: "시작 전에 주문 과정을 미리 한 번 돌려 보고 막히는 곳을 찾을 것 같아" },
  ],
};

const FOLLOWUPS: Partial<Record<StageId, QA[]>> = {
  situation: [
    { question: "옆 부스 항의를 받았을 때 어떻게 대응했나요?", reason: "면접관이 갈등 상황 대처를 물을 수 있어요.", answer: "바로 가서 사과하고, 줄을 우리 부스 옆 골목 쪽으로 꺾어서 세우겠다고 했어" },
  ],
  action: [
    { question: "사람을 늘리지 않기로 했을 때 팀원들 반응은 어땠나요?", reason: "판단 근거와 설득 과정이 원고에 필요해요.", answer: "처음엔 한 명이 반대했는데, 좁은 공간에서 5명이 움직이는 걸 그려서 보여 주니까 동의했어" },
    { question: "남길 메뉴 3개는 어떤 기준으로 골랐나요?", reason: "기준이 있으면 판단력이 더 잘 드러나요.", answer: "첫날 판매 기록에서 많이 팔린 3개만 남겼어. 나머지 2개는 합쳐서 10%도 안 됐어" },
  ],
};

const SUMMARIES: Record<StageId, string> = {
  situation: "학과 축제 떡볶이 부스를 5명 팀으로 총괄했는데, 첫날 점심 대기 줄이 30m 넘게 늘어 손님이 떠나고 옆 부스 항의까지 받았어요. 둘째 날 더 붐빌 예정이라 바로 해결이 필요했어요.",
  goal: "대기 시간을 첫날 평균 25분에서 10분 안으로 줄이고, 옆 부스에 피해를 주지 않는 것이 목표였어요. 주문부터 수령까지 시간을 직접 재서 확인하기로 했어요.",
  action: "주문 과정을 30분 관찰해 메뉴 고르기와 현금 거스름돈이 병목임을 찾았어요. 판매 기록으로 메뉴를 3개로 줄이고 계좌이체 QR을 붙였으며, 인원을 늘리는 대신 주문·조리·전달·줄 관리로 역할을 나눴어요.",
  result: "둘째 날 평균 대기 시간이 약 8분으로 줄었고 옆 부스 항의도 없었어요. 3일 동안 준비한 재료를 모두 팔았어요(매출 금액은 확인 필요).",
  learning: "문제가 생기면 사람을 늘리기 전에 과정을 먼저 봐야 한다는 걸 배웠어요. 다음에는 시작 전에 주문 과정을 미리 돌려 병목을 찾겠다고 했어요.",
};

const FINAL_CHECK: QA[] = [
  { question: "대기 시간이 줄어든 게 메뉴를 줄여서인지, 결제 방식을 바꿔서인지 구분해 볼 수 있었나요?", reason: "두 가지를 함께 바꾸면 무엇이 효과였는지 질문받을 수 있어요.", answer: "정확히 재지는 못했는데, 결제할 때 멈추는 시간이 확실히 없어졌어. 둘 다 효과 있었다고 생각함" },
];

const STAR = {
  situation: "학과 축제에서 5명 팀으로 떡볶이 부스를 총괄했다. 첫날 점심 대기 줄이 30m 넘게 늘어 손님이 기다리다 떠났고, 줄이 옆 부스 앞을 막아 항의를 받았다. 둘째 날은 더 붐빌 예정이었다.",
  task: "대기 시간을 첫날 평균 25분에서 10분 안으로 줄이고, 옆 부스에 피해를 주지 않는 것이 목표였다.",
  actions: [
    { label: "병목 관찰", body: "첫날 저녁 30분 동안 주문 과정을 지켜보며 메뉴 고르기와 현금 거스름돈에서 가장 오래 걸린다는 것을 찾았다." },
    { label: "메뉴 축소와 결제 변경", body: "첫날 판매 기록에서 많이 팔린 3개 메뉴만 남기고, 계좌이체 QR을 크게 붙였다." },
    { label: "역할 분리와 설득", body: "인원을 늘리자는 의견이 있었지만 좁은 공간에서 동선이 부딪히는 그림을 보여 주며 설득했고, 주문·조리·전달·줄 관리로 역할을 나눴다." },
    { label: "옆 부스에 사과", body: "항의를 받자 바로 사과하고 줄을 골목 쪽으로 꺾어 세웠다." },
  ],
  result: "둘째 날 평균 대기 시간이 약 8분으로 줄었고 옆 부스 항의도 없었다. 3일 동안 준비한 재료를 모두 팔았다. (매출 금액은 확인 필요)",
  learning: "문제가 생기면 사람을 늘리기 전에 과정을 먼저 봐야 한다는 것을 배웠다. 다음에는 시작 전에 주문 과정을 미리 돌려 병목을 찾겠다.",
};

const KEYWORDS: TaskOutput<"keyword">["candidates"] = [
  { competencyId: "problem_solving", keyword: "병목부터 찾는 눈", sentence: "사람을 늘리기 전에 과정을 관찰해 진짜 병목을 찾는 힘" },
  { competencyId: "decision", keyword: "기록으로 고른 메뉴 3개", sentence: "판매 기록을 근거로 무엇을 덜어낼지 정하는 판단력" },
  { competencyId: "conflict", keyword: "먼저 사과하고 줄을 꺾다", sentence: "항의를 피하지 않고 바로 해결책을 내놓는 조율" },
];

const MATCHES: TaskOutput<"match">["matches"] = [
  { competencyId: "problem_solving", role: "primary", scene: "주문 과정을 관찰해 메뉴 선택·현금 결제를 병목으로 찾고 바꿈", actionNumbers: [1, 2] },
  { competencyId: "decision", role: "secondary", scene: "판매 기록으로 메뉴 3개를 남기고, 인원 증원 대신 역할 분리를 고름", actionNumbers: [2, 3] },
  { competencyId: "conflict", role: "secondary", scene: "옆 부스 항의에 바로 사과하고 줄 방향을 바꿈", actionNumbers: [4] },
];

const STORY_FOLLOWUP: QA[] = [
  { question: "줄이 30m까지 늘어난 걸 처음 봤을 때 어떤 마음이었나요?", reason: "그때의 생각이 글에 진정성을 더해요.", answer: "솔직히 당황했는데, 총괄이니까 내가 정리해야 한다는 생각이 제일 컸어" },
];

const STORY = {
  subtitle: "사람을 늘리기 전에, 과정을 먼저 봤습니다",
  body: "학과 축제에서 떡볶이 부스를 총괄했을 때, 첫날 점심 대기 줄이 30m 넘게 늘어났습니다. 기다리다 떠나는 손님이 많았고, 줄이 옆 부스 앞을 막아 항의까지 받았습니다. 당황스러웠지만 총괄인 제가 정리해야 한다는 생각이 가장 컸습니다.\n\n먼저 옆 부스에 사과하고 줄을 골목 쪽으로 꺾어 세웠습니다. 그리고 첫날 저녁 30분 동안 주문 과정을 지켜보며 메뉴를 고르는 시간과 현금 거스름돈에서 가장 오래 걸린다는 것을 찾았습니다. 판매 기록에서 많이 팔린 3개 메뉴만 남기고 계좌이체 QR을 크게 붙였습니다. 사람을 늘리자는 의견도 있었지만, 좁은 공간에서 동선이 부딪히는 그림을 보여 드리며 주문·조리·전달·줄 관리로 역할을 나누자고 설득했습니다.\n\n둘째 날 평균 대기 시간은 약 8분으로 줄었고, 3일 동안 준비한 재료를 모두 팔았습니다. 이 경험으로 문제가 생기면 사람을 늘리기 전에 과정을 먼저 봐야 한다는 것을 배웠습니다.",
};

// ---------- 예시 답변 ----------

const ALL_QA: QA[] = [...Object.values(QUESTIONS).flat(), ...Object.values(FOLLOWUPS).flat(), ...FINAL_CHECK, ...STORY_FOLLOWUP];

/** [예시 답변 넣기]: 대본의 질문이면 그 답, 아니면 일반 예시 답 */
export function demoAnswer(question: string): string {
  return ALL_QA.find((q) => q.question === question)?.answer ?? "(시연용 예시 답변) 그때 상황을 떠올려 보면, 팀과 함께 문제를 나눠 맡고 매주 진행 상황을 확인했어요.";
}

// ---------- 대본 응답 ----------

const isScenario = (title: string) => title.trim() === DEMO_BASIC.title;
const poolEntry = (title: string) => DEMO_POOL.find((e) => e.title === title.trim());
const q = (list: QA[]) => list.map(({ question, reason }) => ({ question, reason: reason ?? "" }));
const answersOf = (ctx: ExperienceContext, stage: StageId) =>
  ctx.history.find((h) => h.stage === stage)?.items.filter((i) => !i.skipped && i.answer.trim()).map((i) => i.answer.trim()) ?? [];

function genericQuestions(stage: StageId) {
  return stageDef(stage).focus.slice(0, 3).map((f) => ({ question: f.replace("나의", "내"), reason: "" }));
}

function genericStar(ctx: ExperienceContext) {
  const join = (s: StageId) => answersOf(ctx, s).join(" ") || "(확인 필요)";
  return {
    situation: join("situation"),
    task: join("goal"),
    actions: answersOf(ctx, "action").map((body, i) => ({ label: `행동 ${i + 1}`, body })).concat(answersOf(ctx, "action").length ? [] : [{ label: "행동", body: "(확인 필요)" }]),
    result: join("result"),
    learning: join("learning"),
  };
}

function respond<T extends TaskName>(task: T, payload: TaskPayloads[T]): TaskOutput<T> {
  const p = payload as TaskPayloads[TaskName] & Record<string, unknown>;
  const basic = "basic" in p ? (p.basic as { title: string }) : (p.context as ExperienceContext).basic;
  const scenario = isScenario(basic.title);
  const entry = poolEntry(basic.title);
  let out: unknown;

  switch (task) {
    case "questions": {
      const stage = p.stage as StageId;
      out = { questions: scenario ? q(QUESTIONS[stage]) : genericQuestions(stage) };
      break;
    }
    case "followup": {
      const { stage, followupCount, forceComplete, context } = p as TaskPayloads["followup"];
      const more = scenario && !forceComplete && followupCount === 0 ? FOLLOWUPS[stage] : undefined;
      const summary = scenario ? SUMMARIES[stage] : answersOf(context, stage).join(" ").slice(0, 140) || "답변을 바탕으로 정리했어요.";
      out = more ? { sufficient: false, summary, questions: q(more) } : { sufficient: true, summary, questions: [] };
      break;
    }
    case "final_check":
      out = { questions: scenario ? q(FINAL_CHECK) : [] };
      break;
    case "star": {
      const { context, regenerate } = p as TaskPayloads["star"];
      const fresh = scenario ? STAR : entry ? entry.star : genericStar(context);
      // 블록 하나 다시 쓰기: 그 블록만 대본 내용으로 바꾼다
      out = regenerate ? { ...regenerate.current, [regenerate.block]: fresh[regenerate.block] } : fresh;
      break;
    }
    case "keyword":
      out = {
        candidates: scenario
          ? KEYWORDS
          : entry
            ? entry.comps.slice(0, 3).map(([competencyId, keyword, sentence]) => ({ competencyId, keyword, sentence }))
            : [{ competencyId: "problem_solving", keyword: "끝까지 원인 찾기", sentence: "문제를 덮지 않고 원인을 찾아 해결하는 힘" }],
      };
      break;
    case "match":
      out = {
        matches: scenario
          ? MATCHES
          : entry
            ? entry.comps.slice(0, 3).map(([competencyId, , , scene, actionNumbers], i) => ({ competencyId, role: i === 0 ? "primary" : "secondary", scene, actionNumbers }))
            : [{ competencyId: "problem_solving", role: "primary", scene: "(장면 한 줄을 적어 주세요)", actionNumbers: [1] }],
      };
      break;
    case "story_followup": {
      const { previous } = p as TaskPayloads["story_followup"];
      out = { questions: scenario && previous.length === 0 ? q(STORY_FOLLOWUP) : [] };
      break;
    }
    case "story": {
      const { star } = p as TaskPayloads["story"];
      out = scenario
        ? STORY
        : entry?.story
          ? { subtitle: entry.story.subtitle, body: entry.story.body }
          : {
              subtitle: (p as TaskPayloads["story"]).keywords[0]?.keyword ?? basic.title,
              body: [star.situation, `${star.task} ${star.actions.map((a) => a.body).join(" ")}`, `${star.result} ${star.learning}`].join("\n\n"),
            };
      break;
    }
  }
  return out as TaskOutput<T>;
}

/** 진짜처럼 보이게 0.7~1.2초 기다린 뒤 대본 응답 */
export async function demoGenerate<T extends TaskName>(task: T, payload: TaskPayloads[T]): Promise<TaskOutput<T>> {
  await new Promise((r) => setTimeout(r, 700 + Math.random() * 500));
  return respond(task, payload);
}
