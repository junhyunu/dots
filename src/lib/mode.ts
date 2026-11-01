// 시연 모드: /demo 아래에서 열면 저장 공간(dots:demo)·링크·AI 응답(대본)을 시연용으로 바꾼다.
// 화면은 브라우저에서만 그리므로(ssr: false) 처음 연 주소로 한 번 정한다.
// 시연 화면에서 나갈 때는 페이지를 새로 불러와(window.location) 실제 모드로 돌아간다.
export const DEMO = typeof window !== "undefined" && window.location.pathname.startsWith("/demo");
/** UT(사용성 테스트) 모드: /ut 아래. 실제 AI를 쓰고, 저장 공간만 따로(dots:ut-state). 코드는 src/ut */
export const UT = typeof window !== "undefined" && window.location.pathname.startsWith("/ut");

/** 앱 안 링크 주소. 시연 모드면 /demo 아래로, UT 모드면 테스트 밖(홈)으로 나가지 않게 작업 화면으로 */
export function href(path: string): string {
  if (UT) return path === "/" ? "/ut/work" : `/ut${path}`;
  if (!DEMO) return path;
  return path === "/" ? "/demo" : `/demo${path}`;
}

/** AI 요청이 실패할 때 보내는 신호 (UT 모드가 실패 횟수를 센다) */
export const AI_FAIL_EVENT = "dots:ai-fail";
