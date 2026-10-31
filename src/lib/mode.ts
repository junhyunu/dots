// 시연 모드: /demo 아래에서 열면 저장 공간(dots:demo)·링크·AI 응답(대본)을 시연용으로 바꾼다.
// 화면은 브라우저에서만 그리므로(ssr: false) 처음 연 주소로 한 번 정한다.
// 시연 화면에서 나갈 때는 페이지를 새로 불러와(window.location) 실제 모드로 돌아간다.
export const DEMO = typeof window !== "undefined" && window.location.pathname.startsWith("/demo");

/** 앱 안 링크 주소. 시연 모드면 /demo 아래로 보낸다 */
export function href(path: string): string {
  if (!DEMO) return path;
  return path === "/" ? "/demo" : `/demo${path}`;
}
