// UT 설문 문구. 사전·사후 동의 문항은 같은 문장·같은 척도(5점)를 쓴다.

export const LIKERT_ITEMS = [
  "정리할 경험을 떠올리기 쉬웠다",
  "작은 경험도 쓸 만한지 판단할 수 있었다",
  "경험에서 어떤 역량을 보여 줄 수 있는지 알 수 있었다",
  "경험을 상황→행동→결과 흐름의 이야기로 쓸 수 있었다",
  "결과를 수치나 구체적인 변화로 쓸 수 있었다",
] as const;

export const EXTRA_ITEMS = [
  "완성된 원고에 내가 말하지 않은 내용이 들어가 있지 않았다",
  "역량 연결 결과를 보고 이 경험이 쓸 만하다고 느꼈다",
] as const;

export const SCALE_LABELS = ["전혀 아니다", "매우 그렇다"] as const;

export const SITUATIONS = ["취업 준비 중", "이직 준비 중", "기타"] as const;
export const PREV_TIMES = ["30분 미만", "30분 ~ 1시간", "1 ~ 2시간", "2시간 이상", "끝까지 못 했다"] as const;
export const DEVICES = ["PC", "모바일"] as const;
export const STUCK_STEPS = ["경험 떠올리기", "쓸만한지 판단하기", "역량 찾기", "이야기로 쓰기", "결과를 구체적으로 쓰기", "수치화", "막힌 단계 없음"] as const;

// 사전 설문 앞 설명: 무엇을 하는 서비스인지, 5점 문항을 어느 때를 떠올리며 답하는지 (참가자 의견으로 2026-11-02 추가, 문항 문장은 그대로)
export const SERVICE_INTRO =
  "Dots는 경험 하나를 입력하면 AI가 질문으로 내용을 끌어내, 자기소개서에 쓸 원고와 역량까지 정리해 주는 서비스예요. 써 보기 전에 평소 모습을 먼저 여쭤볼게요.";
export const PRE_LIKERT_GUIDE = [
  "Dots를 쓰기 전, 평소 자기소개서에 넣을 경험을 혼자(메모, ChatGPT 등으로) 정리할 때를 떠올려 주세요.",
  "여기서 '경험 정리'는 자기소개서에 쓸 수 있게 상황·행동·결과를 글로 적어 보는 일이에요.",
] as const;
export const PREV_TIME_LABEL = "평소 자기소개서 문항 하나에 쓸 경험 하나를 글로 정리하는 데 보통 얼마나 걸렸나요?";

export const TASK_GUIDE =
  "자기소개서에 쓰고 싶었지만 정리하지 못했거나, 쓸 만한지 몰라서 뺐던 경험 하나를 골라 정리해 주세요. 역량 키워드까지 마치고 '경험 완성하기'를 누르면 끝이에요.";
