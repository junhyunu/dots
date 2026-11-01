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

export const TASK_GUIDE =
  "자기소개서에 쓰고 싶었지만 정리하지 못했거나, 쓸 만한지 몰라서 뺐던 경험 하나를 골라 정리해 주세요. 역량 키워드까지 마치고 '경험 완성하기'를 누르면 끝이에요.";
