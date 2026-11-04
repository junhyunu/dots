// 의견 남기기를 구글 시트(Apps Script 웹 앱)로 넘기는 창구. 시트 주소는 서버 환경변수 FEEDBACK_SHEET_URL에만 둔다(브라우저에 드러나지 않음).
// UT 응답 창구(/api/ut-submit)를 이어받았다. 받는 것은 의견 한 줄뿐이고 경험 내용은 오지 않는다(lib/domain/feedback.ts).
import { parseFeedbackRow } from "@/lib/domain/feedback";

// 누구나 누를 수 있어서 같은 곳에서 짧은 시간에 많이 보내면 막는다 (서버 한 대 안에서만 세는 가벼운 제한)
const WINDOW_MS = 10 * 60 * 1000;
const MAX_PER_WINDOW = 5;
const recent = new Map<string, number[]>();

function tooMany(ip: string, now: number): boolean {
  const times = (recent.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  if (times.length >= MAX_PER_WINDOW) return true;
  recent.set(ip, [...times, now]);
  if (recent.size > 1000) recent.clear();
  return false;
}

export async function POST(req: Request) {
  const url = process.env.FEEDBACK_SHEET_URL;
  if (!url) return Response.json({ ok: false, error: "의견을 받을 곳이 설정되지 않았어요" }, { status: 500 });

  let body: { row?: unknown; website?: unknown };
  try {
    body = await req.json();
  } catch {
    return Response.json({ ok: false, error: "잘못된 요청이에요" }, { status: 400 });
  }
  // 사람 눈에 안 보이는 칸(website)을 채웠으면 프로그램이 보낸 것: 받은 척하고 버린다
  if (typeof body.website === "string" && body.website) return Response.json({ ok: true });

  const row = parseFeedbackRow(body.row);
  if (!row) return Response.json({ ok: false, error: "잘못된 요청이에요" }, { status: 400 });

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "local";
  if (tooMany(ip, Date.now())) return Response.json({ ok: false, error: "잠시 뒤에 다시 보내 주세요" }, { status: 429 });

  try {
    const res = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(row), redirect: "follow" });
    const text = await res.text();
    const okBody = (() => {
      try {
        return JSON.parse(text).ok === true;
      } catch {
        return false;
      }
    })();
    if (!res.ok || !okBody) {
      console.warn("[feedback]", res.status, text.slice(0, 200));
      return Response.json({ ok: false, error: "의견을 저장하지 못했어요" }, { status: 502 });
    }
    return Response.json({ ok: true });
  } catch (e) {
    console.warn("[feedback]", e);
    return Response.json({ ok: false, error: "의견을 받을 곳에 연결하지 못했어요" }, { status: 502 });
  }
}
