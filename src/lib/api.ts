// 브라우저 → /api/generate 호출. 실패는 화면에 띄울 수 있는 GenerateError로 바꿔 던진다.
import type { GenerateErrorBody, TaskName, TaskOutput, TaskPayloads } from "@/lib/ai/contract";
import { DEMO } from "@/lib/mode";

const TIMEOUT_MS = 90_000;

export class GenerateError extends Error {
  constructor(message: string, public retryable: boolean) {
    super(message);
  }
}

export async function generate<T extends TaskName>(task: T, payload: TaskPayloads[T]): Promise<TaskOutput<T>> {
  // 시연 모드: 서버(Claude)를 부르지 않고 대본으로 답한다. 대본은 시연 화면에서만 불러온다
  if (DEMO) return (await import("@/content/demo/script")).demoGenerate(task, payload);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  let res: Response;
  try {
    res = await fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ task, payload }),
      signal: controller.signal,
    });
  } catch (e) {
    const timedOut = e instanceof DOMException && e.name === "AbortError";
    throw new GenerateError(
      timedOut ? "응답이 너무 오래 걸려요. 다시 시도해 주세요." : "서버에 연결하지 못했어요. 인터넷 연결을 확인해 주세요.",
      true,
    );
  } finally {
    clearTimeout(timer);
  }

  const body = await res.json().catch(() => null);
  if (!res.ok || !body?.data) {
    const err = (body as GenerateErrorBody | null)?.error;
    throw new GenerateError(err?.message ?? "알 수 없는 오류가 났어요. 다시 시도해 주세요.", err?.retryable ?? true);
  }
  return body.data as TaskOutput<T>;
}
