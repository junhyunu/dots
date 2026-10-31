// 시연 모드 [오류 흉내] 스위치: 켜면 다음 AI 요청 한 번만 실패한다 (시연 영상에서 오류 안내 + 다시 시도를 보여 주기 위함).
// 탭을 닫으면 사라지도록 sessionStorage에 둔다. 실패가 한 번 일어나면 저절로 꺼진다.
const KEY = "dots:demo:fail-next";
export const FAIL_EVENT = "dots:demo:fail-change";

export function isFailArmed(): boolean {
  try {
    return sessionStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

export function setFailArmed(on: boolean) {
  try {
    if (on) sessionStorage.setItem(KEY, "1");
    else sessionStorage.removeItem(KEY);
  } catch {
    // 저장소를 못 쓰면 스위치만 동작하지 않는다
  }
  window.dispatchEvent(new Event(FAIL_EVENT));
}

/** 켜져 있으면 끄고 true (= 이번 요청을 실패시킨다) */
export function consumeFail(): boolean {
  if (!isFailArmed()) return false;
  setFailArmed(false);
  return true;
}
