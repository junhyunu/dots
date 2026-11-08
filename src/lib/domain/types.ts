// 서비스 전체가 공유하는 데이터 구조. 브라우저(localStorage)에 그대로 저장된다.
// 구조를 바꾸면 SCHEMA_VERSION을 올리고 store/migrations.ts에 변환을 추가한다.

export const SCHEMA_VERSION = 3;

export type StageId = "situation" | "goal" | "action" | "result" | "learning";

export type CompetencyId =
  | "problem_solving"
  | "challenge"
  | "decision"
  | "trial_error"
  | "collaboration"
  | "conflict"
  | "motivation";

/** 진행 순서: 질문 → 원고 → 역량 연결 → 역량 키워드 → 완성 (v3에서 연결과 키워드 순서를 바꿈) */
export type ExperienceStatus = "interviewing" | "drafting" | "matching" | "keyword" | "done";

export interface ExperienceBasic {
  title: string;
  period: string;
  role: string;
}

export interface QAItem {
  id: string;
  question: string;
  /** 추가 질문에서 왜 묻는지 한 줄 */
  reason?: string;
  answer: string;
  /** "기억 안 남" */
  skipped: boolean;
}

export interface QARound {
  id: string;
  kind: "initial" | "followup" | "final_check";
  items: QAItem[];
  submittedAt: string | null;
  /** 제출 후 AI 검토(추가 질문·요약)가 끝났는지. 새로고침 중 끊긴 요청을 이어가는 데 쓴다 */
  reviewed: boolean;
  /** 사용자가 "충분해요, 다음으로"로 닫았는지 */
  closedByUser: boolean;
}

export interface StageLog {
  status: "pending" | "active" | "done";
  rounds: QARound[];
  /** 단계가 끝날 때 보여주는 "AI가 이해한 내용" */
  summary: string | null;
  summaryEdited: boolean;
}

export interface Interview {
  currentStage: StageId | "final_check" | "complete";
  stages: Record<StageId, StageLog>;
  /** null = 아직 점검 전, [] = 점검했지만 물을 것이 없었음 */
  finalCheck: QARound[] | null;
}

export interface StarAction {
  label: string;
  body: string;
}

export interface StarDraft {
  situation: string;
  task: string;
  actions: StarAction[];
  result: string;
  learning: string;
  generatedAt: string;
  edited: boolean;
}

export interface KeywordCandidate {
  competencyId: CompetencyId;
  keyword: string;
  sentence: string;
}

/** 연결한 역량마다 키워드 1개, 대표 역량 순서대로. selectedIndex = 대표 역량의 키워드 (domain/keywords.ts가 맞춤) */
export interface KeywordSet {
  candidates: KeywordCandidate[];
  selectedIndex: number | null;
}

export type MatchRole = "primary" | "secondary";

/** 경험 하나는 대표 역량 1개 + 보조 역량 최대 2개에 연결된다. 연결하지 않은 역량은 목록에 없다. */
export interface CompetencyMatch {
  competencyId: CompetencyId;
  role: MatchRole;
  scene: string;
  /** 이 역량과 관련된 STAR 행동 항목 번호(0부터). 홈 카드에서 강조한다 */
  actionRefs: number[];
}

/** 스토리 완성: STAR 원고 → 소제목 + 문단의 자기소개서 글 */
export interface Story {
  id: string;
  prompt?: string;
  charLimit?: number;
  /** 글에 필요한 생각·의도·감정이 부족한지 AI 확인을 마쳤는지 */
  checked: boolean;
  followups: QARound[];
  subtitle: string;
  body: string;
  /** AI가 글을 한 번이라도 썼는지. 사용자가 본문을 모두 지워도 글 칸을 그대로 두고 새로 쓰지 않으려고 (예전 데이터는 없음 → storyWritten이 내용으로 판단) */
  written?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Experience {
  id: string;
  createdAt: string;
  updatedAt: string;
  basic: ExperienceBasic;
  status: ExperienceStatus;
  interview: Interview;
  star: StarDraft | null;
  keyword: KeywordSet | null;
  matches: CompetencyMatch[] | null;
  /** 경험을 완성했는지 (역량 키워드 단계의 "경험 완성하기"). 완성한 경험만 홈·내 역량 한눈에 보기에 나온다 */
  matchesConfirmed: boolean;
  stories: Story[];
}

export interface AppState {
  schemaVersion: number;
  experienceOrder: string[];
  experiences: Record<string, Experience>;
  activeExperienceId: string | null;
}
