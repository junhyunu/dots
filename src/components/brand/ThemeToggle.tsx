"use client";
import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

export const THEME_KEY = "dots:theme";

/** 첫 화면을 그리기 전에 실행해 깜빡임 없이 테마를 정한다 (layout.tsx에 그대로 넣음) */
export const THEME_SCRIPT = `(function(){try{var t=localStorage.getItem("${THEME_KEY}");var d=t?t==="dark":matchMedia("(prefers-color-scheme: dark)").matches;var e=document.documentElement;e.classList.toggle("dark",d);e.style.colorScheme=d?"dark":"light"}catch(_){}})()`;

// large = 휴대폰 작업 화면 상단 바(아이콘 24px, 메뉴 아이콘과 맞춤). 그 밖은 20px. iconClass로 직접 정할 수도 있다(홈 PC 24px)
export default function ThemeToggle({ large = false, iconClass }: { large?: boolean; iconClass?: string }) {
  const icon = iconClass ?? (large ? "size-6" : "size-5");
  const [dark, setDark] = useState(false);
  useEffect(() => setDark(document.documentElement.classList.contains("dark")), []);

  const toggle = () => {
    const next = !dark;
    const root = document.documentElement;
    root.classList.toggle("dark", next);
    root.style.colorScheme = next ? "dark" : "light";
    try {
      localStorage.setItem(THEME_KEY, next ? "dark" : "light");
    } catch {}
    setDark(next);
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={dark ? "라이트 모드로 바꾸기" : "다크 모드로 바꾸기"}
      className="flex size-11 cursor-pointer items-center justify-center rounded-lg text-ink-soft transition-colors duration-150 hover:bg-subtle hover:text-ink"
    >
      {dark ? <Sun className={icon} aria-hidden /> : <Moon className={icon} aria-hidden />}
    </button>
  );
}
