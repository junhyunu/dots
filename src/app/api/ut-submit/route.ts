// UT 응답을 구글 시트(Apps Script 웹 앱)로 넘기는 창구. 시트 주소는 서버 환경변수 UT_SHEET_URL에만 둔다(브라우저에 드러나지 않음).
// 받는 것은 설문 응답·자동 기록 한 줄뿐이다. 경험 내용은 오지 않는다(src/ut/state.ts sheetRow).

export async function POST(req: Request) {
  const url = process.env.UT_SHEET_URL;
  if (!url) return Response.json({ ok: false, error: "시트 주소가 설정되지 않았어요" }, { status: 500 });

  let row: unknown;
  try {
    ({ row } = await req.json());
  } catch {
    return Response.json({ ok: false, error: "잘못된 요청이에요" }, { status: 400 });
  }
  // 한 줄짜리 키-값만 받는다 (글자·숫자, 칸 100개·전체 20KB 이하)
  const entries = row && typeof row === "object" && !Array.isArray(row) ? Object.entries(row) : [];
  const valid = entries.length > 0 && entries.length <= 100 && entries.every(([, v]) => typeof v === "string" || typeof v === "number");
  if (!valid || JSON.stringify(row).length > 20_000) return Response.json({ ok: false, error: "잘못된 요청이에요" }, { status: 400 });

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
      console.warn("[ut-submit]", res.status, text.slice(0, 200));
      return Response.json({ ok: false, error: "시트에 저장하지 못했어요" }, { status: 502 });
    }
    return Response.json({ ok: true });
  } catch (e) {
    console.warn("[ut-submit]", e);
    return Response.json({ ok: false, error: "시트에 연결하지 못했어요" }, { status: 502 });
  }
}
