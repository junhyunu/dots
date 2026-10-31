// Claude API 호출 창구. 키를 서버에만 두고 요청을 넘겨줄 뿐, 아무것도 저장하지 않는다.
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { NextResponse } from "next/server";
import { OUTPUT_SCHEMAS, TASKS, type GenerateErrorBody, type TaskName } from "@/lib/ai/contract";
import { buildSystemPrompt } from "@/lib/ai/server/prompts";
import { TASK_DEFS } from "@/lib/ai/server/tasks";

export const runtime = "nodejs";
export const maxDuration = 60;

const MODEL = process.env.CLAUDE_MODEL || "claude-sonnet-5-5";

function fail(status: number, code: string, message: string, retryable: boolean) {
  return NextResponse.json<GenerateErrorBody>({ error: { code, message, retryable } }, { status });
}

export async function POST(req: Request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return fail(500, "no_api_key", "서버에 API 키가 설정되지 않았어요. .env.local의 ANTHROPIC_API_KEY를 확인해 주세요.", false);
  }

  let task: TaskName;
  let payload: unknown;
  try {
    const body = await req.json();
    task = body.task;
    payload = body.payload;
    if (!TASKS.includes(task) || !payload) throw new Error();
  } catch {
    return fail(400, "bad_request", "요청 형식이 올바르지 않아요.", false);
  }

  const def = TASK_DEFS[task];
  try {
    const system = await buildSystemPrompt(def.promptKey);
    const client = new Anthropic();

    const response = await client.beta.messages.parse({
      model: MODEL,
      max_tokens: 16000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      system,
      // task와 payload의 짝은 TaskPayloads가 보장한다 (유니언 호출이라 never로 좁힘)
      messages: [{ role: "user", content: def.buildMessage(payload as never) }],
      output_config: {
        effort: def.effort,
        format: betaZodOutputFormat(OUTPUT_SCHEMAS[task]),
      },
    });

    if (response.stop_reason === "refusal") {
      return fail(422, "refusal", "AI가 이 요청에 답하지 못했어요. 답변 내용을 조금 바꿔서 다시 시도해 주세요.", true);
    }
    if (response.stop_reason === "max_tokens" || !response.parsed_output) {
      return fail(502, "bad_output", "AI 응답이 중간에 끊겼어요. 다시 시도해 주세요.", true);
    }
    return NextResponse.json({ data: response.parsed_output });
  } catch (error) {
    console.error(`[generate:${task}]`, error);
    if (error instanceof Anthropic.AuthenticationError) {
      return fail(500, "auth", "API 키가 올바르지 않아요. .env.local의 키를 확인해 주세요.", false);
    }
    if (error instanceof Anthropic.RateLimitError) {
      return fail(429, "rate_limit", "요청이 몰려 잠시 쉬어야 해요. 잠시 후 다시 시도해 주세요.", true);
    }
    if (error instanceof Anthropic.BadRequestError) {
      return fail(400, "api_bad_request", "AI 요청이 거절됐어요. 다시 시도해도 같으면 알려 주세요.", true);
    }
    if (error instanceof Anthropic.APIConnectionError) {
      return fail(503, "connection", "AI 서버에 연결하지 못했어요. 인터넷 연결을 확인하고 다시 시도해 주세요.", true);
    }
    if (error instanceof Anthropic.APIError) {
      return fail(503, "api_error", "AI 서버가 잠시 응답하지 않아요. 잠시 후 다시 시도해 주세요.", true);
    }
    return fail(500, "unknown", "알 수 없는 오류가 났어요. 다시 시도해 주세요.", true);
  }
}
