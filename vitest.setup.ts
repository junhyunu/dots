// 스토어(zustand persist)가 쓰는 localStorage를 메모리로 흉내 낸다. 테스트마다 비운다.
import { beforeEach } from "vitest";

const memory = new Map<string, string>();
const storage: Storage = {
  get length() {
    return memory.size;
  },
  clear: () => memory.clear(),
  getItem: (k) => memory.get(k) ?? null,
  key: (i) => [...memory.keys()][i] ?? null,
  removeItem: (k) => void memory.delete(k),
  setItem: (k, v) => void memory.set(k, String(v)),
};
Object.defineProperty(globalThis, "localStorage", { value: storage, configurable: true });

beforeEach(() => memory.clear());
