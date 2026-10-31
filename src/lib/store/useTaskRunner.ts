"use client";
// AI 작업의 진행 상태(로딩·오류)를 키별로 메모리에만 둔다. 저장하지 않으므로 새로고침하면 사라지고,
// 화면은 저장된 데이터를 보고 필요한 작업을 다시 시작한다.
import { useEffect } from "react";
import { create } from "zustand";
import { GenerateError } from "@/lib/api";

export type TaskStatus =
  | { state: "loading" }
  | { state: "error"; message: string; retryable: boolean; retry: () => void };

interface TaskStore {
  tasks: Record<string, TaskStatus | undefined>;
}

const useTaskStore = create<TaskStore>(() => ({ tasks: {} }));

const setTask = (key: string, status: TaskStatus | undefined) =>
  useTaskStore.setState((s) => ({ tasks: { ...s.tasks, [key]: status } }));

/** 같은 키의 작업이 이미 돌고 있으면 무시한다. 실패하면 오류 상태에 다시 시도 함수를 담는다. */
export async function runTask(key: string, fn: () => Promise<void>): Promise<void> {
  if (useTaskStore.getState().tasks[key]?.state === "loading") return;
  setTask(key, { state: "loading" });
  try {
    await fn();
    setTask(key, undefined);
  } catch (e) {
    console.error(e);
    const message = e instanceof Error && e.message ? e.message : "알 수 없는 오류가 났어요. 다시 시도해 주세요.";
    const retryable = e instanceof GenerateError ? e.retryable : true;
    setTask(key, { state: "error", message, retryable, retry: () => void runTask(key, fn) });
  }
}

export function useTask(key: string): TaskStatus | undefined {
  return useTaskStore((s) => s.tasks[key]);
}

/** 조건이 참이고 아직 시작하지 않았으면 작업을 자동으로 시작한다 (오류가 난 작업은 사용자가 다시 시도할 때까지 기다림) */
export function useAutoTask(key: string, when: boolean, fn: () => Promise<void>) {
  const status = useTask(key);
  useEffect(() => {
    if (when && !status) void runTask(key, fn);
    // fn은 매 렌더마다 새로 만들어지므로 의존성에서 뺀다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, when, status]);
  return status;
}
