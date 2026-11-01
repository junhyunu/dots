// 브라우저 전용: 경험 문서(STAR 원고 + 스토리)를 파일로 내려받는다. 서버로는 아무것도 보내지 않는다.
import type { ShowcaseExperience } from "@/lib/domain/showcase";
import { starDocument, starDocumentMarkdown, starDocumentText, starFileName, type StarDocument } from "@/lib/domain/starExport";

export type StarFormat = "txt" | "docx" | "md";

function save(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Word 파일은 docx 도구가 커서 버튼을 누를 때만 불러온다 */
async function toDocx(doc: StarDocument): Promise<Blob> {
  const { Document, HeadingLevel, Packer, Paragraph, TextRun } = await import("docx");
  const children = [
    new Paragraph({ heading: HeadingLevel.TITLE, children: [new TextRun(doc.title)] }),
    ...doc.meta.map(
      ([k, v]) => new Paragraph({ children: [new TextRun({ text: `${k}: `, bold: true }), new TextRun(v)] }),
    ),
  ];
  for (const s of doc.sections) {
    children.push(new Paragraph({ heading: HeadingLevel.HEADING_1, spacing: { before: 320 }, children: [new TextRun(s.heading)] }));
    s.paragraphs?.forEach((p) => children.push(new Paragraph({ children: [new TextRun(p)] })));
    s.items?.forEach((it, i) => {
      children.push(new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun(`${i + 1}. ${it.label}`)] }));
      children.push(new Paragraph({ children: [new TextRun(it.body)] }));
    });
    s.stories?.forEach((st) => {
      children.push(new Paragraph({ heading: HeadingLevel.HEADING_2, spacing: { before: 240 }, children: [new TextRun(st.heading)] }));
      st.notes.forEach((n) => children.push(new Paragraph({ children: [new TextRun({ text: n, color: "70737C", size: 20 })] })));
      if (st.subtitle) children.push(new Paragraph({ spacing: { before: 160 }, children: [new TextRun({ text: st.subtitle, bold: true })] }));
      st.paragraphs.forEach((p) => children.push(new Paragraph({ children: [new TextRun(p)] })));
    });
  }
  const file = new Document({
    creator: "Dots",
    title: doc.title,
    // 대부분의 PC에 있는 한글 글꼴
    styles: { default: { document: { run: { font: "Malgun Gothic", size: 22 }, paragraph: { spacing: { after: 120, line: 360 } } } } },
    sections: [{ children }],
  });
  return Packer.toBlob(file);
}

export async function downloadStar(item: ShowcaseExperience, format: StarFormat) {
  const doc = starDocument(item);
  const name = starFileName(doc.title, format);
  if (format === "docx") return save(await toDocx(doc), name);
  if (format === "md") return save(new Blob([starDocumentMarkdown(doc)], { type: "text/markdown;charset=utf-8" }), name);
  // TXT: 오래된 메모장 등에서 한글이 깨지지 않게 UTF-8 표시(BOM)를 붙인다
  save(new Blob(["﻿", starDocumentText(doc)], { type: "text/plain;charset=utf-8" }), name);
}
