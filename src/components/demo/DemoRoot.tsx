"use client";
// 시연 화면의 뿌리: 처음 열면 기본 구성(#1)으로 가상 데이터를 채우고, 위쪽 띠 + 실제와 같은 화면을 그린다.
import { useState } from "react";
import HomePage from "@/components/home/HomePage";
import AppShell from "@/components/AppShell";
import DemoBar from "./DemoBar";
import { ensureDemo } from "./demoState";

export default function DemoRoot({ screen }: { screen: "home" | "work" }) {
  // 화면을 그리기 전에 한 번만
  useState(ensureDemo);
  return (
    <>
      <DemoBar />
      {screen === "home" ? <HomePage /> : <AppShell />}
    </>
  );
}
