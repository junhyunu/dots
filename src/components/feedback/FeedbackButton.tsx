"use client";
// 관리자에게 의견 남기기: 상단바·사이드바의 편지 아이콘 → 의견 창 (2026-11-04 사용자 결정)
// 쓰다가 막힌 사람, 써 보고 제안할 게 있는 사람을 위한 것. 답장 기능은 없다.
// 시트로 보내는 내용은 lib/domain/feedback.ts가 정한다(경험 내용은 보내지 않음). 시연 모드는 보내지 않고 보낸 척만 한다.
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { CheckCircle2, Mail, X } from "lucide-react";
import Button from "@/components/ui/Button";
import AutoTextarea from "@/components/ui/AutoTextarea";
import { Choice } from "@/components/ui/FormFields";
import { FEEDBACK_KINDS, FEEDBACK_MAX, feedbackRow, placeLines, workStep, type FeedbackKind, type FeedbackPlace } from "@/lib/domain/feedback";
import { copyText } from "@/lib/domain/text";
import { DEMO } from "@/lib/mode";
import { useAppStore } from "@/lib/store/useAppStore";

const COOLDOWN_MS = 30_000;
// 창을 닫았다 열어도 쓰던 내용이 남게 (새로고침 전까지, 아이콘이 여러 곳에 있어도 하나로)
const draft: { kind: FeedbackKind | null; message: string } = { kind: null, message: "" };
let lastSentAt = 0;

type SendState = { state: "idle" } | { state: "sending" } | { state: "sent" } | { state: "error"; message: string };

function usePlace(): () => FeedbackPlace {
  const pathname = usePathname();
  return () => {
    const { view, activeExperienceId, experiences } = useAppStore.getState();
    const home = pathname === "/" || pathname === "/demo";
    return {
      screen: home ? "홈" : "작업 화면",
      step: home ? "" : workStep(view, activeExperienceId ? experiences[activeExperienceId] ?? null : null),
      device: window.innerWidth < 1024 ? "모바일" : "PC",
    };
  };
}

async function sendRow(row: ReturnType<typeof feedbackRow>, website: string): Promise<string | null> {
  if (DEMO) {
    await new Promise((r) => setTimeout(r, 600));
    return null;
  }
  try {
    const res = await fetch("/api/feedback", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ row, website }) });
    const body = await res.json().catch(() => null);
    return res.ok && body?.ok ? null : body?.error ?? "의견을 보내지 못했어요.";
  } catch {
    return "서버에 연결하지 못했어요. 인터넷 연결을 확인해 주세요.";
  }
}

/** iconClass: 옆 테마 버튼과 같은 크기로 (기본 20px) */
export default function FeedbackButton({ iconClass = "size-5" }: { iconClass?: string }) {
  const ref = useRef<HTMLDialogElement>(null);
  const getPlace = usePlace();
  const [open, setOpen] = useState(false);
  const [place, setPlace] = useState<FeedbackPlace | null>(null);
  const [kind, setKind] = useState<FeedbackKind | null>(null);
  const [message, setMessage] = useState("");
  const [website, setWebsite] = useState("");
  const [send, setSend] = useState<SendState>({ state: "idle" });

  useEffect(() => {
    const el = ref.current;
    if (open && el && !el.open) el.showModal();
  }, [open]);

  const show = () => {
    setPlace(getPlace());
    setKind(draft.kind);
    setMessage(draft.message);
    setSend({ state: "idle" });
    setOpen(true);
  };
  const close = () => {
    ref.current?.close();
    setOpen(false);
  };

  const trimmed = message.trim();
  const coolingDown = Date.now() - lastSentAt < COOLDOWN_MS;
  // 30초가 끝나는 순간 화면을 다시 그려 안내를 지우고 [보내기]를 켠다 (전에는 글자를 더 쳐야 풀렸음, 2026-11-15)
  const [, rerender] = useState(0);
  useEffect(() => {
    if (!open || !coolingDown) return;
    const t = window.setTimeout(() => rerender((n) => n + 1), lastSentAt + COOLDOWN_MS - Date.now() + 50);
    return () => window.clearTimeout(t);
  }, [open, coolingDown]);
  const canSend = !!kind && !!trimmed && message.length <= FEEDBACK_MAX && send.state !== "sending" && !coolingDown;
  // 무엇이 빠져서 못 보내는지 (30초 기다림은 따로 안내가 있음)
  const missing = coolingDown || send.state !== "idle" ? null : !kind && !trimmed ? "종류를 고르고 내용을 적어 주세요." : !kind ? "어떤 의견인지 골라 주세요." : !trimmed ? "내용을 적어 주세요." : null;

  const submit = async () => {
    if (!kind || !place || !canSend) return;
    setSend({ state: "sending" });
    const error = await sendRow(feedbackRow(kind, message, place, new Date()), website);
    if (error) return setSend({ state: "error", message: error });
    lastSentAt = Date.now();
    draft.kind = null;
    draft.message = "";
    setSend({ state: "sent" });
  };

  return (
    <>
      <button
        type="button"
        onClick={show}
        aria-label="관리자에게 의견 남기기"
        className="flex size-11 cursor-pointer items-center justify-center rounded-lg text-ink-soft transition-colors duration-150 hover:bg-subtle hover:text-ink"
      >
        <Mail className={iconClass} aria-hidden />
      </button>

      {open && (
        <dialog
          ref={ref}
          aria-labelledby="feedback-title"
          // 닫기는 [X]·[취소](보낸 뒤엔 [닫기])와 Esc만. 바깥을 눌러도 닫히지 않게 (쓰던 글을 실수로 잃지 않게, 2026-11-15 사용자 결정)
          onCancel={(e) => {
            e.preventDefault();
            close();
          }}
          onClose={() => setOpen(false)}
          // 스크롤은 안쪽 칸에서: 창 자체가 스크롤하면 스크롤 막대가 둥근 모서리를 네모나게 덮는다
          className="m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-md overflow-hidden rounded-2xl border border-line bg-surface p-0 text-ink shadow-[0_12px_32px_-12px_rgb(0_0_0/0.35)] backdrop:bg-scrim dark:backdrop:bg-scrim-dark"
        >
          <div className="max-h-[calc(100dvh-2rem-2px)] overflow-y-auto overscroll-contain [scrollbar-width:thin]">
          {send.state === "sent" ? (
            <div className="flex flex-col items-center p-6 text-center">
              <CheckCircle2 className="size-10 text-ok" aria-hidden />
              <h2 id="feedback-title" className="mt-3 text-lg font-bold">
                보냈어요. 고마워요.
              </h2>
              <p className="mt-1.5 text-[15px] leading-relaxed text-ink-soft">보내 주신 의견은 Dots를 고치는 데 써요.</p>
              <Button variant="secondary" size="sm" className="mt-5" onClick={close} autoFocus>
                닫기
              </Button>
            </div>
          ) : (
            <form
              className="p-5 sm:p-6"
              onSubmit={(e) => {
                e.preventDefault();
                void submit();
              }}
            >
              <h2 id="feedback-title" className="pr-10 text-lg font-bold">
                의견 남기기
              </h2>
              <p className="mt-2 text-[15px] leading-relaxed break-keep text-ink-soft">
                쓰다가 막힌 곳이나 바라는 점을 알려 주세요.
                <br />
                보내 주신 의견은 Dots를 고치는 데 써요.
              </p>

              <div className="mt-5">
                <Choice
                  name="feedback-kind"
                  label="어떤 의견인가요?"
                  options={FEEDBACK_KINDS}
                  value={kind ?? ""}
                  onChange={(v) => {
                    setKind(v as FeedbackKind);
                    draft.kind = v as FeedbackKind;
                  }}
                />
              </div>

              <label htmlFor="feedback-message" className="mt-5 mb-1.5 block font-medium">
                내용
              </label>
              <AutoTextarea
                id="feedback-message"
                value={message}
                maxLength={FEEDBACK_MAX}
                minRows={4}
                // 창 안이라 길어지면 [보내기]가 밀려나므로 화면 높이의 35%까지만 늘린다 (2026-11-07 사용자 결정)
                maxHeight="35dvh"
                placeholder="예) 역량 연결에서 보조 역량을 어떻게 고르는지 헷갈렸어요."
                onChange={(e) => {
                  setMessage(e.target.value);
                  draft.message = e.target.value;
                }}
              />
              <p className="mt-1.5 text-right text-[13px] text-ink-faint">
                {[...message].length.toLocaleString()} / {FEEDBACK_MAX.toLocaleString()}자
              </p>
              {/* 사람 눈에 안 보이는 칸: 프로그램이 자동으로 채우면 서버가 버린다 */}
              <input
                type="text"
                name="website"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                tabIndex={-1}
                autoComplete="off"
                aria-hidden
                className="absolute -left-[9999px] size-px opacity-0"
              />

              {place && (
                <div className="mt-3 rounded-lg bg-subtle px-3 py-2.5 text-[13px] leading-relaxed text-ink-faint">
                  <p>의견과 함께 이것만 보내요</p>
                  <dl className="mt-1">
                    {placeLines(place).map(([k, v]) => (
                      <div key={k} className="flex gap-3">
                        <dt className="w-16 shrink-0">{k}</dt>
                        <dd className="font-semibold text-ink-soft">{v}</dd>
                      </div>
                    ))}
                  </dl>
                  <p className="mt-1">경험 내용(경험명·답변·원고)은 보내지 않아요.</p>
                </div>
              )}

              {send.state === "error" && (
                <div role="alert" className="mt-3 rounded-lg border border-danger/30 bg-danger-soft px-3 py-2.5 text-sm text-danger-text">
                  {send.message}
                  <div className="mt-2 flex gap-2">
                    <Button type="submit" variant="secondary" size="sm">
                      다시 보내기
                    </Button>
                    <Button type="button" variant="ghost" size="sm" onClick={() => void copyText(`[${kind}] ${trimmed}`)}>
                      내용 복사하기
                    </Button>
                  </div>
                </div>
              )}
              {coolingDown && send.state === "idle" && <p className="mt-3 text-sm text-ink-faint">방금 의견을 보냈어요. 30초 뒤에 다시 보낼 수 있어요.</p>}

              <div className="mt-6 flex flex-wrap items-center justify-end gap-x-2 gap-y-3">
                {/* [보내기]가 꺼진 이유를 늘 보인다 (역량 연결의 다음 버튼과 같은 방식, 2026-11-15) */}
                {missing && (
                  <p id="feedback-missing" className="mr-auto text-sm break-keep text-ink-faint">
                    {missing}
                  </p>
                )}
                <Button type="button" variant="secondary" size="sm" onClick={close}>
                  취소
                </Button>
                {send.state !== "error" && (
                  <Button type="submit" size="sm" disabled={!canSend} loading={send.state === "sending"} aria-describedby={missing ? "feedback-missing" : undefined}>
                    보내기
                  </Button>
                )}
              </div>
            </form>
          )}
          </div>
          {/* 오른쪽 위 닫기. 처음 키보드 위치는 지금처럼 첫 입력 칸에 두려고 글 뒤에 둔다 */}
          <button
            type="button"
            onClick={close}
            aria-label="의견 창 닫기"
            className="absolute top-2.5 right-2.5 flex size-11 cursor-pointer items-center justify-center rounded-lg text-ink-soft transition-colors duration-150 hover:bg-subtle hover:text-ink"
          >
            <X className="size-5" aria-hidden />
          </button>
        </dialog>
      )}
    </>
  );
}
