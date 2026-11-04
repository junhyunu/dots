import { afterEach, describe, expect, it, vi } from "vitest";
import { GenerateError, generate } from "./api";

const respond = (status: number, body: unknown) =>
  vi.stubGlobal("fetch", vi.fn(async () => new Response(typeof body === "string" ? body : JSON.stringify(body), { status })));

const payload = {} as never;

async function failure(): Promise<GenerateError> {
  try {
    await generate("questions", payload);
  } catch (e) {
    return e as GenerateError;
  }
  throw new Error("실패해야 하는데 성공함");
}

afterEach(() => vi.unstubAllGlobals());

describe("AI 요청 오류 정리 (화면에 띄울 안내 + [다시 시도] 여부)", () => {
  it("성공하면 받은 내용을 그대로 돌려준다", async () => {
    respond(200, { data: { questions: [{ question: "어디서 했나요?" }] } });
    await expect(generate("questions", payload)).resolves.toEqual({ questions: [{ question: "어디서 했나요?" }] });
  });

  it("서버가 보낸 안내와 다시 시도 여부를 그대로 쓴다", async () => {
    respond(500, { error: { code: "no_api_key", message: "서버에 API 키가 설정되지 않았어요.", retryable: false } });
    const e = await failure();
    expect(e).toBeInstanceOf(GenerateError);
    expect(e.message).toBe("서버에 API 키가 설정되지 않았어요.");
    expect(e.retryable).toBe(false);
  });

  it("응답이 끊겨 읽을 수 없으면 일반 안내 + [다시 시도]", async () => {
    respond(502, "<html>Bad Gateway</html>");
    const e = await failure();
    expect(e.message).toBe("알 수 없는 오류가 났어요. 다시 시도해 주세요.");
    expect(e.retryable).toBe(true);
  });

  it("성공 응답인데 내용이 비어 있어도 [다시 시도]", async () => {
    respond(200, {});
    expect((await failure()).retryable).toBe(true);
  });

  it("서버에 연결하지 못하면 인터넷 연결 안내 + [다시 시도]", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Promise.reject(new TypeError("fetch failed"))));
    const e = await failure();
    expect(e.message).toBe("서버에 연결하지 못했어요. 인터넷 연결을 확인해 주세요.");
    expect(e.retryable).toBe(true);
  });

  it("너무 오래 걸려 끊으면 시간 초과 안내 + [다시 시도]", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Promise.reject(new DOMException("aborted", "AbortError"))));
    const e = await failure();
    expect(e.message).toBe("응답이 너무 오래 걸려요. 다시 시도해 주세요.");
    expect(e.retryable).toBe(true);
  });
});
