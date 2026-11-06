import { AlertCircle, Loader2, RotateCw } from "lucide-react";
import type { TaskStatus } from "@/lib/store/useTaskRunner";
import Button from "./Button";

/** AI 작업 중 표시와 실패 안내 + 다시 시도 */
export default function TaskState({ status, loadingText }: { status: TaskStatus | undefined; loadingText: string }) {
  if (!status) return null;
  if (status.state === "loading") {
    return (
      <div role="status" className="flex items-center gap-2 rounded-xl border border-line bg-surface px-4 py-4 text-ink-soft">
        <Loader2 className="size-4 animate-spin text-primary-text" aria-hidden />
        <span>{loadingText}</span>
      </div>
    );
  }
  return (
    <div role="alert" className="rounded-xl border border-danger/30 bg-danger-soft px-4 py-3">
      <div className="flex items-start gap-2 text-danger-text">
        <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
        <p className="text-[15px]">{status.message}</p>
      </div>
      {status.retryable && (
        <div className="mt-2 pl-6">
          <Button variant="secondary" size="sm" onClick={status.retry}>
            <RotateCw className="size-4" aria-hidden />
            다시 시도
          </Button>
        </div>
      )}
    </div>
  );
}
