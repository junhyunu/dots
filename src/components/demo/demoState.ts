// 시연 데이터 불러오기: 구성 번호(seed)로 가상 데이터를 만들어 시연 저장 공간(dots:demo)에 넣는다.
import { buildDemoState, DEFAULT_SEED, SEED_KEY } from "@/content/demo/build";
import { useAppStore } from "@/lib/store/useAppStore";

export function loadDemo(seed: number) {
  useAppStore.setState({ ...buildDemoState(seed), view: "experience" });
  localStorage.setItem(SEED_KEY, String(seed));
}

export function currentSeed(): number {
  return Number(localStorage.getItem(SEED_KEY)) || DEFAULT_SEED;
}

/** 처음 열었거나 시연 경험이 하나도 없으면 지금 구성으로 채운다 */
export function ensureDemo() {
  if (localStorage.getItem(SEED_KEY) === null || useAppStore.getState().experienceOrder.length === 0) loadDemo(currentSeed());
}
