import pptxgen from "pptxgenjs";
import { MB, FONT, SLIDE } from "./theme.mjs";

const pptxTypes = new pptxgen();
export const SHAPE = pptxTypes.ShapeType;
export const CHART = pptxTypes.ChartType;

export function addText(slide, text, x, y, w, h, options = {}) {
  slide.addText(String(text ?? ""), {
    x, y, w, h,
    fontFace: options.fontFace ?? FONT.body,
    fontSize: options.fontSize ?? 16,
    bold: options.bold ?? false,
    color: options.color ?? MB.navy,
    align: options.align ?? "left",
    valign: options.valign ?? "top",
    margin: options.margin ?? 0,
    breakLine: false,
    fit: options.fit ?? "shrink",
    isTextBox: true,
    paraSpaceAfterPt: options.paraSpaceAfterPt ?? 0,
    transparency: options.transparency,
    rotate: options.rotate
  });
}

export function addRect(slide, x, y, w, h, options = {}) {
  slide.addShape(options.shape ?? SHAPE.roundRect, {
    x, y, w, h,
    rectRadius: options.radius ?? 0.12,
    fill: { color: options.fill ?? MB.white, transparency: options.transparency ?? 0 },
    line: options.line === false
      ? { color: options.fill ?? MB.white, transparency: 100 }
      : { color: options.line ?? MB.line, width: options.lineWidth ?? 1, transparency: options.lineTransparency ?? 0 },
    shadow: options.shadow ? { type: "outer", color: "000000", opacity: 0.10, blur: 1.5, angle: 45, distance: 1 } : undefined
  });
}

export function addLine(slide, x, y, w, h = 0, color = MB.line, width = 1, dash = "solid") {
  slide.addShape(SHAPE.line, { x, y, w, h, line: { color, width, dashType: dash } });
}

export function addLogo(slide, logoPath, x = 0.58, y = 0.23, w = 0.98, h = 0.48, dark = false) {
  if (dark) addRect(slide, x - 0.08, y - 0.04, w + 0.16, h + 0.08, { fill: MB.white, line: false, radius: 0.10 });
  if (logoPath) {
    try {
      slide.addImage({ path: logoPath, x, y, w, h, sizing: "contain" });
    } catch (e) {
      addText(slide, "MB", x, y, w, h, { fontFace: FONT.head, fontSize: 20, bold: true, color: dark ? MB.white : MB.blue });
    }
  }
}

export function addFooter(slide, index, dark = false) {
  addLine(slide, SLIDE.marginX, SLIDE.footerY, 12.15, 0, dark ? "FFFFFF" : MB.line, 0.8);
  addText(slide, "MB FINANCE & BANKING TEMPLATE", SLIDE.marginX + 0.10, 7.13, 3.7, 0.18, {
    fontSize: 9, bold: true, color: dark ? MB.white : MB.gray
  });
  addText(slide, String(index).padStart(2, "0"), 12.35, 7.11, 0.35, 0.20, {
    fontFace: FONT.head, fontSize: 10, bold: true, color: dark ? MB.white : MB.blue, align: "right"
  });
}

export function addHeader(slide, { title, eyebrow, index, logoPath, dark = false }) {
  addLogo(slide, logoPath, 0.58, 0.22, 0.98, 0.48, dark);
  addText(slide, eyebrow ?? "MB PRESENTATION", 1.93, 0.27, 5.2, 0.18, {
    fontSize: 10, bold: true, color: dark ? MB.white : MB.blue
  });
  addText(slide, title ?? "[TIÊU ĐỀ SLIDE]", 1.93, 0.53, 10.1, 0.58, {
    fontFace: FONT.head, fontSize: 30, bold: true, color: dark ? MB.white : MB.navy
  });
  addFooter(slide, index, dark);
}

export function addDataNote(slide, dark = false) {
  addText(slide, "Dữ liệu minh họa", 10.55, 6.80, 2.10, 0.18, {
    fontSize: 9, color: dark ? MB.white : MB.gray, align: "right"
  });
}

export function addKpiCard(slide, { x, y, w, label, value, delta, tone = "blue" }) {
  const toneColor = tone === "green" ? MB.success : tone === "red" ? MB.red : tone === "yellow" ? MB.warning : MB.blue;
  const valueLength = String(value ?? "[XX%]").length;
  const valueFontSize = valueLength > 11 ? 18 : valueLength > 8 ? 21 : 25;
  addRect(slide, x, y, w, 1.38, { fill: MB.white, line: MB.line, shadow: true });
  addText(slide, label ?? "[KPI]", x + 0.20, y + 0.17, w - 0.40, 0.22, { fontSize: 11, bold: true, color: MB.gray });
  addText(slide, value ?? "[XX%]", x + 0.20, y + 0.53, w - 0.40, 0.40, { fontFace: FONT.head, fontSize: valueFontSize, bold: true });
  addText(slide, delta ?? "[±XX%]", x + 0.20, y + 1.07, w - 0.40, 0.18, { fontSize: 10, bold: true, color: toneColor });
}

export function addChip(slide, text, x, y, w, tone = "blue") {
  const palette = {
    blue: [MB.lightBlue, MB.blue], navy: ["E8EBF4", MB.navy], red: [MB.dangerBg, MB.red],
    green: [MB.successBg, MB.success], yellow: [MB.warningBg, "9A6500"], gray: [MB.background, "5D6478"]
  }[tone] || [MB.lightBlue, MB.blue];
  addRect(slide, x, y, w, 0.30, { fill: palette[0], line: false, radius: 0.15 });
  addText(slide, text, x + 0.04, y + 0.065, w - 0.08, 0.14, { fontSize: 9, bold: true, color: palette[1], align: "center" });
}

export function addPlaceholder(slide, label, x, y, w, h) {
  slide.addShape(SHAPE.roundRect, { x, y, w, h, rectRadius: 0.12, fill: { color: MB.pale }, line: { color: MB.gray, width: 1, dash: "dash" } });
  addText(slide, label ?? "[CHÈN HÌNH ẢNH]", x + 0.2, y + h / 2 - 0.18, w - 0.4, 0.36, { fontSize: 13, bold: true, color: MB.gray, align: "center", valign: "mid" });
}

export function safeArray(value, fallback = []) {
  return Array.isArray(value) ? value : fallback;
}

export function placeholder(val, fallback) {
  return (val && String(val).trim().length > 0) ? String(val) : fallback;
}
