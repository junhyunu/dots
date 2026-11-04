"use client";
// 사이드바 경험 줄의 ⋯ 버튼과 목록(이름 바꾸기·삭제). 2026-11-04 사용자 결정 (Claude 사이드바처럼)
// 목록은 사이드바의 스크롤 상자에 잘리지 않게 body에 띄우고, 화면 아래가 모자라면 위로 연다.
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Ellipsis, Pencil, Trash2 } from "lucide-react";

const MENU_W = 176;
const MENU_H = 104;

export default function ExperienceItemMenu({
  title,
  className = "",
  onRename,
  onDelete,
}: {
  title: string;
  className?: string;
  onRename: () => void;
  onDelete: () => void;
}) {
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const open = pos !== null;

  const place = () => {
    const r = btnRef.current!.getBoundingClientRect();
    const below = r.bottom + 4 + MENU_H <= window.innerHeight - 8;
    setPos({ top: below ? r.bottom + 4 : r.top - 4 - MENU_H, left: Math.max(8, Math.min(r.right - MENU_W, window.innerWidth - MENU_W - 8)) });
  };
  const close = (focusButton = true) => {
    setPos(null);
    if (focusButton) btnRef.current?.focus();
  };

  // 열리면 첫 항목에 초점, 바깥 누르기·스크롤·창 크기 바뀜 = 닫기
  useLayoutEffect(() => {
    if (open) menuRef.current?.querySelector<HTMLButtonElement>("[role=menuitem]")?.focus();
  }, [open]);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!menuRef.current?.contains(e.target as Node) && !btnRef.current?.contains(e.target as Node)) close(false);
    };
    const onMove = () => close(false);
    document.addEventListener("pointerdown", onDown);
    window.addEventListener("resize", onMove);
    document.addEventListener("scroll", onMove, true);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      window.removeEventListener("resize", onMove);
      document.removeEventListener("scroll", onMove, true);
    };
  }, [open]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    const items = [...(menuRef.current?.querySelectorAll<HTMLButtonElement>("[role=menuitem]") ?? [])];
    const i = items.indexOf(document.activeElement as HTMLButtonElement);
    if (e.key === "Escape") {
      // 서랍 메뉴 닫기(Esc)로 넘어가지 않게
      e.stopPropagation();
      e.nativeEvent.stopImmediatePropagation();
      close();
    } else if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      items[(i + (e.key === "ArrowDown" ? 1 : items.length - 1)) % items.length]?.focus();
    } else if (e.key === "Tab") close(false);
  };

  const pick = (fn: () => void) => {
    close(false);
    fn();
  };

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        aria-label={`${title} 메뉴`}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => (open ? close() : place())}
        // 목록이 열려 있는 동안은 마우스가 떠나도 보이게
        style={open ? { opacity: 1 } : undefined}
        className={`flex size-11 cursor-pointer items-center justify-center rounded-lg text-ink-soft transition-colors duration-150 hover:bg-line hover:text-ink ${className}`}
      >
        <Ellipsis className="size-4" aria-hidden />
      </button>
      {open &&
        createPortal(
          <div
            ref={menuRef}
            role="menu"
            aria-label={`${title} 메뉴`}
            onKeyDown={onKeyDown}
            style={{ top: pos.top, left: pos.left, width: MENU_W }}
            className="fixed z-50 rounded-xl border border-line bg-surface p-1.5 text-ink shadow-[0_12px_32px_-12px_rgb(0_0_0/0.35)]"
          >
            <button
              type="button"
              role="menuitem"
              onClick={() => pick(onRename)}
              className="flex min-h-11 w-full cursor-pointer items-center gap-2 rounded-lg px-3 text-left text-[15px] hover:bg-subtle focus:bg-subtle focus:outline-none"
            >
              <Pencil className="size-4 text-ink-soft" aria-hidden />
              이름 바꾸기
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={() => pick(onDelete)}
              className="flex min-h-11 w-full cursor-pointer items-center gap-2 rounded-lg px-3 text-left text-[15px] text-danger hover:bg-danger-soft focus:bg-danger-soft focus:outline-none"
            >
              <Trash2 className="size-4" aria-hidden />
              삭제
            </button>
          </div>,
          document.body,
        )}
    </>
  );
}
