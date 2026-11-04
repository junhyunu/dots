"use client";
// 확인 창: 브라우저 기본 창(window.confirm) 대신 앱이 직접 그린다.
// 사파리는 한 사이트에서 기본 창이 여러 번 뜨면 막아 버려, 눌러도 아무 일이 없는 것처럼 보였다 (2026-11-01).
// 쓰는 법: if (await confirmAction({ title, body, confirmLabel, tone })) { ... }
// 창 부품(ConfirmHost)은 app/layout.tsx에 한 번만 둔다.
import { useEffect, useRef, useState } from "react";
import Button from "./Button";

export interface ConfirmOptions {
  title: string;
  body?: string;
  /** 무엇을 하는지 바로 알 수 있는 이름 (예: "삭제", "새로 만들기") */
  confirmLabel: string;
  /** danger = 지우는 일(빨간 버튼), primary = 다시 만드는 일(파란 버튼) */
  tone?: "danger" | "primary";
}

interface Request extends ConfirmOptions {
  resolve: (ok: boolean) => void;
}

let show: ((req: Request) => void) | null = null;

export function confirmAction(options: ConfirmOptions): Promise<boolean> {
  return new Promise((resolve) => {
    if (!show) return resolve(false);
    show({ ...options, resolve });
  });
}

export default function ConfirmHost() {
  const [req, setReq] = useState<Request | null>(null);
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    show = (next) => setReq((prev) => {
      prev?.resolve(false);
      return next;
    });
    return () => {
      show = null;
    };
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (req && el && !el.open) {
      el.showModal();
      // 창은 열릴 때 맨 앞 버튼에 초점을 준다. [삭제]가 앞(왼쪽)에 있어도 처음 초점은 [취소] (Enter로 실수로 지우지 않게)
      el.querySelector<HTMLButtonElement>("[data-cancel]")?.focus();
    }
  }, [req]);

  const close = (ok: boolean) => {
    req?.resolve(ok);
    setReq(null);
    ref.current?.close();
  };

  if (!req) return null;
  const danger = req.tone === "danger";
  return (
    <dialog
      ref={ref}
      aria-labelledby="confirm-title"
      aria-describedby={req.body ? "confirm-body" : undefined}
      // Esc = 취소
      onCancel={(e) => {
        e.preventDefault();
        close(false);
      }}
      // 바깥(어두운 막)을 누르면 취소
      onClick={(e) => {
        if (e.target === e.currentTarget) close(false);
      }}
      className="m-auto w-[calc(100%-2rem)] max-w-sm rounded-2xl border border-line bg-surface p-0 text-ink shadow-[0_12px_32px_-12px_rgb(0_0_0/0.35)] backdrop:bg-ink/30"
    >
      <div className="p-5 sm:p-6">
        <h2 id="confirm-title" className="text-lg font-bold break-keep">
          {req.title}
        </h2>
        {req.body && (
          <p id="confirm-body" className="mt-2 text-[15px] leading-relaxed break-keep text-ink-soft">
            {req.body}
          </p>
        )}
        {/* 지우는 창은 [삭제]를 왼쪽에 둔다 (2026-11-04 사용자 결정). 처음 초점은 어느 쪽이든 [취소] */}
        <div className="mt-6 flex justify-end gap-2">
          {danger && (
            <Button variant="danger-solid" size="sm" onClick={() => close(true)}>
              {req.confirmLabel}
            </Button>
          )}
          <Button variant="secondary" size="sm" onClick={() => close(false)} data-cancel>
            취소
          </Button>
          {!danger && (
            <Button variant="primary" size="sm" onClick={() => close(true)}>
              {req.confirmLabel}
            </Button>
          )}
        </div>
      </div>
    </dialog>
  );
}
