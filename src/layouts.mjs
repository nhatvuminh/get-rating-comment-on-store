import { MB, FONT } from "./theme.mjs";
import {
  SHAPE, CHART, addText, addRect, addLine, addLogo, addFooter, addHeader,
  addDataNote, addKpiCard, addChip, addPlaceholder, safeArray, placeholder
} from "./helpers.mjs";

const cleanChart = {
  showTitle: false,
  showLegend: false,
  showValue: false,
  showCategoryName: false,
  showPercent: false,
  showBorder: false,
  chartColors: [MB.blue, MB.blue2, "7E91FA", MB.lightBlue],
  catAxisLabelFontFace: FONT.body,
  catAxisLabelFontSize: 10,
  catAxisLabelColor: MB.gray,
  valAxisLabelFontFace: FONT.body,
  valAxisLabelFontSize: 9,
  valAxisLabelColor: MB.gray,
  valGridLine: { color: MB.line, width: 1 },
  showCatName: false,
  showSerName: false
};

function styledTableRows(rows) {
  return rows.map((row, rowIndex) => row.map((cell) => {
    const isCellObject = cell && typeof cell === "object" && Object.prototype.hasOwnProperty.call(cell, "text");
    const text = isCellObject ? cell.text : String(cell ?? "");
    const inherited = isCellObject ? (cell.options ?? {}) : {};
    const options = rowIndex === 0
      ? { fill: MB.navy, color: MB.white, bold: true, fontFace: FONT.head }
      : { fill: rowIndex % 2 === 0 ? MB.pale : MB.white, color: MB.navy };
    return { text, options: { ...inherited, ...options } };
  }));
}

// -------------------------------------------------------------
// 24 BASE LAYOUTS
// -------------------------------------------------------------

function coverLight(pptx, slide, d, ctx) {
  slide.background = { color: MB.white };
  addLogo(slide, ctx.logoPath, 0.75, 0.50, 1.55, 0.76);
  addText(slide, "TEMPLATE TÀI CHÍNH • NGÂN HÀNG", 0.75, 1.80, 5.6, 0.25, { fontSize: 13, bold: true, color: MB.blue });
  addText(slide, placeholder(d.title, "[TÊN BÁO CÁO]"), 0.75, 2.45, 6.9, 1.05, { fontFace: FONT.head, fontSize: 40, bold: true });
  addText(slide, placeholder(d.subtitle, "[ĐƠN VỊ]  •  [THỜI GIAN]"), 0.75, 4.10, 6.2, 0.35, { fontSize: 18, color: MB.gray });
  slide.addShape(SHAPE.rect, { x: 9.0, y: 0, w: 4.34, h: 7.5, fill: { color: MB.blue }, line: { color: MB.blue, transparency: 100 } });
  addRect(slide, 9.65, 1.10, 2.90, 4.85, { fill: MB.blue2, line: "6E7FFF", lineWidth: 1, radius: 0.20 });
  addText(slide, placeholder(d.mediaLabel, "[CHÈN HÌNH ẢNH]\nHOẶC KEY VISUAL"), 9.95, 3.05, 2.30, 0.65, { fontSize: 15, bold: true, color: MB.white, align: "center", valign: "mid" });
  addText(slide, placeholder(d.classification, "[BẢO MẬT / PHÂN LOẠI TÀI LIỆU]"), 0.75, 6.80, 5.3, 0.22, { fontSize: 9, color: MB.gray });
}

function coverGradient(pptx, slide, d, ctx) {
  slide.background = { color: MB.blue };
  slide.addShape(SHAPE.rect, { x: 8.7, y: 0, w: 4.63, h: 7.5, fill: { color: MB.navy, transparency: 12 }, line: { color: MB.navy, transparency: 100 } });
  addLogo(slide, ctx.logoPath, 0.75, 0.48, 1.55, 0.76, true);
  addText(slide, "TEMPLATE TÀI CHÍNH • NGÂN HÀNG", 0.75, 1.80, 5.6, 0.25, { fontSize: 13, bold: true, color: MB.white });
  addText(slide, placeholder(d.title, "[TÊN BÁO CÁO]"), 0.75, 2.45, 7.1, 1.05, { fontFace: FONT.head, fontSize: 40, bold: true, color: MB.white });
  addText(slide, placeholder(d.subtitle, "[ĐƠN VỊ]  •  [THỜI GIAN]"), 0.75, 4.12, 6.3, 0.34, { fontSize: 18, color: MB.white });
  addLine(slide, 0.75, 5.42, 5.8, 0, "FFFFFF", 1);
  addText(slide, placeholder(d.message, "[THÔNG ĐIỆP CHÍNH]"), 0.75, 5.70, 6.5, 0.34, { fontSize: 16, color: MB.white });
  addRect(slide, 9.25, 3.95, 2.75, 2.18, { fill: MB.navy, line: "7181F7", lineWidth: 1, radius: 0.20 });
}

function agenda(pptx, slide, d, ctx) {
  addHeader(slide, { title: placeholder(d.title, "[NỘI DUNG TRÌNH BÀY]"), eyebrow: "AGENDA", index: ctx.index, logoPath: ctx.logoPath });
  const items = safeArray(d.items, ["[CHỦ ĐỀ / PHẦN 01]", "[CHỦ ĐỀ / PHẦN 02]", "[CHỦ ĐỀ / PHẦN 03]", "[CHỦ ĐỀ / PHẦN 04]"]);
  items.slice(0, 4).forEach((item, i) => {
    const label = typeof item === "string" ? item : item.title;
    const desc = typeof item === "string" ? "[MÔ TẢ NGẮN]" : (item.description ?? "[MÔ TẢ NGẮN]");
    const y = 1.52 + i * 1.14;
    addText(slide, String(i + 1).padStart(2, "0"), 0.75, y, 0.62, 0.40, { fontFace: FONT.head, fontSize: 22, bold: true, color: i === 0 ? MB.red : MB.blue });
    addText(slide, label, 1.62, y, 5.8, 0.32, { fontFace: FONT.head, fontSize: 18, bold: true });
    addText(slide, desc, 1.62, y + 0.42, 5.8, 0.24, { fontSize: 12, color: MB.gray });
    addLine(slide, 1.62, y + 0.86, 6.8, 0, MB.line, 0.8);
  });
  addRect(slide, 9.25, 1.55, 2.95, 4.55, { fill: MB.lightBlue, line: false, radius: 0.18 });
  addText(slide, placeholder(d.message, "[THÔNG ĐIỆP\nĐỊNH HƯỚNG]"), 9.55, 2.95, 2.35, 0.70, { fontFace: FONT.head, fontSize: 19, bold: true, color: MB.blue, align: "center", valign: "mid" });
}

function sectionDivider(pptx, slide, d, ctx) {
  slide.background = { color: MB.navy };
  slide.addShape(SHAPE.rect, { x: 0, y: 0, w: 8.9, h: 7.5, fill: { color: MB.blue, transparency: 6 }, line: { transparency: 100 } });
  addLogo(slide, ctx.logoPath, 0.75, 0.50, 1.38, 0.67, true);
  addText(slide, placeholder(d.sectionNumber, "[01]"), 0.75, 2.05, 1.5, 0.55, { fontFace: FONT.head, fontSize: 34, bold: true, color: MB.red });
  addText(slide, placeholder(d.title, "[TIÊU ĐỀ PHẦN]"), 0.75, 2.85, 10.4, 0.78, { fontFace: FONT.head, fontSize: 38, bold: true, color: MB.white });
  addText(slide, placeholder(d.subtitle, "[MÔ TẢ NGẮN VỀ NỘI DUNG PHẦN]"), 0.75, 4.25, 8.5, 0.42, { fontSize: 17, color: MB.white });
  addLine(slide, 0.75, 5.35, 6.6, 0, "FFFFFF", 1);
  addText(slide, placeholder(d.keywords, "[TỪ KHÓA 01]  •  [TỪ KHÓA 02]  •  [TỪ KHÓA 03]"), 0.75, 5.62, 7.6, 0.25, { fontSize: 11, bold: true, color: MB.white });
  addFooter(slide, ctx.index, true);
}

function executiveSummary(pptx, slide, d, ctx) {
  addHeader(slide, { title: placeholder(d.title, "[TÓM TẮT ĐIỀU HÀNH]"), eyebrow: "EXECUTIVE SUMMARY", index: ctx.index, logoPath: ctx.logoPath });
  addRect(slide, 0.58, 1.38, 12.15, 1.15, { fill: MB.lightBlue, line: false, radius: 0.16 });
  addText(slide, placeholder(d.message, "[THÔNG ĐIỆP CHÍNH DÀNH CHO LÃNH ĐẠO]"), 0.98, 1.70, 10.7, 0.36, { fontFace: FONT.head, fontSize: 22, bold: true, color: MB.blue });
  addText(slide, placeholder(d.subtitle, "[Một câu giải thích ngắn về ý nghĩa và quyết định cần xem xét]"), 0.98, 2.12, 10.7, 0.22, { fontSize: 13 });
  const cards = safeArray(d.cards, [
    { no: "01", title: "[BỐI CẢNH]", body: "[Tóm tắt dữ liệu, xu hướng hoặc sự kiện quan trọng]" },
    { no: "02", title: "[TÁC ĐỘNG]", body: "[Ý nghĩa đối với kinh doanh, khách hàng hoặc vận hành]" },
    { no: "03", title: "[KHUYẾN NGHỊ]", body: "[Hành động ưu tiên, quyết định hoặc bước tiếp theo]" }
  ]);
  cards.slice(0, 3).forEach((c, i) => {
    const x = 0.58 + i * 4.08;
    addRect(slide, x, 2.95, 3.75, 3.05, { fill: MB.white, line: MB.line, radius: 0.14 });
    addText(slide, c.no ?? String(i + 1).padStart(2, "0"), x + 0.30, 3.25, 0.50, 0.30, { fontFace: FONT.head, fontSize: 18, bold: true, color: i === 2 ? MB.red : MB.blue });
    addText(slide, c.title ?? "[TIÊU ĐỀ]", x + 0.30, 3.75, 3.08, 0.36, { fontFace: FONT.head, fontSize: 17, bold: true });
    addText(slide, c.body ?? "[MÔ TẢ]", x + 0.30, 4.32, 3.08, 0.90, { fontSize: 14, color: MB.gray });
    addLine(slide, x + 0.30, 5.46, 1.28, 0, i === 2 ? MB.red : MB.blue, 2);
  });
}

function keyMessage(pptx, slide, d, ctx) {
  addHeader(slide, { title: placeholder(d.title, "[THÔNG ĐIỆP TRỌNG TÂM]"), eyebrow: "KEY MESSAGE", index: ctx.index, logoPath: ctx.logoPath });
  addText(slide, "“", 0.65, 1.65, 0.55, 0.55, { fontFace: FONT.head, fontSize: 38, bold: true, color: MB.red });
  addText(slide, placeholder(d.message, "[MỘT THÔNG ĐIỆP CHÍNH RÕ RÀNG, NGẮN GỌN VÀ CÓ THỂ HÀNH ĐỘNG]"), 1.30, 1.70, 7.3, 1.70, { fontFace: FONT.head, fontSize: 26, bold: true });
  addLine(slide, 1.30, 3.74, 7.2, 0, MB.blue, 2.2);
  addText(slide, placeholder(d.insightTitle, "[INSIGHT TỪ DỮ LIỆU]"), 1.30, 4.15, 4.0, 0.30, { fontFace: FONT.head, fontSize: 17, bold: true, color: MB.blue });
  addText(slide, placeholder(d.body, "[Mô tả ngắn bằng 1–2 câu để làm rõ thông điệp và bối cảnh]"), 1.30, 4.64, 7.1, 0.60, { fontSize: 14, color: MB.gray });
  addRect(slide, 9.58, 1.48, 2.50, 4.10, { fill: MB.navy, line: false, radius: 0.18 });
  addText(slide, placeholder(d.value, "[XX%]"), 9.85, 2.55, 1.96, 0.65, { fontFace: FONT.head, fontSize: 31, bold: true, color: MB.white, align: "center" });
  addText(slide, placeholder(d.valueLabel, "[CHỈ SỐ NỔI BẬT]"), 9.85, 3.38, 1.96, 0.42, { fontSize: 13, bold: true, color: MB.white, align: "center" });
  addDataNote(slide);
}

function kpiOverview(pptx, slide, d, ctx) {
  addHeader(slide, { title: placeholder(d.title, "[TỔNG QUAN CHỈ SỐ]"), eyebrow: "KPI OVERVIEW", index: ctx.index, logoPath: ctx.logoPath });
  const kpis = safeArray(d.kpis, [
    { label: "[KPI 01]", value: "[XX%]", delta: "[±XX%]", tone: "green" },
    { label: "[KPI 02]", value: "[XXX TỶ]", delta: "[±XX%]", tone: "blue" },
    { label: "[KPI 03]", value: "[XX.X]", delta: "[±X.X điểm]", tone: "red" },
    { label: "[KPI 04]", value: "[XXX]", delta: "[±XX]", tone: "yellow" }
  ]);
  kpis.slice(0, 4).forEach((k, i) => addKpiCard(slide, { x: 0.58 + i * 2.86, y: 1.42, w: 2.62, ...k }));
  addRect(slide, 0.58, 3.18, 12.15, 2.90, { fill: MB.white, line: MB.line, radius: 0.16 });
  addText(slide, placeholder(d.insightTitle, "[INSIGHT TỪ DỮ LIỆU]"), 0.98, 3.58, 4.0, 0.34, { fontFace: FONT.head, fontSize: 19, bold: true });
  addText(slide, placeholder(d.body, "[Viết 1 câu về xu hướng chính, 1 câu về nguyên nhân và 1 câu về hành động ưu tiên]"), 0.98, 4.10, 4.7, 0.90, { fontSize: 15, color: MB.gray });
  addLine(slide, 6.35, 3.60, 0, 1.95, MB.line, 1);
  addText(slide, "[MỤC TIÊU KỲ TỚI]", 6.72, 3.58, 3.0, 0.34, { fontFace: FONT.head, fontSize: 19, bold: true });
  safeArray(d.targets, ["[MỤC TIÊU 01]", "[MỤC TIÊU 02]", "[MỤC TIÊU 03]"]).slice(0, 3).forEach((t, i) => {
    addRect(slide, 6.72, 4.08 + i * 0.56, 0.30, 0.30, { shape: SHAPE.ellipse, fill: i === 0 ? MB.blue : MB.lightBlue, line: false });
    addText(slide, t, 7.22, 4.07 + i * 0.56, 4.55, 0.30, { fontSize: 14 });
  });
  addDataNote(slide);
}

function financialDashboard(pptx, slide, d, ctx) {
  slide.background = { color: MB.background };
  addHeader(slide, { title: placeholder(d.title, "[HIỆU QUẢ TÀI CHÍNH & KINH DOANH]"), eyebrow: "FINANCIAL DASHBOARD", index: ctx.index, logoPath: ctx.logoPath });
  const kpis = safeArray(d.kpis, [
    { label: "[DOANH THU]", value: "[XXX TỶ]", delta: "[+XX% YoY]", tone: "green" },
    { label: "[CHI PHÍ]", value: "[XXX TỶ]", delta: "[±XX% YoY]", tone: "red" },
    { label: "[LỢI NHUẬN]", value: "[XXX TỶ]", delta: "[+XX% YoY]", tone: "blue" },
    { label: "[BIÊN LỢI NHUẬN]", value: "[XX.X%]", delta: "[±X.X điểm %]", tone: "yellow" }
  ]);
  kpis.slice(0, 4).forEach((k, i) => addKpiCard(slide, { x: 0.58 + i * 2.86, y: 1.35, w: 2.62, ...k }));
  addRect(slide, 0.58, 3.05, 7.50, 3.05, { fill: MB.white, line: MB.line, radius: 0.15 });
  addText(slide, placeholder(d.chartTitle, "[XU HƯỚNG DOANH THU]"), 0.92, 3.35, 3.4, 0.30, { fontFace: FONT.head, fontSize: 16, bold: true });
  const chart = d.chart ?? { categories: ["T1", "T2", "T3", "T4", "T5", "T6"], values: [48, 56, 53, 67, 73, 82] };
  slide.addChart(CHART.line, [{ name: "[CHỈ SỐ]", labels: chart.categories, values: chart.values }], {
    x: 0.92, y: 3.78, w: 6.75, h: 1.95, ...cleanChart, showLegend: false, lineSize: 2.5,
    chartColors: [MB.blue], showValue: false, showCatName: false, showTitle: false
  });
  addRect(slide, 8.28, 3.05, 3.85, 3.05, { fill: MB.white, line: MB.line, radius: 0.15 });
  addText(slide, "[ĐIỂM CẦN LƯU Ý]", 8.62, 3.35, 2.9, 0.30, { fontFace: FONT.head, fontSize: 16, bold: true });
  safeArray(d.insights, ["[INSIGHT / RỦI RO 01]", "[INSIGHT / CƠ HỘI 02]", "[HÀNH ĐỘNG ƯU TIÊN]"]).slice(0, 3).forEach((t, i) => {
    addChip(slide, String(i + 1).padStart(2, "0"), 8.62, 3.92 + i * 0.68, 0.50, i === 0 ? "red" : i === 1 ? "green" : "blue");
    addText(slide, t, 9.30, 3.94 + i * 0.68, 2.35, 0.36, { fontSize: 13, bold: true });
  });
  addDataNote(slide);
}

function trend(pptx, slide, d, ctx) {
  addHeader(slide, { title: placeholder(d.title, "[XU HƯỚNG THEO THỜI GIAN]"), eyebrow: "TREND ANALYSIS", index: ctx.index, logoPath: ctx.logoPath });
  addText(slide, placeholder(d.insightTitle, "[INSIGHT TỪ DỮ LIỆU]"), 0.68, 1.38, 6.2, 0.36, { fontFace: FONT.head, fontSize: 19, bold: true });
  addText(slide, placeholder(d.body, "[Mô tả điểm chuyển, xu hướng và nguyên nhân cần chú ý]"), 0.68, 1.82, 6.8, 0.26, { fontSize: 13, color: MB.gray });
  addRect(slide, 0.58, 2.25, 8.50, 3.78, { fill: MB.white, line: MB.line, radius: 0.15 });
  const chart = d.chart ?? { categories: ["T1", "T2", "T3", "T4", "T5", "T6", "T7", "T8"], series: [{ name: "[CHỈ SỐ A]", values: [42, 48, 45, 52, 61, 64, 70, 78] }, { name: "[CHỈ SỐ B]", values: [38, 41, 47, 49, 53, 58, 60, 65] }] };
  slide.addChart(CHART.line, chart.series.map(s => ({ name: s.name, labels: chart.categories, values: s.values })), {
    x: 0.95, y: 2.65, w: 7.70, h: 2.80, ...cleanChart, showLegend: true, legendPos: "b", lineSize: 2.5,
    chartColors: [MB.blue, MB.gray]
  });
  addRect(slide, 9.38, 2.25, 2.75, 3.78, { fill: MB.lightBlue, line: false, radius: 0.15 });
  addText(slide, "[MỐC QUAN TRỌNG]", 9.72, 2.65, 2.05, 0.52, { fontFace: FONT.head, fontSize: 17, bold: true, color: MB.blue });
  safeArray(d.milestones, ["[MỐC 01]", "[MỐC 02]", "[MỐC 03]"]).slice(0, 3).forEach((m, i) => {
    addText(slide, String(i + 1).padStart(2, "0"), 9.72, 3.34 + i * 0.78, 0.45, 0.25, { fontFace: FONT.head, fontSize: 13, bold: true, color: i === 1 ? MB.red : MB.blue });
    addText(slide, m, 10.36, 3.34 + i * 0.78, 1.42, 0.38, { fontSize: 13, bold: true });
  });
  addDataNote(slide);
}

function planActual(pptx, slide, d, ctx) {
  addHeader(slide, { title: placeholder(d.title, "[KẾ HOẠCH SO VỚI THỰC TẾ]"), eyebrow: "PLAN VS ACTUAL", index: ctx.index, logoPath: ctx.logoPath });
  addRect(slide, 0.58, 1.40, 8.24, 4.60, { fill: MB.white, line: MB.line, radius: 0.15 });
  const chart = d.chart ?? { categories: ["Q1", "Q2", "Q3", "Q4"], plan: [70, 78, 88, 96], actual: [66, 82, 84, 91] };
  slide.addChart(CHART.bar, [
    { name: "Kế hoạch", labels: chart.categories, values: chart.plan },
    { name: "Thực tế", labels: chart.categories, values: chart.actual }
  ], { x: 0.92, y: 1.90, w: 7.55, h: 3.48, ...cleanChart, catAxisLabelRotate: 0, showLegend: true, legendPos: "b", chartColors: [MB.lightBlue, MB.blue], showValue: true, dataLabelPosition: "outEnd" });
  addRect(slide, 9.10, 1.40, 3.03, 4.60, { fill: MB.background, line: false, radius: 0.15 });
  addText(slide, "[CHÊNH LỆCH]", 9.47, 1.80, 2.3, 0.30, { fontFace: FONT.head, fontSize: 16, bold: true });
  addText(slide, placeholder(d.variance, "[±XX%]"), 9.47, 2.30, 2.3, 0.60, { fontFace: FONT.head, fontSize: 32, bold: true, color: MB.red });
  addText(slide, "[NGUYÊN NHÂN]", 9.47, 3.22, 2.1, 0.28, { fontSize: 14, bold: true });
  addText(slide, placeholder(d.cause, "[Mô tả ngắn nguyên nhân chính]"), 9.47, 3.66, 2.2, 0.66, { fontSize: 13, color: MB.gray });
  addText(slide, "[HÀNH ĐỘNG]", 9.47, 4.62, 2.1, 0.28, { fontSize: 14, bold: true });
  addText(slide, placeholder(d.action, "[Bước tiếp theo để thu hẹp khoảng cách]"), 9.47, 5.02, 2.2, 0.60, { fontSize: 13, color: MB.gray });
  addDataNote(slide);
}

function composition(pptx, slide, d, ctx) {
  addHeader(slide, { title: placeholder(d.title, "[CƠ CẤU TỶ TRỌNG & PHÂN BỔ]"), eyebrow: "COMPOSITION", index: ctx.index, logoPath: ctx.logoPath });
  addRect(slide, 0.58, 1.42, 6.12, 4.55, { fill: MB.pale, line: false, radius: 0.15 });
  const chart = d.chart ?? { labels: ["[NHÓM A]", "[NHÓM B]", "[NHÓM C]", "[NHÓM D]"], values: [42, 28, 18, 12] };
  slide.addChart(CHART.doughnut, [{ name: "Tỷ trọng", labels: chart.labels, values: chart.values }], {
    x: 1.05, y: 1.83, w: 5.20, h: 3.55, ...cleanChart, showLegend: true, legendPos: "b", showPercent: true,
    holeSize: 62, chartColors: [MB.blue, MB.blue2, "7E91FA", MB.lightBlue]
  });
  addText(slide, placeholder(d.insightTitle, "[INSIGHT TỪ CƠ CẤU]"), 7.18, 1.64, 4.55, 0.42, { fontFace: FONT.head, fontSize: 21, bold: true });
  addText(slide, placeholder(d.body, "[Mô tả nhóm chiếm tỷ trọng lớn, thay đổi đáng chú ý và hàm ý quản trị]"), 7.18, 2.20, 4.45, 0.65, { fontSize: 15, color: MB.gray });
  chart.labels.slice(0, 4).forEach((label, i) => {
    const colors = [MB.blue, MB.blue2, "7E91FA", MB.lightBlue];
    addRect(slide, 7.18, 3.22 + i * 0.58, 0.18, 0.18, { shape: SHAPE.rect, fill: colors[i], line: false, radius: 0.03 });
    addText(slide, label, 7.58, 3.17 + i * 0.58, 2.2, 0.28, { fontSize: 14 });
    addText(slide, `[${chart.values[i]}%]`, 10.90, 3.17 + i * 0.58, 0.88, 0.28, { fontFace: FONT.head, fontSize: 14, bold: true, align: "right" });
  });
  addDataNote(slide);
}

function dataTable(pptx, slide, d, ctx) {
  addHeader(slide, { title: placeholder(d.title, "[BẢNG DỮ LIỆU TÀI CHÍNH CHI TIẾT]"), eyebrow: "DATA TABLE", index: ctx.index, logoPath: ctx.logoPath });
  addText(slide, placeholder(d.unit, "[ĐƠN VỊ: TỶ VND / % / SỐ LƯỢNG]"), 0.68, 1.25, 5.0, 0.20, { fontSize: 9, color: MB.gray });
  const rows = safeArray(d.rows, [
    ["[CHỈ TIÊU]", "[KỲ TRƯỚC]", "[KỲ NÀY]", "[KẾ HOẠCH]", "[CHÊNH LỆCH]", "[GHI CHÚ]"],
    ["[CHỈ TIÊU 01]", "[XXX]", "[XXX]", "[XXX]", "[±XX%]", "[GHI CHÚ]"],
    ["[CHỈ TIÊU 02]", "[XXX]", "[XXX]", "[XXX]", "[±XX%]", "[GHI CHÚ]"],
    ["[CHỈ TIÊU 03]", "[XXX]", "[XXX]", "[XXX]", "[±XX%]", "[GHI CHÚ]"],
    ["[CHỈ TIÊU 04]", "[XXX]", "[XXX]", "[XXX]", "[±XX%]", "[GHI CHÚ]"],
    ["[CHỈ TIÊU 05]", "[XXX]", "[XXX]", "[XXX]", "[±XX%]", "[GHI CHÚ]"]
  ]);
  slide.addTable(styledTableRows(rows), {
    x: 0.58, y: 1.62, w: 12.15, h: 3.95,
    colW: [3.10, 1.52, 1.52, 1.52, 1.55, 2.94],
    rowH: 0.62, border: { type: "solid", color: MB.line, pt: 1 },
    fontFace: FONT.body, fontSize: 14, color: MB.navy, margin: 0.10,
    fill: MB.white, autoFit: false,
    bold: false
  });
  addRect(slide, 0.58, 5.80, 12.15, 0.70, { fill: MB.lightBlue, line: false, radius: 0.10 });
  addText(slide, "[INSIGHT TỪ DỮ LIỆU]", 0.88, 6.02, 2.45, 0.25, { fontSize: 14, bold: true, color: MB.blue });
  addText(slide, placeholder(d.insight, "[Tóm tắt xu hướng, ngoại lệ và điểm cần hành động]"), 3.55, 6.02, 7.9, 0.25, { fontSize: 13 });
  addDataNote(slide);
}

function comparison(pptx, slide, d, ctx) {
  addHeader(slide, { title: placeholder(d.title, "[SO SÁNH SẢN PHẨM / ĐỐI THỦ]"), eyebrow: "COMPARISON", index: ctx.index, logoPath: ctx.logoPath });
  const rows = safeArray(d.rows, [
    ["[TIÊU CHÍ]", "[MB / SẢN PHẨM A]", "[ĐỐI TƯỢNG B]", "[ĐỐI TƯỢNG C]"],
    ["[TIÊU CHÍ 01]", "[MÔ TẢ]", "[MÔ TẢ]", "[MÔ TẢ]"],
    ["[TIÊU CHÍ 02]", "[MÔ TẢ]", "[MÔ TẢ]", "[MÔ TẢ]"],
    ["[TIÊU CHÍ 03]", "[MÔ TẢ]", "[MÔ TẢ]", "[MÔ TẢ]"],
    ["[TIÊU CHÍ 04]", "[MÔ TẢ]", "[MÔ TẢ]", "[MÔ TẢ]"],
    ["[TIÊU CHÍ 05]", "[MÔ TẢ]", "[MÔ TẢ]", "[MÔ TẢ]"]
  ]);
  slide.addTable(styledTableRows(rows), { x: 0.58, y: 1.55, w: 12.15, h: 4.05, colW: [3.60, 3.20, 2.67, 2.68], rowH: 0.65, border: { type: "solid", color: MB.line, pt: 1 }, fontFace: FONT.body, fontSize: 14, color: MB.navy, margin: 0.10, fill: MB.white });
  addRect(slide, 0.58, 5.82, 12.15, 0.65, { fill: MB.navy, line: false, radius: 0.10 });
  addText(slide, "[KẾT LUẬN SO SÁNH]", 0.90, 6.02, 2.8, 0.25, { fontSize: 14, bold: true, color: MB.white });
  addText(slide, placeholder(d.conclusion, "[Điểm khác biệt chính và hàm ý cho quyết định]"), 3.72, 6.02, 7.8, 0.25, { fontSize: 13, color: MB.white });
}

function cxDashboard(pptx, slide, d, ctx) {
  slide.background = { color: MB.background };
  addHeader(slide, { title: placeholder(d.title, "[TỔNG QUAN CX / VOC]"), eyebrow: "CUSTOMER EXPERIENCE", index: ctx.index, logoPath: ctx.logoPath });
  const kpis = safeArray(d.kpis, [
    { label: "[CSAT / RATING]", value: "[X.X/5]", delta: "[±X.X]", tone: "green" },
    { label: "[NPS]", value: "[XX]", delta: "[±X điểm]", tone: "blue" },
    { label: "[TỶ LỆ LỖI]", value: "[XX%]", delta: "[±XX%]", tone: "red" },
    { label: "[PHẢN HỒI KH]", value: "[XXX]", delta: "[±XX%]", tone: "yellow" }
  ]);
  kpis.slice(0, 4).forEach((k, i) => addKpiCard(slide, { x: 0.58 + i * 2.86, y: 1.36, w: 2.62, ...k }));
  addRect(slide, 0.58, 3.12, 5.62, 2.96, { fill: MB.white, line: MB.line, radius: 0.15 });
  addText(slide, "[CƠ CẤU PHẢN HỒI]", 0.92, 3.42, 2.6, 0.28, { fontFace: FONT.head, fontSize: 16, bold: true });
  const sentiment = d.sentiment ?? { labels: ["Tích cực", "Trung tính", "Tiêu cực"], values: [58, 26, 16] };
  slide.addChart(CHART.doughnut, [{ name: "VOC", labels: sentiment.labels, values: sentiment.values }], { x: 0.90, y: 3.82, w: 4.95, h: 1.85, ...cleanChart, showLegend: true, legendPos: "r", showPercent: true, holeSize: 64, chartColors: [MB.success, MB.gray, MB.red] });
  addRect(slide, 6.42, 3.12, 5.70, 2.96, { fill: MB.white, line: MB.line, radius: 0.15 });
  addText(slide, "[CHỦ ĐỀ VOC NỔI BẬT]", 6.76, 3.42, 3.0, 0.28, { fontFace: FONT.head, fontSize: 16, bold: true });
  const topics = d.topics ?? { labels: ["[CHỦ ĐỀ A]", "[CHỦ ĐỀ B]", "[CHỦ ĐỀ C]", "[CHỦ ĐỀ D]"], values: [76, 58, 41, 26] };
  slide.addChart(CHART.bar, [{ name: "Số lượng", labels: topics.labels, values: topics.values }], { x: 6.74, y: 3.84, w: 4.95, h: 1.80, ...cleanChart, barDir: "bar", showValue: true, dataLabelPosition: "outEnd", chartColors: [MB.blue] });
  addDataNote(slide);
}

function funnel(pptx, slide, d, ctx) {
  addHeader(slide, { title: placeholder(d.title, "[HÀNH TRÌNH KHÁCH HÀNG / FUNNEL]"), eyebrow: "CUSTOMER JOURNEY", index: ctx.index, logoPath: ctx.logoPath });
  addText(slide, placeholder(d.goal, "[MỤC TIÊU HÀNH TRÌNH]"), 0.68, 1.36, 5.2, 0.34, { fontFace: FONT.head, fontSize: 18, bold: true });
  addText(slide, placeholder(d.subtitle, "[Mô tả ngắn mục tiêu, đối tượng và phạm vi đo lường]"), 0.68, 1.78, 7.0, 0.26, { fontSize: 13, color: MB.gray });
  const stages = safeArray(d.stages, ["[NHẬN BIẾT]", "[TRUY CẬP]", "[BẮT ĐẦU]", "[HOÀN TẤT]", "[QUAY LẠI]"]);
  const widths = [10.9, 9.4, 7.9, 6.4, 4.9];
  const colors = [MB.navy, MB.blue, MB.blue2, "7E91FA", MB.lightBlue];
  stages.slice(0, 5).forEach((s, i) => {
    const w = widths[i], x = 0.58 + (10.9 - w) / 2, y = 2.35 + i * 0.69;
    slide.addShape(SHAPE.chevron, { x, y, w, h: 0.54, fill: { color: colors[i] }, line: { transparency: 100 } });
    addText(slide, String(i + 1).padStart(2, "0"), x + 0.35, y + 0.13, 0.40, 0.20, { fontFace: FONT.head, fontSize: 11, bold: true, color: i < 4 ? MB.white : MB.blue });
    addText(slide, typeof s === "string" ? s : s.label, x + 1.02, y + 0.11, 3.0, 0.22, { fontSize: 13, bold: true, color: i < 4 ? MB.white : MB.navy });
    addText(slide, typeof s === "string" ? "[XX%]" : (s.value ?? "[XX%]"), x + w - 1.45, y + 0.10, 0.95, 0.24, { fontFace: FONT.head, fontSize: 14, bold: true, color: i < 4 ? MB.white : MB.blue, align: "right" });
  });
  addText(slide, "[ĐIỂM RƠI LỚN NHẤT]", 9.75, 5.95, 2.2, 0.24, { fontSize: 11, bold: true, color: MB.red, align: "right" });
  addText(slide, "[NGUYÊN NHÂN]", 9.75, 6.34, 2.2, 0.22, { fontSize: 11, color: MB.gray, align: "right" });
  addDataNote(slide);
}

function problemSolution(pptx, slide, d, ctx) {
  addHeader(slide, { title: placeholder(d.title, "[VẤN ĐỀ → DỮ LIỆU → GIẢI PHÁP]"), eyebrow: "STRUCTURED RECOMMENDATION", index: ctx.index, logoPath: ctx.logoPath });
  const cards = [
    { no: "01", title: "[VẤN ĐỀ]", body: d.problem ?? "[Mô tả vấn đề, đối tượng bị ảnh hưởng và bối cảnh]", fill: MB.dangerBg, tone: MB.red },
    { no: "02", title: "[SỐ LIỆU CHỨNG MINH]", body: d.evidence ?? "[XX%]\n[INSIGHT TỪ DỮ LIỆU]", fill: MB.lightBlue, tone: MB.blue },
    { no: "03", title: "[GIẢI PHÁP]", body: d.solution ?? "[Mô tả giải pháp, tác động kỳ vọng và bước tiếp theo]", fill: MB.successBg, tone: MB.success }
  ];
  addLine(slide, 4.32, 3.65, 0.34, 0, MB.gray, 1.5); addLine(slide, 8.40, 3.65, 0.34, 0, MB.gray, 1.5);
  cards.forEach((c, i) => {
    const x = 0.58 + i * 4.08;
    addRect(slide, x, 1.60, 3.75, 4.12, { fill: c.fill, line: c.tone, lineWidth: 0.8, radius: 0.16 });
    addText(slide, c.no, x + 0.34, 1.98, 0.50, 0.30, { fontFace: FONT.head, fontSize: 18, bold: true, color: c.tone });
    addText(slide, c.title, x + 0.34, 2.48, 3.08, 0.54, { fontFace: FONT.head, fontSize: 18, bold: true });
    addText(slide, c.body, x + 0.34, 3.25, 3.08, 1.40, { fontFace: i === 1 ? FONT.head : FONT.body, fontSize: i === 1 ? 21 : 14, bold: i === 1, color: i === 1 ? MB.blue : MB.gray });
    addText(slide, i === 0 ? "[NGUYÊN NHÂN]" : i === 1 ? "Dữ liệu minh họa" : "[HÀNH ĐỘNG]", x + 0.34, 5.15, 2.25, 0.24, { fontSize: 10, bold: true, color: c.tone });
  });
}

function processFlow(pptx, slide, d, ctx) {
  addHeader(slide, { title: placeholder(d.title, "[QUY TRÌNH NGHIỆP VỤ NGÂN HÀNG]"), eyebrow: "PROCESS FLOW", index: ctx.index, logoPath: ctx.logoPath });
  addText(slide, placeholder(d.subtitle, "[MÔ TẢ PHẠM VI QUY TRÌNH VÀ ĐIỂM BẮT ĐẦU / KẾT THÚC]"), 0.68, 1.34, 8.8, 0.28, { fontSize: 13, color: MB.gray });
  const steps = safeArray(d.steps, ["[BƯỚC 01]", "[BƯỚC 02]", "[BƯỚC 03]", "[BƯỚC 04]", "[KẾT QUẢ]"]);
  for (let i = 0; i < 4; i++) addLine(slide, 2.55 + i * 2.45, 3.38, 0.48, 0, MB.blue, 1.5);
  steps.slice(0, 5).forEach((s, i) => {
    const x = 0.58 + i * 2.45;
    addRect(slide, x, 2.60, 1.98, 1.58, { fill: i === 4 ? MB.blue : MB.pale, line: i === 4 ? MB.blue : MB.line, radius: 0.14 });
    addText(slide, String(i + 1).padStart(2, "0"), x + 0.30, 2.92, 0.48, 0.24, { fontFace: FONT.head, fontSize: 13, bold: true, color: i === 4 ? MB.white : MB.blue });
    addText(slide, typeof s === "string" ? s : s.label, x + 0.30, 3.35, 1.42, 0.35, { fontFace: FONT.head, fontSize: 15, bold: true, color: i === 4 ? MB.white : MB.navy });
    addText(slide, typeof s === "string" ? "[ĐƠN VỊ]" : (s.owner ?? "[ĐƠN VỊ]"), x + 0.30, 3.84, 1.42, 0.22, { fontSize: 10, color: i === 4 ? MB.white : MB.gray });
  });
  addRect(slide, 0.58, 4.75, 11.80, 1.16, { fill: MB.lightBlue, line: false, radius: 0.12 });
  addText(slide, "[ĐIỂM KIỂM SOÁT / SLA / RỦI RO]", 0.92, 5.08, 5.6, 0.30, { fontFace: FONT.head, fontSize: 16, bold: true, color: MB.blue });
  addText(slide, placeholder(d.control, "[Mô tả điểm kiểm soát, thời gian xử lý, điều kiện và ngoại lệ]"), 0.92, 5.55, 10.2, 0.28, { fontSize: 13 });
}

function riskMatrix(pptx, slide, d, ctx) {
  addHeader(slide, { title: placeholder(d.title, "[MA TRẬN RỦI RO / HEATMAP]"), eyebrow: "RISK MANAGEMENT", index: ctx.index, logoPath: ctx.logoPath });
  const values = [
    ["", "1 — Thấp", "2", "3", "4 — Cao"],
    ["4 — Cao", "R4", "R5", "R7", "R9"],
    ["3", "R3", "R4", "R6", "R8"],
    ["2", "R2", "R3", "R5", "R7"],
    ["1 — Thấp", "R1", "R2", "R3", "R4"]
  ];
  const fills = [MB.warningBg, MB.warningBg, MB.dangerBg, MB.dangerBg, MB.successBg, MB.warningBg, MB.warningBg, MB.dangerBg, MB.successBg, MB.successBg, MB.warningBg, MB.warningBg, MB.successBg, MB.successBg, MB.successBg, MB.warningBg];
  const rows = values.map((row, r) => row.map((v, c) => {
    if (r === 0) return { text: v, options: { fill: MB.navy, color: MB.white, bold: true } };
    if (c === 0) return { text: v, options: { fill: r % 2 ? MB.white : MB.pale, color: MB.navy } };
    return { text: v, options: { fill: fills[(r - 1) * 4 + (c - 1)], color: fills[(r - 1) * 4 + (c - 1)] === MB.dangerBg ? MB.red : MB.navy, bold: true } };
  }));
  slide.addTable(rows, { x: 1.82, y: 1.62, w: 7.52, h: 4.25, colW: [1.72, 1.45, 1.45, 1.45, 1.45], rowH: 0.83, border: { type: "solid", color: MB.navy, pt: 0.8 }, fontFace: FONT.body, fontSize: 13, margin: 0.10 });
  addText(slide, "TÁC ĐỘNG →", 4.42, 1.35, 2.6, 0.20, { fontSize: 10, bold: true, color: MB.gray, align: "center" });
  addText(slide, "XÁC SUẤT", 0.78, 3.34, 0.85, 0.24, { fontSize: 10, bold: true, color: MB.gray, rotate: 270 });
  addRect(slide, 9.68, 1.62, 2.44, 4.25, { fill: MB.pale, line: MB.line, radius: 0.14 });
  addText(slide, "[RỦI RO ƯU TIÊN]", 10.02, 1.96, 1.78, 0.48, { fontFace: FONT.head, fontSize: 15, bold: true });
  ["R9", "R8", "R7"].forEach((r, i) => { addChip(slide, r, 10.02, 2.62 + i * 0.82, 0.56, i === 0 ? "red" : "yellow"); addText(slide, `[RỦI RO 0${i + 1}]`, 10.78, 2.62 + i * 0.82, 0.96, 0.38, { fontSize: 12, bold: true }); });
  addText(slide, "[BIỆN PHÁP KIỂM SOÁT]", 10.02, 5.20, 1.80, 0.34, { fontSize: 11, bold: true, color: MB.blue });
  addDataNote(slide);
}

function roadmap(pptx, slide, d, ctx) {
  addHeader(slide, { title: placeholder(d.title, "[ROADMAP / KẾ HOẠCH TRIỂN KHAI]"), eyebrow: "PROJECT ROADMAP", index: ctx.index, logoPath: ctx.logoPath });
  addText(slide, placeholder(d.subtitle, "[MỤC TIÊU ROADMAP VÀ PHẠM VI THỰC HIỆN]"), 0.68, 1.34, 8.7, 0.24, { fontSize: 13, color: MB.gray });
  addLine(slide, 1.22, 3.35, 10.82, 0, MB.line, 3.5);
  const phases = safeArray(d.phases, ["GIAI ĐOẠN 01", "GIAI ĐOẠN 02", "GIAI ĐOẠN 03", "GIAI ĐOẠN 04"]);
  phases.slice(0, 4).forEach((p, i) => {
    const x = 0.58 + i * 3.04;
    addRect(slide, x + 0.96, 3.10, 0.50, 0.50, { shape: SHAPE.ellipse, fill: i === 0 ? MB.red : MB.blue, line: MB.white, lineWidth: 2.5 });
    const y = i % 2 === 0 ? 1.75 : 3.95;
    addRect(slide, x, y, 2.55, 1.30, { fill: i === 0 ? MB.lightBlue : MB.pale, line: i === 0 ? MB.blue : MB.line, radius: 0.14 });
    addText(slide, typeof p === "string" ? p : p.title, x + 0.28, y + 0.25, 2.05, 0.26, { fontFace: FONT.head, fontSize: 14, bold: true });
    addText(slide, typeof p === "string" ? "[THỜI GIAN]" : (p.time ?? "[THỜI GIAN]"), x + 0.28, y + 0.61, 2.05, 0.22, { fontSize: 10, bold: true, color: i === 0 ? MB.red : MB.blue });
    addText(slide, typeof p === "string" ? "[MỤC TIÊU]\n[HẠNG MỤC CHÍNH]" : (p.body ?? "[MỤC TIÊU]\n[HẠNG MỤC CHÍNH]"), x + 0.28, y + 0.91, 2.05, 0.34, { fontSize: 10, color: MB.gray });
  });
  addRect(slide, 0.58, 5.72, 12.15, 0.68, { fill: MB.navy, line: false, radius: 0.10 });
  addText(slide, placeholder(d.decision, "[MỐC QUYẾT ĐỊNH / PHỤ THUỘC QUAN TRỌNG]"), 0.92, 5.94, 8.5, 0.26, { fontSize: 14, bold: true, color: MB.white });
}

function uiShowcase(pptx, slide, d, ctx) {
  addHeader(slide, { title: placeholder(d.title, "[TRÌNH BÀY SẢN PHẨM / GIAO DIỆN]"), eyebrow: "PRODUCT SHOWCASE", index: ctx.index, logoPath: ctx.logoPath });
  addText(slide, placeholder(d.product, "[TÊN SẢN PHẨM / TÍNH NĂNG]"), 0.58, 1.42, 5.3, 0.44, { fontFace: FONT.head, fontSize: 22, bold: true });
  addText(slide, placeholder(d.body, "[Mô tả ngắn bài toán, giá trị và đối tượng sử dụng]"), 0.58, 2.05, 5.0, 0.62, { fontSize: 15, color: MB.gray });
  safeArray(d.benefits, ["[LỢI ÍCH 01]", "[LỢI ÍCH 02]", "[LỢI ÍCH 03]"]).slice(0, 3).forEach((b, i) => {
    addRect(slide, 0.58, 2.95 + i * 0.64, 0.29, 0.29, { shape: SHAPE.ellipse, fill: i === 0 ? MB.red : MB.blue, line: false });
    addText(slide, b, 1.15, 2.94 + i * 0.64, 3.8, 0.30, { fontSize: 14, bold: true });
  });
  addRect(slide, 6.10, 1.40, 6.18, 4.76, { fill: MB.lightBlue, line: false, radius: 0.18 });
  addRect(slide, 6.48, 1.82, 3.80, 3.00, { fill: MB.white, line: MB.navy, lineWidth: 1.3, radius: 0.12, shadow: true });
  addRect(slide, 6.48, 1.82, 3.80, 0.32, { fill: MB.navy, line: false, radius: 0.12 });
  addText(slide, "[CHÈN UI WEB]", 6.88, 3.26, 3.0, 0.30, { fontSize: 13, bold: true, color: MB.gray, align: "center" });
  addRect(slide, 10.52, 2.32, 1.32, 2.68, { fill: MB.white, line: MB.navy, lineWidth: 1.7, radius: 0.20, shadow: true });
  addText(slide, "[UI APP]", 10.72, 3.45, 0.92, 0.30, { fontSize: 10, bold: true, color: MB.gray, align: "center" });
  addText(slide, "[CHÚ THÍCH MÀN HÌNH / FLOW]", 6.55, 5.35, 5.1, 0.28, { fontSize: 11, bold: true, color: MB.blue, align: "center" });
}

function caseStudy(pptx, slide, d, ctx) {
  addHeader(slide, { title: placeholder(d.title, "[TỔNG QUAN DỰ ÁN / CASE STUDY]"), eyebrow: "PROJECT OVERVIEW", index: ctx.index, logoPath: ctx.logoPath });
  addPlaceholder(slide, "[CHÈN KEY VISUAL / MOCKUP]", 0.58, 1.42, 5.52, 3.15);
  addText(slide, placeholder(d.project, "[TÊN DỰ ÁN]"), 6.52, 1.42, 5.2, 0.50, { fontFace: FONT.head, fontSize: 25, bold: true });
  addText(slide, placeholder(d.body, "[MÔ TẢ DỰ ÁN TRONG 1–2 CÂU]"), 6.52, 2.05, 5.0, 0.60, { fontSize: 15, color: MB.gray });
  const meta = safeArray(d.meta, [["[VAI TRÒ]", "[NỘI DUNG]"], ["[THỜI GIAN]", "[NỘI DUNG]"], ["[PHẠM VI]", "[NỘI DUNG]"], ["[ĐỐI TƯỢNG]", "[NỘI DUNG]"]]);
  meta.slice(0, 4).forEach((m, i) => { addText(slide, m[0], 6.52, 3.02 + i * 0.54, 1.42, 0.24, { fontSize: 10, bold: true, color: MB.blue }); addText(slide, m[1], 8.20, 3.00 + i * 0.54, 3.3, 0.28, { fontSize: 14, bold: true }); addLine(slide, 6.52, 3.37 + i * 0.54, 5.15, 0, MB.line, 0.8); });
  const bottom = [["[BÀI TOÁN]", "[MÔ TẢ NGẮN]"], ["[GIẢI PHÁP]", "[MÔ TẢ NGẮN]"], ["[KẾT QUẢ]", "[XX% / XXX]"]];
  bottom.forEach((b, i) => { const x = 0.58 + i * 4.08; addRect(slide, x, 5.22, 3.75, 1.20, { fill: i === 2 ? MB.navy : MB.pale, line: i === 2 ? MB.navy : MB.line, radius: 0.12 }); addText(slide, b[0], x + 0.30, 5.48, 2.9, 0.24, { fontSize: 11, bold: true, color: i === 2 ? MB.white : MB.blue }); addText(slide, b[1], x + 0.30, 5.90, 2.9, 0.34, { fontFace: i === 2 ? FONT.head : FONT.body, fontSize: i === 2 ? 19 : 14, bold: i === 2, color: i === 2 ? MB.white : MB.navy }); });
  addDataNote(slide);
}

function closing(pptx, slide, d, ctx) {
  slide.background = { color: MB.blue };
  slide.addShape(SHAPE.rect, { x: 8.8, y: 0, w: 4.54, h: 7.5, fill: { color: MB.navy, transparency: 15 }, line: { transparency: 100 } });
  addLogo(slide, ctx.logoPath, 0.75, 0.50, 1.55, 0.76, true);
  addText(slide, "CẢM ƠN", 0.75, 2.05, 3.2, 0.35, { fontFace: FONT.head, fontSize: 18, bold: true, color: MB.red });
  addText(slide, placeholder(d.title, "[THÔNG ĐIỆP KẾT THÚC]"), 0.75, 2.85, 7.7, 0.85, { fontFace: FONT.head, fontSize: 38, bold: true, color: MB.white });
  addText(slide, placeholder(d.subtitle, "[THÔNG TIN LIÊN HỆ / BƯỚC TIẾP THEO]"), 0.75, 4.28, 7.5, 0.42, { fontSize: 17, color: MB.white });
  addLine(slide, 0.75, 5.42, 6.85, 0, "FFFFFF", 1);
  addText(slide, placeholder(d.contact, "[EMAIL]  •  [SỐ ĐIỆN THOẠI]  •  [ĐƠN VỊ]"), 0.75, 5.72, 7.5, 0.25, { fontSize: 13, color: MB.white });
  addRect(slide, 9.52, 1.65, 2.58, 3.75, { fill: MB.navy, line: "6F7DF2", lineWidth: 1, radius: 0.20 });
  addText(slide, "[CHÈN QR /\nHÌNH ẢNH]", 9.90, 3.20, 1.82, 0.55, { fontSize: 14, bold: true, color: MB.white, align: "center" });
}

function quote(pptx, slide, d, ctx) {
  addHeader(slide, { title: placeholder(d.title, "[TIẾNG NÓI KHÁCH HÀNG]"), eyebrow: "VOC VERBATIM", index: ctx.index, logoPath: ctx.logoPath });
  addRect(slide, 0.58, 1.38, 7.75, 4.70, { fill: MB.navy, line: false, radius: 0.18 });
  addText(slide, "“", 0.98, 1.78, 0.65, 0.60, { fontFace: FONT.head, fontSize: 44, bold: true, color: MB.red });
  addText(slide, placeholder(d.quote, "[TRÍCH DẪN NGUYÊN VĂN PHẢN HỒI CỦA KHÁCH HÀNG — NGẮN, CỤ THỂ VÀ THỂ HIỆN RÕ NHU CẦU]"), 1.15, 2.55, 6.5, 1.50, { fontFace: FONT.head, fontSize: 22, bold: true, color: MB.white });
  addLine(slide, 1.15, 4.75, 6.15, 0, "65709A", 1);
  addText(slide, placeholder(d.context, "[PHÂN KHÚC KHÁCH HÀNG]  •  [KÊNH]  •  [THỜI ĐIỂM]"), 1.15, 5.08, 6.0, 0.25, { fontSize: 11, color: MB.white });
  addRect(slide, 8.62, 1.38, 3.50, 4.70, { fill: MB.lightBlue, line: false, radius: 0.18 });
  addText(slide, "BỐI CẢNH", 9.00, 1.80, 2.7, 0.30, { fontFace: FONT.head, fontSize: 16, bold: true, color: MB.blue });
  [["[CHỦ ĐỀ]", "[NỘI DUNG]"], ["[MỨC ĐỘ]", "[ƯU TIÊN / TẦN SUẤT]"], ["[TÁC ĐỘNG]", "[MÔ TẢ NGẮN]"]].forEach((m, i) => { addText(slide, m[0], 9.00, 2.34 + i * 0.82, 1.15, 0.20, { fontSize: 9, bold: true, color: MB.gray }); addText(slide, m[1], 9.00, 2.67 + i * 0.82, 2.70, 0.28, { fontSize: 14, bold: true }); addLine(slide, 9.00, 3.06 + i * 0.82, 2.70, 0, "C9D1F7", 0.8); });
  addText(slide, "[INSIGHT / CÂU HỎI CẦN GIẢI QUYẾT]", 9.00, 5.42, 2.70, 0.42, { fontSize: 12, bold: true, color: MB.red });
}

function actionTracker(pptx, slide, d, ctx) {
  addHeader(slide, { title: placeholder(d.title, "[THEO DÕI HÀNH ĐỘNG]"), eyebrow: "EXECUTION TRACKER", index: ctx.index, logoPath: ctx.logoPath });
  addText(slide, placeholder(d.scope, "[PHẠM VI / KỲ BÁO CÁO]"), 0.68, 1.25, 4.2, 0.22, { fontSize: 10, color: MB.gray });
  addChip(slide, "XONG", 8.86, 1.20, 0.98, "green"); addChip(slide, "ĐANG LÀM", 9.98, 1.20, 1.12, "blue"); addChip(slide, "TRỄ", 11.22, 1.20, 0.98, "red");
  const rows = safeArray(d.rows, [
    ["[HÀNH ĐỘNG]", "[OWNER]", "[HẠN]", "[TRẠNG THÁI]", "[BƯỚC TIẾP THEO]"],
    ["[HÀNH ĐỘNG 01]", "[HỌ TÊN]", "[DD/MM]", "[ĐÃ XONG]", "[NỘI DUNG]"],
    ["[HÀNH ĐỘNG 02]", "[HỌ TÊN]", "[DD/MM]", "[ĐANG LÀM]", "[NỘI DUNG]"],
    ["[HÀNH ĐỘNG 03]", "[HỌ TÊN]", "[DD/MM]", "[TRỄ HẠN]", "[NỘI DUNG]"],
    ["[HÀNH ĐỘNG 04]", "[HỌ TÊN]", "[DD/MM]", "[CHƯA BẮT ĐẦU]", "[NỘI DUNG]"],
    ["[HÀNH ĐỘNG 05]", "[HỌ TÊN]", "[DD/MM]", "[ĐANG LÀM]", "[NỘI DUNG]"]
  ]);
  slide.addTable(styledTableRows(rows), { x: 0.58, y: 1.62, w: 12.15, h: 4.10, colW: [3.75, 1.78, 1.52, 2.05, 3.05], rowH: 0.67, border: { type: "solid", color: MB.navy, pt: 0.8 }, fontFace: FONT.body, fontSize: 14, color: MB.navy, margin: 0.10, fill: MB.white });
  addRect(slide, 0.58, 5.95, 12.15, 0.56, { fill: MB.lightBlue, line: false, radius: 0.10 });
  addText(slide, "[QUYẾT ĐỊNH / ESCALATION CẦN THIẾT]", 0.92, 6.12, 4.8, 0.24, { fontSize: 13, bold: true, color: MB.blue });
  addText(slide, "[NGƯỜI QUYẾT ĐỊNH]  •  [THỜI HẠN]", 8.85, 6.12, 3.35, 0.24, { fontSize: 11, bold: true, align: "right" });
}

// -------------------------------------------------------------
// 16 NEW EXTENDED FINANCIAL & MANAGEMENT LAYOUTS
// -------------------------------------------------------------

// 25. Data Insight Split
function dataInsightSplit(pptx, slide, d, ctx) {
  addHeader(slide, { title: placeholder(d.title, "[PHÂN TÍCH CHUYÊN SÂU & SỐ LIỆU]"), eyebrow: "DATA & INSIGHT SPLIT", index: ctx.index, logoPath: ctx.logoPath });
  
  // Left side: Data / Chart card
  addRect(slide, 0.58, 1.40, 5.90, 4.55, { fill: MB.white, line: MB.line, radius: 0.16 });
  addText(slide, placeholder(d.dataTitle, "[SỐ LIỆU TRỌNG TÂM]"), 0.92, 1.68, 5.2, 0.32, { fontFace: FONT.head, fontSize: 18, bold: true, color: MB.blue });
  
  const kpis = safeArray(d.kpis, [
    { label: "[CHỈ TIÊU A]", value: "[XXX TỶ]", delta: "[+XX%]", tone: "green" },
    { label: "[CHỈ TIÊU B]", value: "[XX.X%]", delta: "[±X.X%]", tone: "blue" }
  ]);
  kpis.slice(0, 2).forEach((k, i) => {
    addKpiCard(slide, { x: 0.92 + i * 2.65, y: 2.15, w: 2.50, ...k });
  });

  const chart = d.chart ?? { categories: ["Q1", "Q2", "Q3", "Q4"], values: [55, 68, 74, 88] };
  slide.addChart(CHART.bar, [{ name: "Thực hiện", labels: chart.categories, values: chart.values }], {
    x: 0.92, y: 3.75, w: 5.20, h: 2.05, ...cleanChart, chartColors: [MB.blue], showValue: true
  });

  // Right side: Deep Insights & Recommendations
  addRect(slide, 6.82, 1.40, 5.90, 4.55, { fill: MB.pale, line: MB.line, radius: 0.16 });
  addText(slide, placeholder(d.insightTitle, "[PHÂN TÍCH NGUYÊN NHÂN & HÀNH ĐỘNG]"), 7.15, 1.68, 5.2, 0.32, { fontFace: FONT.head, fontSize: 18, bold: true, color: MB.navy });
  
  const insights = safeArray(d.insights, [
    { title: "[PHÁT HIỆN CHÍNH]", desc: "[Mô tả sự biến động dữ liệu và nguyên nhân cốt lõi trong kỳ báo cáo]" },
    { title: "[TÁC ĐỘNG TÀI CHÍNH]", desc: "[Đánh giá mức độ ảnh hưởng đến doanh thu, chi phí hoặc rủi ro vận hành]" },
    { title: "[GIẢI PHÁP ĐỀ XUẤT]", desc: "[Biện pháp khắc phục cụ thể, phân công đơn vị chủ trì và mốc hoàn thành]" }
  ]);
  insights.slice(0, 3).forEach((ins, i) => {
    const y = 2.20 + i * 1.15;
    addChip(slide, String(i + 1).padStart(2, "0"), 7.15, y, 0.45, i === 0 ? "blue" : i === 1 ? "yellow" : "red");
    addText(slide, ins.title, 7.75, y - 0.02, 4.6, 0.28, { fontFace: FONT.head, fontSize: 15, bold: true, color: MB.navy });
    addText(slide, ins.desc, 7.75, y + 0.30, 4.6, 0.65, { fontSize: 13, color: MB.gray });
  });

  // Bottom Takeaway
  addRect(slide, 0.58, 6.10, 12.15, 0.55, { fill: MB.lightBlue, line: false, radius: 0.10 });
  addText(slide, "[KẾT LUẬN ĐIỀU HÀNH]", 0.88, 6.25, 2.5, 0.25, { fontSize: 13, bold: true, color: MB.blue });
  addText(slide, placeholder(d.takeaway, "[Thông điệp tóm gọn cho lãnh đạo ra quyết định]"), 3.50, 6.25, 8.8, 0.25, { fontSize: 13 });
  addDataNote(slide);
}

// 26. Balance Sheet
function balanceSheet(pptx, slide, d, ctx) {
  addHeader(slide, { title: placeholder(d.title, "[CƠ CẤU BẢNG CÂN ĐỐI KẾ TOÁN]"), eyebrow: "BALANCE SHEET STRUCTURE", index: ctx.index, logoPath: ctx.logoPath });
  addText(slide, placeholder(d.unit, "[ĐƠN VỊ: TỶ VND • THỜI ĐIỂM: CUỐI KỲ]"), 0.68, 1.25, 5.0, 0.20, { fontSize: 9, color: MB.gray });

  // Left Card: Total Assets
  addRect(slide, 0.58, 1.50, 5.90, 4.45, { fill: MB.white, line: MB.blue, lineWidth: 1.5, radius: 0.15 });
  addText(slide, "[TỔNG TÀI SẢN (ASSETS)]", 0.90, 1.75, 3.5, 0.30, { fontFace: FONT.head, fontSize: 16, bold: true, color: MB.blue });
  addText(slide, placeholder(d.totalAssets, "[XXX,XXX TỶ]"), 4.30, 1.75, 1.9, 0.30, { fontFace: FONT.head, fontSize: 16, bold: true, align: "right", color: MB.blue });

  const assetRows = safeArray(d.assetRows, [
    ["1. Tiền mặt & Tiền gửi NHNN", "[XX,XXX]", "[+XX%]"],
    ["2. Cho vay khách hàng", "[XXX,XXX]", "[+XX%]"],
    ["3. Chứng khoán đầu tư", "[XX,XXX]", "[±XX%]"],
    ["4. Tài sản cố định & Khác", "[XX,XXX]", "[+XX%]"]
  ]);
  const assetTableData = [
    ["KHOẢN MỤC TÀI SẢN", "SỐ DƯ", "TĂNG TRƯỞNG"].map(t => ({ text: t, options: { fill: MB.lightBlue, color: MB.blue, bold: true, fontSize: 11 } })),
    ...assetRows.map(r => r.map((c, idx) => ({ text: c, options: { fontSize: 12, fill: MB.white, color: idx === 2 ? MB.success : MB.navy, align: idx > 0 ? "right" : "left" } })))
  ];
  slide.addTable(assetTableData, { x: 0.75, y: 2.25, w: 5.55, h: 2.50, colW: [3.15, 1.20, 1.20], rowH: 0.50, border: { type: "solid", color: MB.line, pt: 0.8 } });

  // Right Card: Liabilities & Equity
  addRect(slide, 6.82, 1.50, 5.90, 4.45, { fill: MB.white, line: MB.navy, lineWidth: 1.5, radius: 0.15 });
  addText(slide, "[NGUỒN VỐN & VỐN CHỦ SỞ HỮU]", 7.15, 1.75, 3.8, 0.30, { fontFace: FONT.head, fontSize: 16, bold: true, color: MB.navy });
  addText(slide, placeholder(d.totalLiabilities, "[XXX,XXX TỶ]"), 10.55, 1.75, 1.9, 0.30, { fontFace: FONT.head, fontSize: 16, bold: true, align: "right", color: MB.navy });

  const liabilityRows = safeArray(d.liabilityRows, [
    ["1. Tiền gửi của khách hàng", "[XXX,XXX]", "[+XX%]"],
    ["2. Phát hành giấy tờ có giá", "[XX,XXX]", "[+XX%]"],
    ["3. Vay NHNN & TCTD khác", "[XX,XXX]", "[±XX%]"],
    ["4. Vốn chủ sở hữu & Các quỹ", "[XX,XXX]", "[+XX%]"]
  ]);
  const liabilityTableData = [
    ["KHOẢN MỤC NGUỒN VỐN", "SỐ DƯ", "TĂNG TRƯỞNG"].map(t => ({ text: t, options: { fill: "E8EBF4", color: MB.navy, bold: true, fontSize: 11 } })),
    ...liabilityRows.map(r => r.map((c, idx) => ({ text: c, options: { fontSize: 12, fill: MB.white, color: idx === 2 ? MB.success : MB.navy, align: idx > 0 ? "right" : "left" } })))
  ];
  slide.addTable(liabilityTableData, { x: 7.00, y: 2.25, w: 5.55, h: 2.50, colW: [3.15, 1.20, 1.20], rowH: 0.50, border: { type: "solid", color: MB.line, pt: 0.8 } });

  // Summary Footer
  addRect(slide, 0.58, 6.10, 12.15, 0.55, { fill: MB.navy, line: false, radius: 0.10 });
  addText(slide, "[ĐÁNH GIÁ CHẤT LƯỢNG TÀI SẢN & AN TOÀN VỐN]", 0.88, 6.25, 4.5, 0.25, { fontSize: 12, bold: true, color: MB.white });
  addText(slide, placeholder(d.equityRatio, "Tỷ lệ CAR: [XX.X%]  •  Tỷ lệ LDR: [XX.X%]  •  CASA: [XX.X%]"), 5.50, 6.25, 6.9, 0.25, { fontSize: 12, bold: true, color: MB.lightBlue, align: "right" });
  addDataNote(slide);
}

// 27. PnL Waterfall Bridge
function pnlBridge(pptx, slide, d, ctx) {
  addHeader(slide, { title: placeholder(d.title, "[CẦU NỐI KẾT QUẢ KINH DOANH PNL]"), eyebrow: "PNL WATERFALL BRIDGE", index: ctx.index, logoPath: ctx.logoPath });
  
  // Big Metric
  addRect(slide, 0.58, 1.40, 12.15, 1.05, { fill: MB.lightBlue, line: false, radius: 0.14 });
  addText(slide, "LỢI NHUẬN TRƯỚC THUẾ (PBT)", 0.95, 1.55, 4.5, 0.25, { fontSize: 12, bold: true, color: MB.blue });
  addText(slide, placeholder(d.pbtValue, "[XX,XXX TỶ VND]"), 0.95, 1.82, 4.5, 0.45, { fontFace: FONT.head, fontSize: 26, bold: true, color: MB.blue });
  addText(slide, placeholder(d.pbtDelta, "Tăng trưởng: [+XX% YoY]  •  Đạt [XX%] Kế hoạch năm"), 6.50, 1.75, 5.8, 0.35, { fontSize: 14, bold: true, align: "right", color: MB.navy });

  // Waterfall Chart
  addRect(slide, 0.58, 2.60, 7.80, 3.45, { fill: MB.white, line: MB.line, radius: 0.15 });
  const bridgeData = d.bridge ?? {
    categories: ["NII", "NFI", "FX/Sec", "OPEX", "Provision", "PBT"],
    values: [45.2, 12.8, 5.4, -18.6, -12.2, 32.6]
  };
  slide.addChart(CHART.bar, [{ name: "Đóng góp PnL", labels: bridgeData.categories, values: bridgeData.values }], {
    x: 0.85, y: 2.85, w: 7.25, h: 3.00, ...cleanChart, showValue: true,
    chartColors: [MB.blue, MB.blue2, "7E91FA", MB.red, MB.red, MB.success]
  });

  // Drivers Breakdown
  addRect(slide, 8.60, 2.60, 4.13, 3.45, { fill: MB.pale, line: MB.line, radius: 0.15 });
  addText(slide, "[ĐỘNG LỰC CHÍNH (DRIVERS)]", 8.90, 2.85, 3.5, 0.28, { fontFace: FONT.head, fontSize: 15, bold: true, color: MB.navy });

  const drivers = safeArray(d.drivers, [
    { name: "Thu nhập lãi thuần (NII)", val: "[+XX%]", desc: "Tăng trưởng tín dụng & NIM ổn định" },
    { name: "Thu dịch vụ thuần (NFI)", val: "[+XX%]", desc: "Thẻ, bảo hiểm và thanh toán số" },
    { name: "Chi phí hoạt động (CIR)", val: "[XX.X%]", desc: "Tối ưu hóa nhờ chuyển đổi số" },
    { name: "Chi phí dự phòng", val: "[-XX%]", desc: "Trích lập chủ động, nợ xấu kiểm soát" }
  ]);
  drivers.slice(0, 4).forEach((dr, i) => {
    const y = 3.25 + i * 0.68;
    addText(slide, dr.name, 8.90, y, 2.6, 0.22, { fontSize: 11, bold: true });
    addText(slide, dr.val, 11.45, y, 1.0, 0.22, { fontFace: FONT.head, fontSize: 11, bold: true, align: "right", color: dr.val.includes('-') && !dr.name.includes('phòng') ? MB.red : MB.success });
    addText(slide, dr.desc, 8.90, y + 0.24, 3.6, 0.20, { fontSize: 9, color: MB.gray });
  });

  // Footer Insight
  addRect(slide, 0.58, 6.18, 12.15, 0.50, { fill: MB.lightBlue, line: false, radius: 0.08 });
  addText(slide, "[HÀM Ý ĐIỀU HÀNH]  " + placeholder(d.summary, "Tiếp tục đẩy mạnh thu ngoài lãi và kiểm soát chặt chẽ hệ số CIR dưới 30%."), 0.88, 6.30, 11.5, 0.25, { fontSize: 12, bold: true, color: MB.blue });
  addDataNote(slide);
}

// 28. Cash Flow
function cashFlow(pptx, slide, d, ctx) {
  addHeader(slide, { title: placeholder(d.title, "[BÁO CÁO LƯU CHUYỂN TIỀN TỆ]"), eyebrow: "CASH FLOW STATEMENT", index: ctx.index, logoPath: ctx.logoPath });
  addText(slide, placeholder(d.unit, "[ĐƠN VỊ: TỶ VND • KỲ BÁO CÁO]"), 0.68, 1.25, 5.0, 0.20, { fontSize: 9, color: MB.gray });

  const flows = safeArray(d.flows, [
    { title: "1. HĐ KINH DOANH (CFO)", val: "[+XX,XXX TỶ]", desc: "Thu từ hoạt động huy động & cho vay cốt lõi", tone: "green" },
    { title: "2. HĐ ĐẦU TƯ (CFI)", val: "[-X,XXX TỶ]", desc: "Mua sắm TSCĐ, phần mềm công nghệ & hạ tầng", tone: "blue" },
    { title: "3. HĐ TÀI CHÍNH (CFF)", val: "[+X,XXX TỶ]", desc: "Tăng vốn, phát hành trái phiếu & cổ tức", tone: "yellow" }
  ]);

  flows.slice(0, 3).forEach((cf, i) => {
    const x = 0.58 + i * 4.08;
    const toneColor = cf.tone === "green" ? MB.success : cf.tone === "red" ? MB.red : MB.blue;
    addRect(slide, x, 1.50, 3.75, 2.20, { fill: MB.white, line: MB.line, radius: 0.15 });
    addText(slide, cf.title, x + 0.25, 1.72, 3.25, 0.25, { fontFace: FONT.head, fontSize: 13, bold: true, color: MB.gray });
    addText(slide, cf.val, x + 0.25, 2.05, 3.25, 0.45, { fontFace: FONT.head, fontSize: 24, bold: true, color: toneColor });
    addText(slide, cf.desc, x + 0.25, 2.65, 3.25, 0.85, { fontSize: 12, color: MB.navy });
  });

  // Table Detail Breakdown
  const tableRows = safeArray(d.tableRows, [
    ["CHỈ TIÊU LƯU CHUYỂN TIỀN TỆ", "KỲ TRƯỚC", "KỲ NÀY", "THAY ĐỔI"],
    ["Lưu chuyển tiền thuần từ hoạt động kinh doanh", "[XX,XXX]", "[XX,XXX]", "[+XX%]"],
    ["Lưu chuyển tiền thuần từ hoạt động đầu tư", "[-X,XXX]", "[-X,XXX]", "[-XX%]"],
    ["Lưu chuyển tiền thuần từ hoạt động tài chính", "[X,XXX]", "[X,XXX]", "[+XX%]"],
    ["Tiền và tương đương tiền cuối kỳ", "[XX,XXX]", "[XX,XXX]", "[+XX%]"]
  ]);
  slide.addTable(styledTableRows(tableRows), {
    x: 0.58, y: 3.90, w: 12.15, h: 2.15, colW: [5.25, 2.30, 2.30, 2.30], rowH: 0.43,
    border: { type: "solid", color: MB.line, pt: 0.8 }, fontFace: FONT.body, fontSize: 12
  });

  // Bottom Net Cash Badge
  addRect(slide, 0.58, 6.18, 12.15, 0.48, { fill: MB.navy, line: false, radius: 0.08 });
  addText(slide, "TỔNG TIỀN VÀ TƯƠNG ĐƯƠNG TIỀN CUỐI KỲ: " + placeholder(d.closingCash, "[XXX,XXX TỶ VND] (Đảm bảo thanh khoản dồi dào)"), 0.88, 6.30, 11.5, 0.25, { fontSize: 12, bold: true, color: MB.white });
  addDataNote(slide);
}

// 29. Segment Performance
function segmentPerformance(pptx, slide, d, ctx) {
  addHeader(slide, { title: placeholder(d.title, "[HIỆU QUẢ KINH DOANH THEO PHÂN KHÚC KHÁCH HÀNG]"), eyebrow: "SEGMENT PERFORMANCE", index: ctx.index, logoPath: ctx.logoPath });
  
  const segments = safeArray(d.segments, [
    { name: "RETAIL BANKING (CÁ NHÂN)", rev: "[XX,XXX TỶ]", growth: "[+XX%]", casa: "[XX.X%]", npl: "[X.XX%]", desc: "Mở rộng 3.5 triệu KH mới qua App MBBank" },
    { name: "SME (DOANH NGHIỆP VỪA & NHỎ)", rev: "[XX,XXX TỶ]", growth: "[+XX%]", casa: "[XX.X%]", npl: "[X.XX%]", desc: "Đẩy mạnh nền tảng BIZ MBBank & giải ngân online" },
    { name: "CIB (KHÁCH HÀNG DOANH NGHIỆP LỚN)", rev: "[XX,XXX TỶ]", growth: "[+XX%]", casa: "[XX.X%]", npl: "[X.XX%]", desc: "Tập trung FDI, chuỗi cung ứng & tài trợ thương mại" }
  ]);

  segments.slice(0, 3).forEach((seg, i) => {
    const x = 0.58 + i * 4.08;
    addRect(slide, x, 1.45, 3.75, 4.55, { fill: MB.white, line: MB.line, radius: 0.16 });
    
    // Segment Header Box
    addRect(slide, x, 1.45, 3.75, 0.85, { fill: i === 0 ? MB.blue : i === 1 ? MB.navy : "3157F5", line: false, radius: 0.16 });
    addText(slide, seg.name, x + 0.20, 1.70, 3.35, 0.40, { fontFace: FONT.head, fontSize: 13, bold: true, color: MB.white });

    // Key Stats
    addText(slide, "Doanh Thu Thuần:", x + 0.25, 2.50, 1.6, 0.22, { fontSize: 11, color: MB.gray });
    addText(slide, seg.rev, x + 1.90, 2.50, 1.6, 0.22, { fontFace: FONT.head, fontSize: 12, bold: true, align: "right" });

    addText(slide, "Tăng Trưởng YoY:", x + 0.25, 2.85, 1.6, 0.22, { fontSize: 11, color: MB.gray });
    addText(slide, seg.growth, x + 1.90, 2.85, 1.6, 0.22, { fontFace: FONT.head, fontSize: 12, bold: true, color: MB.success, align: "right" });

    addText(slide, "Tỷ lệ CASA:", x + 0.25, 3.20, 1.6, 0.22, { fontSize: 11, color: MB.gray });
    addText(slide, seg.casa, x + 1.90, 3.20, 1.6, 0.22, { fontFace: FONT.head, fontSize: 12, bold: true, color: MB.blue, align: "right" });

    addText(slide, "Tỷ lệ nợ xấu (NPL):", x + 0.25, 3.55, 1.6, 0.22, { fontSize: 11, color: MB.gray });
    addText(slide, seg.npl, x + 1.90, 3.55, 1.6, 0.22, { fontFace: FONT.head, fontSize: 12, bold: true, color: MB.navy, align: "right" });

    addLine(slide, x + 0.25, 3.95, 3.25, 0, MB.line, 0.8);
    addText(slide, "[ĐIỂM NHẤN HOẠT ĐỘNG]", x + 0.25, 4.15, 3.25, 0.25, { fontSize: 11, bold: true, color: MB.blue });
    addText(slide, seg.desc, x + 0.25, 4.45, 3.25, 1.35, { fontSize: 12, color: MB.gray });
  });

  // Strategy footer
  addRect(slide, 0.58, 6.15, 12.15, 0.50, { fill: MB.lightBlue, line: false, radius: 0.08 });
  addText(slide, "[ĐỊNH HƯỚNG PHÂN KHÚC]  " + placeholder(d.strategy, "Mở rộng hệ sinh thái số cho Bán lẻ & Tăng trưởng tín dụng chọn lọc phân khúc SME & CIB chất lượng cao."), 0.88, 6.28, 11.5, 0.25, { fontSize: 12, bold: true, color: MB.blue });
  addDataNote(slide);
}

// 30. Region Performance
function regionPerformance(pptx, slide, d, ctx) {
  addHeader(slide, { title: placeholder(d.title, "[KẾT QUẢ KINH DOANH THEO VÙNG ĐỊA LÝ]"), eyebrow: "REGIONAL PERFORMANCE", index: ctx.index, logoPath: ctx.logoPath });

  const regions = safeArray(d.regions, [
    { name: "MIỀN BẮC (TRỌNG ĐIỂM)", credit: "[XXX,XXX TỶ]", deposit: "[XXX,XXX TỶ]", share: "[XX.X%]", kpi: "105% KPI", tone: "blue" },
    { name: "MIỀN NAM (TĂNG TỐC)", credit: "[XXX,XXX TỶ]", deposit: "[XXX,XXX TỶ]", share: "[XX.X%]", kpi: "102% KPI", tone: "green" },
    { name: "MIỀN TRUNG & TÂY NGUYÊN", credit: "[XX,XXX TỶ]", deposit: "[XX,XXX TỶ]", share: "[XX.X%]", kpi: "98% KPI", tone: "yellow" },
    { name: "CHI NHÁNH NƯỚC NGOÀI", credit: "[XX,XXX TỶ]", deposit: "[XX,XXX TỶ]", share: "[X.X%]", kpi: "101% KPI", tone: "blue" }
  ]);

  regions.slice(0, 4).forEach((reg, i) => {
    const x = 0.58 + i * 3.04;
    addRect(slide, x, 1.45, 2.75, 4.55, { fill: MB.white, line: MB.line, radius: 0.15 });
    addText(slide, reg.name, x + 0.20, 1.70, 2.35, 0.40, { fontFace: FONT.head, fontSize: 12, bold: true, color: MB.navy });
    addChip(slide, reg.kpi, x + 0.20, 2.15, 1.10, reg.tone);

    addText(slide, "Dư nợ tín dụng:", x + 0.20, 2.70, 2.35, 0.20, { fontSize: 10, color: MB.gray });
    addText(slide, reg.credit, x + 0.20, 2.92, 2.35, 0.30, { fontFace: FONT.head, fontSize: 16, bold: true, color: MB.blue });

    addText(slide, "Huy động vốn:", x + 0.20, 3.40, 2.35, 0.20, { fontSize: 10, color: MB.gray });
    addText(slide, reg.deposit, x + 0.20, 3.62, 2.35, 0.30, { fontFace: FONT.head, fontSize: 16, bold: true, color: MB.navy });

    addText(slide, "Thị phần khu vực:", x + 0.20, 4.10, 2.35, 0.20, { fontSize: 10, color: MB.gray });
    addText(slide, reg.share, x + 0.20, 4.32, 2.35, 0.30, { fontFace: FONT.head, fontSize: 14, bold: true, color: MB.success });

    addLine(slide, x + 0.20, 4.80, 2.35, 0, MB.line, 0.8);
    addText(slide, "[Hiệu suất CN: Đạt chuẩn]", x + 0.20, 5.05, 2.35, 0.40, { fontSize: 10, color: MB.gray });
  });

  // Footer
  addRect(slide, 0.58, 6.15, 12.15, 0.50, { fill: MB.navy, line: false, radius: 0.08 });
  addText(slide, "[CHỈ ĐẠO MẠNG LƯỚI]  " + placeholder(d.directive, "Tập trung mở rộng thị phần tại khu vực Miền Nam và tối ưu năng suất lao động chi nhánh toàn quốc."), 0.88, 6.28, 11.5, 0.25, { fontSize: 12, bold: true, color: MB.white });
  addDataNote(slide);
}

// 31. CIB Portfolio
function cibPortfolio(pptx, slide, d, ctx) {
  addHeader(slide, { title: placeholder(d.title, "[DANH MỤC KHÁCH HÀNG DOANH NGHIỆP LỚN CIB]"), eyebrow: "CIB PORTFOLIO & SECTOR EXPOSURE", index: ctx.index, logoPath: ctx.logoPath });
  
  // Left: Industry Sector Chart
  addRect(slide, 0.58, 1.45, 6.80, 4.55, { fill: MB.white, line: MB.line, radius: 0.15 });
  addText(slide, "[PHÂN BỔ THEO NGÀNH KINH TẾ]", 0.90, 1.70, 4.5, 0.30, { fontFace: FONT.head, fontSize: 15, bold: true, color: MB.navy });
  
  const sectorData = d.sectors ?? {
    labels: ["Sản xuất & Chế biến", "Năng lượng & Tiện ích", "Bất động sản & Xây dựng", "Thương mại & Bán lẻ", "Logistics & Khác"],
    values: [32, 24, 18, 16, 10]
  };
  slide.addChart(CHART.bar, [{ name: "Tỷ trọng %", labels: sectorData.labels, values: sectorData.values }], {
    x: 0.85, y: 2.15, w: 6.25, h: 3.60, ...cleanChart, barDir: "bar", showValue: true, chartColors: [MB.blue]
  });

  // Right: Key CIB Metrics & Concentration Limits
  addRect(slide, 7.70, 1.45, 5.03, 4.55, { fill: MB.pale, line: MB.line, radius: 0.15 });
  addText(slide, "[CHỈ SỐ TẬP TRUNG & HẠN MỨC]", 8.00, 1.70, 4.4, 0.30, { fontFace: FONT.head, fontSize: 15, bold: true, color: MB.blue });

  const metrics = [
    { label: "Tổng quy mô danh mục CIB", val: placeholder(d.totalCib, "[XXX,XXX TỶ]") },
    { label: "Tỷ trọng Top 10 khách hàng lớn", val: placeholder(d.top10Exposure, "[XX.X%] (Trong hạn mức an toàn)") },
    { label: "Tỷ lệ tài trợ chuỗi cung ứng (SCF)", val: placeholder(d.scfShare, "[XX.X%]") },
    { label: "Tỷ lệ nợ xấu CIB", val: placeholder(d.cibNpl, "[X.XX%] (Kiểm soát chặt chẽ)") }
  ];
  metrics.forEach((m, i) => {
    const y = 2.20 + i * 0.90;
    addText(slide, m.label, 8.00, y, 4.4, 0.22, { fontSize: 11, color: MB.gray });
    addText(slide, m.val, 8.00, y + 0.24, 4.4, 0.35, { fontFace: FONT.head, fontSize: 15, bold: true, color: MB.navy });
    if (i < 3) addLine(slide, 8.00, y + 0.70, 4.4, 0, MB.line, 0.8);
  });

  // Footer
  addRect(slide, 0.58, 6.15, 12.15, 0.50, { fill: MB.lightBlue, line: false, radius: 0.08 });
  addText(slide, "[QUẢN TRỊ DANH MỤC]  Đa dạng hóa danh mục ngành, ưu tiên năng lượng xanh, sản xuất công nghệ cao và tài trợ chuỗi.", 0.88, 6.28, 11.5, 0.25, { fontSize: 12, bold: true, color: MB.blue });
  addDataNote(slide);
}

// 32. Credit Quality & NPL
function creditQuality(pptx, slide, d, ctx) {
  addHeader(slide, { title: placeholder(d.title, "[CHẤT LƯỢNG TÍN DỤNG & PHÂN LOẠI NỢ]"), eyebrow: "CREDIT QUALITY & NPL ANALYSIS", index: ctx.index, logoPath: ctx.logoPath });
  
  // 3 Key Top Metrics
  const topKpis = [
    { label: "TỶ LỆ NỢ XẤU (NPL RATIO)", value: placeholder(d.nplRatio, "[X.XX%]"), delta: "[-X.XX% so với đầu năm]", tone: "green" },
    { label: "TỶ LỆ BAO PHỦ NỢ XẤU (LLR)", value: placeholder(d.llrRatio, "[XXX.X%]"), delta: "[Bộ đệm an toàn cao]", tone: "blue" },
    { label: "TỶ LỆ TRÍCH LẬP DỰ PHÒNG", value: placeholder(d.provisionRatio, "[X.XX%]"), delta: "[Tuân thủ Thông tư 11/NHNN]", tone: "yellow" }
  ];
  topKpis.forEach((k, i) => addKpiCard(slide, { x: 0.58 + i * 4.08, y: 1.40, w: 3.75, ...k }));

  // 5-Group Loan Classification Table
  const loanGroups = safeArray(d.loanGroups, [
    ["NHÓM NỢ", "TÊN PHÂN LOẠI", "DƯ NỢ (TỶ VND)", "TỶ TRỌNG", "TRÍCH LẬP"],
    ["Nhóm 1", "Nợ đủ tiêu chuẩn", "[XXX,XXX]", "[XX.X%]", "0%"],
    ["Nhóm 2", "Nợ cần chú ý", "[XX,XXX]", "[X.X%]", "5%"],
    ["Nhóm 3", "Nợ dưới tiêu chuẩn (NPL)", "[X,XXX]", "[X.XX%]", "20%"],
    ["Nhóm 4", "Nợ nghi ngờ (NPL)", "[X,XXX]", "[X.XX%]", "50%"],
    ["Nhóm 5", "Nợ có khả năng mất vốn (NPL)", "[X,XXX]", "[X.XX%]", "100%"]
  ]);

  slide.addTable(styledTableRows(loanGroups), {
    x: 0.58, y: 3.15, w: 12.15, h: 2.85, colW: [1.80, 3.85, 2.50, 2.00, 2.00], rowH: 0.45,
    border: { type: "solid", color: MB.line, pt: 0.8 }, fontFace: FONT.body, fontSize: 12
  });

  // Footer note
  addRect(slide, 0.58, 6.15, 12.15, 0.50, { fill: MB.navy, line: false, radius: 0.08 });
  addText(slide, "[GIẢI PHÁP QUẢN TRỊ]  Tăng cường giám sát sớm nợ Nhóm 2, xử lý quyết liệt nợ xấu và duy trì tỷ lệ bao phủ nợ xấu trên 150%.", 0.88, 6.28, 11.5, 0.25, { fontSize: 12, bold: true, color: MB.white });
  addDataNote(slide);
}

// 33. Collections & Debt Recovery
function collections(pptx, slide, d, ctx) {
  addHeader(slide, { title: placeholder(d.title, "[QUẢN LÝ VÀ TIẾN ĐỘ THU HỒI NỢ]"), eyebrow: "COLLECTIONS & RECOVERY DASHBOARD", index: ctx.index, logoPath: ctx.logoPath });

  // 4 Bucket Cards
  const buckets = safeArray(d.buckets, [
    { name: "BUCKET 1 (1–30 NGÀY)", amt: "[X,XXX TỶ]", rate: "94.5% Thành công", tone: "green" },
    { name: "BUCKET 2 (31–60 NGÀY)", amt: "[XXX TỶ]", rate: "82.1% Thành công", tone: "blue" },
    { name: "BUCKET 3 (61–90 NGÀY)", amt: "[XXX TỶ]", rate: "65.4% Thành công", tone: "yellow" },
    { name: "NỢ XỬ LÝ RỦI RO", amt: "[XXX TỶ]", rate: "[+XX% Thu hồi]", tone: "red" }
  ]);

  buckets.slice(0, 4).forEach((b, i) => {
    const x = 0.58 + i * 3.04;
    addRect(slide, x, 1.45, 2.75, 1.85, { fill: MB.white, line: MB.line, radius: 0.15 });
    addText(slide, b.name, x + 0.20, 1.68, 2.35, 0.25, { fontFace: FONT.head, fontSize: 11, bold: true, color: MB.gray });
    addText(slide, b.amt, x + 0.20, 1.98, 2.35, 0.38, { fontFace: FONT.head, fontSize: 20, bold: true, color: MB.navy });
    addChip(slide, b.rate, x + 0.20, 2.50, 1.60, b.tone);
  });

  // Table Details
  const recoveryTable = safeArray(d.recoveryTable, [
    ["KÊNH THU HỒI NỢ", "SỐ LƯỢNG HỒ SƠ", "QUY MÔ DƯ NỢ", "TỶ LỆ THU HỒI", "TRẠNG THÁI TIẾN ĐỘ"],
    ["1. Tự động qua Digital / Voicebot AI", "[XX,XXX]", "[X,XXX TỶ]", "[XX.X%]", "Đang vận hành hiệu quả"],
    ["2. Call Center & Đơn vị nhắc nợ", "[XX,XXX]", "[X,XXX TỶ]", "[XX.X%]", "Đạt chỉ tiêu SLA"],
    ["3. Pháp lý, tố tụng & Xử lý tài sản ĐB", "[X,XXX]", "[X,XXX TỶ]", "[XX.X%]", "Đang xử lý đúng lộ trình"],
    ["4. Bán nợ VAMC & Tổ chức mua bán nợ", "[XXX]", "[XXX TỶ]", "[XX.X%]", "Hoàn tất hồ sơ"]
  ]);

  slide.addTable(styledTableRows(recoveryTable), {
    x: 0.58, y: 3.55, w: 12.15, h: 2.45, colW: [3.85, 2.00, 2.10, 2.00, 2.20], rowH: 0.48,
    border: { type: "solid", color: MB.line, pt: 0.8 }, fontFace: FONT.body, fontSize: 12
  });

  addRect(slide, 0.58, 6.15, 12.15, 0.50, { fill: MB.lightBlue, line: false, radius: 0.08 });
  addText(slide, "[MỤC TIÊU THU HỒI NĂM]  Hoàn thành thu hồi tối thiểu [X,XXX Tỷ VND] nợ đã xử lý rủi ro, đóng góp trực tiếp vào PnL.", 0.88, 6.28, 11.5, 0.25, { fontSize: 12, bold: true, color: MB.blue });
  addDataNote(slide);
}

// 34. SLA Dashboard
function slaDashboard(pptx, slide, d, ctx) {
  slide.background = { color: MB.background };
  addHeader(slide, { title: placeholder(d.title, "[DASHBOARD CHẤT LƯỢNG DỊCH VỤ & SLA]"), eyebrow: "SERVICE LEVEL AGREEMENT (SLA)", index: ctx.index, logoPath: ctx.logoPath });

  const kpis = safeArray(d.kpis, [
    { label: "CORE BANKING UPTIME", value: "99.99%", delta: "Đạt chuẩn 24/7 Tier 3", tone: "green" },
    { label: "APP RESPONSE TIME", value: "< 180ms", delta: "[-35ms tối ưu hệ thống]", tone: "blue" },
    { label: "THỜI GIAN DUYỆT VAY (TAT)", value: "< 2.5 Giờ", delta: "[Tự động hóa 85%]", tone: "green" },
    { label: "TỶ LỆ VI PHẠM SLA", value: "< 0.08%", delta: "[Trong hạn mức cam kết]", tone: "yellow" }
  ]);
  kpis.slice(0, 4).forEach((k, i) => addKpiCard(slide, { x: 0.58 + i * 2.86, y: 1.35, w: 2.62, ...k }));

  // SLA Channels Table
  const channels = safeArray(d.channels, [
    ["KÊNH / HỆ THỐNG", "CAM KẾT SLA", "THỰC TẾ ĐẠT ĐƯỢC", "CHÊNH LỆCH", "ĐÁNH GIÁ"],
    ["Mobile Banking (App MBBank)", ">= 99.95%", "99.98%", "+0.03%", "XUẤT SẮC"],
    ["Internet Banking Doanh nghiệp (BIZ)", ">= 99.90%", "99.96%", "+0.06%", "XUẤT SẮC"],
    ["Cổng thanh toán & Open API", ">= 99.80%", "99.91%", "+0.11%", "ĐẠT CHUẨN"],
    ["Tổng đài CSKH 1900 545426", "< 30s tiếp nhận", "18s tiếp nhận", "-12s", "ĐẠT CHUẨN"]
  ]);

  slide.addTable(styledTableRows(channels), {
    x: 0.58, y: 3.05, w: 12.15, h: 2.95, colW: [3.85, 2.05, 2.25, 2.00, 2.00], rowH: 0.55,
    border: { type: "solid", color: MB.line, pt: 0.8 }, fontFace: FONT.body, fontSize: 13
  });

  addRect(slide, 0.58, 6.15, 12.15, 0.50, { fill: MB.navy, line: false, radius: 0.08 });
  addText(slide, "[CAM KẾT VẬN HÀNH]  Duy trì độ khả dụng hệ thống 99.99% và liên tục giám sát APM thời gian thực 24/7.", 0.88, 6.28, 11.5, 0.25, { fontSize: 12, bold: true, color: MB.white });
  addDataNote(slide);
}

// 35. Incident Dashboard
function incidentDashboard(pptx, slide, d, ctx) {
  addHeader(slide, { title: placeholder(d.title, "[QUẢN TRỊ SỰ CỐ CÔNG NGHỆ & HẠ TẦNG]"), eyebrow: "IT & OPS INCIDENT MANAGEMENT", index: ctx.index, logoPath: ctx.logoPath });

  // 3 Severity Cards
  const sevs = [
    { sev: "P1 — CRITICAL", count: placeholder(d.p1Count, "0 Sự cố"), time: "MTTR: 0 Phút", tone: "green" },
    { sev: "P2 — MAJOR", count: placeholder(d.p2Count, "2 Sự cố"), time: "MTTR: < 25 Phút", tone: "blue" },
    { sev: "P3 — MINOR", count: placeholder(d.p3Count, "6 Sự cố"), time: "MTTR: < 60 Phút", tone: "yellow" }
  ];
  sevs.forEach((s, i) => {
    const x = 0.58 + i * 4.08;
    addRect(slide, x, 1.45, 3.75, 1.75, { fill: MB.white, line: MB.line, radius: 0.15 });
    addChip(slide, s.sev, x + 0.20, 1.68, 1.40, s.tone);
    addText(slide, s.count, x + 0.20, 2.10, 3.35, 0.40, { fontFace: FONT.head, fontSize: 22, bold: true, color: MB.navy });
    addText(slide, s.time, x + 0.20, 2.65, 3.35, 0.25, { fontSize: 12, color: MB.gray });
  });

  // Incident log table
  const incidentRows = safeArray(d.incidentRows, [
    ["MÃ SỰ CỐ", "HỆ THỐNG ẢNH HƯỞNG", "MỨC ĐỘ", "THỜI GIAN XỬ LÝ", "NGUYÊN NHÂN GỐC RỄ", "TÌNH TRẠNG"],
    ["INC-2026-081", "Cổng kết nối Napas", "P2", "18 phút", "Nghẽn băng thông đường truyền đối tác", "ĐÃ KHẮC PHỤC"],
    ["INC-2026-079", "Hệ thống SMS OTP", "P2", "12 phút", "Nhà mạng chậm phản hồi đầu số", "ĐÃ KHẮC PHỤC"],
    ["INC-2026-074", "Báo cáo nội bộ DWH", "P3", "45 phút", "Job ETL quá tải cuối tháng", "ĐÃ KHẮC PHỤC"]
  ]);

  slide.addTable(styledTableRows(incidentRows), {
    x: 0.58, y: 3.45, w: 12.15, h: 2.55, colW: [1.60, 2.50, 1.10, 1.80, 3.35, 1.80], rowH: 0.50,
    border: { type: "solid", color: MB.line, pt: 0.8 }, fontFace: FONT.body, fontSize: 12
  });

  addRect(slide, 0.58, 6.15, 12.15, 0.50, { fill: MB.lightBlue, line: false, radius: 0.08 });
  addText(slide, "[BIỆN PHÁP PHÒNG NGỪA]  Đã bổ sung cơ chế Auto-failover đường truyền phụ và mở rộng tài nguyên tự động (Auto-scaling).", 0.88, 6.28, 11.5, 0.25, { fontSize: 12, bold: true, color: MB.blue });
  addDataNote(slide);
}

// 36. Root Cause Analysis
function rootCause(pptx, slide, d, ctx) {
  addHeader(slide, { title: placeholder(d.title, "[PHÂN TÍCH NGUYÊN NHÂN GỐC RỄ (RCA)]"), eyebrow: "ROOT CAUSE ANALYSIS (5-WHYS / 4P)", index: ctx.index, logoPath: ctx.logoPath });

  // Top Problem Definition Banner
  addRect(slide, 0.58, 1.40, 12.15, 0.95, { fill: MB.dangerBg, line: MB.red, lineWidth: 1, radius: 0.12 });
  addText(slide, "VẤN ĐỀ TRỌNG TÂM CẦN GIẢI QUYẾT", 0.88, 1.52, 4.0, 0.22, { fontSize: 10, bold: true, color: MB.red });
  addText(slide, placeholder(d.problem, "[Mô tả sự cố hoặc sai lệch mục tiêu kinh doanh/vận hành ghi nhận trong kỳ]"), 0.88, 1.78, 11.5, 0.45, { fontFace: FONT.head, fontSize: 16, bold: true, color: MB.navy });

  // 4 Pillars Breakdown (People, Process, Technology, Policy)
  const pillars = safeArray(d.pillars, [
    { title: "1. CON NGƯỜI (PEOPLE)", cause: "[Thiếu đào tạo quy trình mới / Chưa nắm rõ tính năng cập nhật]" },
    { title: "2. QUY TRÌNH (PROCESS)", cause: "[Điểm nghẽn ở khâu phê duyệt thủ công / Thiếu checklist kiểm soát]" },
    { title: "3. CÔNG NGHỆ (TECH)", cause: "[Chưa đồng bộ dữ liệu Realtime / Timeout kết nối API]" },
    { title: "4. CHÍNH SÁCH (POLICY)", cause: "[Hạn mức phê duyệt chưa linh hoạt theo phân khúc rủi ro]" }
  ]);

  pillars.slice(0, 4).forEach((p, i) => {
    const x = 0.58 + i * 3.04;
    addRect(slide, x, 2.55, 2.75, 2.45, { fill: MB.white, line: MB.line, radius: 0.14 });
    addText(slide, p.title, x + 0.20, 2.75, 2.35, 0.35, { fontFace: FONT.head, fontSize: 12, bold: true, color: MB.blue });
    addLine(slide, x + 0.20, 3.15, 2.35, 0, MB.line, 0.8);
    addText(slide, p.cause, x + 0.20, 3.35, 2.35, 1.45, { fontSize: 12, color: MB.navy });
  });

  // Action Remedy Footer
  addRect(slide, 0.58, 5.25, 12.15, 1.40, { fill: MB.successBg, line: MB.success, lineWidth: 1, radius: 0.14 });
  addText(slide, "[GIẢI PHÁP TRIỆT ĐỂ & BIỆN PHÁP NGĂN NGỪA TÁI DIỄN]", 0.88, 5.42, 6.5, 0.25, { fontSize: 12, bold: true, color: MB.success });
  addText(slide, placeholder(d.solution, "1. Chuẩn hóa quy trình tự động hóa E2E  •  2. Nâng cấp hệ thống cảnh báo sớm  •  3. Tái đào tạo 100% nhân sự."), 0.88, 5.75, 11.5, 0.65, { fontSize: 13, bold: true, color: MB.navy });
  addDataNote(slide);
}

// 37. Controls & Compliance
function controlsCompliance(pptx, slide, d, ctx) {
  addHeader(slide, { title: placeholder(d.title, "[MA TRẬN KIỂM SOÁT & TUÂN THỦ]"), eyebrow: "INTERNAL CONTROLS & COMPLIANCE", index: ctx.index, logoPath: ctx.logoPath });

  // Compliance Table
  const auditRows = safeArray(d.auditRows, [
    ["HẠNG MỤC KIỂM TRA", "QUY ĐỊNH / CHUẨN MỰC", "MỨC ĐỘ RỦI RO", "HIỆN TRẠNG TUÂN THỦ", "HẠN HOÀN THÀNH"],
    ["1. An toàn bảo mật thông tin (ISO 27001)", "NHNN Thông tư 09/2020", "CAO", "ĐẠT 100%", "Đã hoàn thành"],
    ["2. Tỷ lệ an toàn vốn (Basel II / III)", "NHNN Thông tư 41/2016", "CAO", "ĐẠT (CAR 12.5%)", "Đã hoàn thành"],
    ["3. Phòng chống rửa tiền & KYC/eKYC", "Luật PCRT 2022", "TRUNG BÌNH", "ĐẠT 99.8%", "Đang duy trì"],
    ["4. Quản trị rủi ro thanh khoản (LCR/NSFR)", "Chuẩn mực quốc tế", "TRUNG BÌNH", "ĐẠT 100%", "Đang duy trì"],
    ["5. Kiểm tra nội bộ định kỳ Chi nhánh", "Quy chế MB", "THẤP", "HOÀN TẤT 45/45 CN", "Đúng hạn"]
  ]);

  slide.addTable(styledTableRows(auditRows), {
    x: 0.58, y: 1.45, w: 12.15, h: 4.45, colW: [3.85, 2.45, 1.70, 2.30, 1.85], rowH: 0.65,
    border: { type: "solid", color: MB.line, pt: 0.8 }, fontFace: FONT.body, fontSize: 13
  });

  addRect(slide, 0.58, 6.15, 12.15, 0.50, { fill: MB.navy, line: false, radius: 0.08 });
  addText(slide, "[KẾT LUẬN KIỂM TOÁN NỘI BỘ]  Không ghi nhận vi phạm nghiêm trọng; 100% khuyến nghị kiểm toán được theo dõi và xử lý đúng hạn.", 0.88, 6.28, 11.5, 0.25, { fontSize: 12, bold: true, color: MB.white });
  addDataNote(slide);
}

// 38. Decision Matrix
function decisionMatrix(pptx, slide, d, ctx) {
  addHeader(slide, { title: placeholder(d.title, "[MA TRẬN ĐÁNH GIÁ & RA QUYẾT ĐỊNH]"), eyebrow: "DECISION MATRIX & OPTION SCORING", index: ctx.index, logoPath: ctx.logoPath });

  const rows = safeArray(d.rows, [
    ["TIÊU CHÍ ĐÁNH GIÁ (TRỌNG SỐ)", "PHƯƠNG ÁN A (TỰ PHÁT TRIỂN)", "PHƯƠNG ÁN B (MUA GÓI SẴN)", "PHƯƠNG ÁN C (HYBRID ĐỐI TÁC)"],
    ["1. Chi phí đầu tư & CAPEX (25%)", "3/5 — Chi phí nhân sự cao", "2/5 — Phí bản quyền lớn", "4.5/5 — Tối ưu chi phí"],
    ["2. Thời gian triển khai Time-to-Market (30%)", "2.5/5 — Mất 9-12 tháng", "4/5 — Triển khai 3-4 tháng", "4.5/5 — Triển khai 4-5 tháng"],
    ["3. Khả năng tùy biến & Mở rộng (25%)", "5/5 — Làm chủ 100% mã nguồn", "2.5/5 — Bị phụ thuộc Vendor", "4.5/5 — Linh hoạt tích hợp"],
    ["4. Rủi ro vận hành & Bảo mật (20%)", "4/5 — Kiểm soát nội bộ", "3.5/5 — Dữ liệu ngoài", "4.5/5 — Chuẩn Enterprise MB"],
    ["TỔNG ĐIỂM CÓ TRỌNG SỐ (100%)", "3.55 / 5.0", "3.10 / 5.0", "4.50 / 5.0 (KHUYẾN NGHỊ)"]
  ]);

  slide.addTable(styledTableRows(rows), {
    x: 0.58, y: 1.45, w: 12.15, h: 4.45, colW: [3.45, 2.90, 2.90, 2.90], rowH: 0.65,
    border: { type: "solid", color: MB.line, pt: 0.8 }, fontFace: FONT.body, fontSize: 13
  });

  addRect(slide, 0.58, 6.15, 12.15, 0.50, { fill: MB.successBg, line: MB.success, lineWidth: 1, radius: 0.08 });
  addText(slide, "🎯 [LỰA CHỌN TỐI ƯU]: Chọn PHƯƠNG ÁN C (Hybrid) giúp rút ngắn 50% thời gian triển khai và tối ưu 35% tổng chi phí sở hữu (TCO).", 0.88, 6.28, 11.5, 0.25, { fontSize: 12, bold: true, color: MB.success });
  addDataNote(slide);
}

// 39. Scenario Analysis
function scenarioAnalysis(pptx, slide, d, ctx) {
  addHeader(slide, { title: placeholder(d.title, "[PHÂN TÍCH CÁC KỊCH BẢN KINH DOANH]"), eyebrow: "SCENARIO ANALYSIS & STRESS TESTING", index: ctx.index, logoPath: ctx.logoPath });

  const scenarios = safeArray(d.scenarios, [
    {
      name: "KỊCH BẢN THẬN TRỌNG (BEAR CASE)",
      prob: "Xác suất: 20%",
      pbt: "[XX,XXX TỶ]",
      growth: "[+X%]",
      npl: "[X.X%]",
      desc: "Lãi suất biến động, thị trường BĐS phục hồi chậm, tín dụng tăng trưởng chọn lọc.",
      tone: "red"
    },
    {
      name: "KỊCH BẢN CƠ SỞ (BASE CASE - CHÍNH)",
      prob: "Xác suất: 60%",
      pbt: "[XX,XXX TỶ]",
      growth: "[+XX%]",
      npl: "[X.X%]",
      desc: "Kinh tế tăng trưởng ổn định, giải ngân đúng tiến độ, CASA duy trì trên 40%.",
      tone: "blue"
    },
    {
      name: "KỊCH BẢN TÍCH CỰC (BULL CASE)",
      prob: "Xác suất: 20%",
      pbt: "[XX,XXX TỶ]",
      growth: "[+XX%]",
      npl: "[X.X%]",
      desc: "Tín dụng bứt phá, thu ngoài lãi tăng mạnh từ hệ sinh thái số và bancassurance.",
      tone: "green"
    }
  ]);

  scenarios.slice(0, 3).forEach((sc, i) => {
    const x = 0.58 + i * 4.08;
    const toneColor = sc.tone === "green" ? MB.success : sc.tone === "red" ? MB.red : MB.blue;
    addRect(slide, x, 1.45, 3.75, 4.55, { fill: MB.white, line: i === 1 ? MB.blue : MB.line, lineWidth: i === 1 ? 2 : 1, radius: 0.16 });
    
    addRect(slide, x, 1.45, 3.75, 0.85, { fill: i === 1 ? MB.blue : MB.pale, line: false, radius: 0.16 });
    addText(slide, sc.name, x + 0.20, 1.65, 3.35, 0.40, { fontFace: FONT.head, fontSize: 12, bold: true, color: i === 1 ? MB.white : MB.navy });
    addChip(slide, sc.prob, x + 0.20, 2.45, 1.30, sc.tone);

    addText(slide, "Lợi nhuận trước thuế:", x + 0.20, 2.95, 2.0, 0.20, { fontSize: 11, color: MB.gray });
    addText(slide, sc.pbt, x + 2.00, 2.95, 1.55, 0.20, { fontFace: FONT.head, fontSize: 13, bold: true, align: "right", color: toneColor });

    addText(slide, "Tăng trưởng tín dụng:", x + 0.20, 3.30, 2.0, 0.20, { fontSize: 11, color: MB.gray });
    addText(slide, sc.growth, x + 2.00, 3.30, 1.55, 0.20, { fontFace: FONT.head, fontSize: 13, bold: true, align: "right" });

    addText(slide, "Tỷ lệ nợ xấu NPL:", x + 0.20, 3.65, 2.0, 0.20, { fontSize: 11, color: MB.gray });
    addText(slide, sc.npl, x + 2.00, 3.65, 1.55, 0.20, { fontFace: FONT.head, fontSize: 13, bold: true, align: "right" });

    addLine(slide, x + 0.20, 4.05, 3.35, 0, MB.line, 0.8);
    addText(slide, "[ĐIỀU KIỆN & BỐI CẢNH]", x + 0.20, 4.25, 3.35, 0.25, { fontSize: 11, bold: true, color: MB.blue });
    addText(slide, sc.desc, x + 0.20, 4.55, 3.35, 1.25, { fontSize: 12, color: MB.gray });
  });

  addRect(slide, 0.58, 6.15, 12.15, 0.50, { fill: MB.lightBlue, line: false, radius: 0.08 });
  addText(slide, "[KHUYẾN NGHỊ KẾ HOẠCH]  Lấy Kịch bản Cơ sở làm mục tiêu điều hành, chuẩn bị sẵn phương án dự phòng đệm vốn cho Kịch bản Thận trọng.", 0.88, 6.28, 11.5, 0.25, { fontSize: 12, bold: true, color: MB.blue });
  addDataNote(slide);
}

// 40. Project Status
function projectStatus(pptx, slide, d, ctx) {
  addHeader(slide, { title: placeholder(d.title, "[BÁO CÁO TIẾN ĐỘ DỰ ÁN CHIẾN LƯỢC]"), eyebrow: "PROJECT STATUS & PMO DASHBOARD", index: ctx.index, logoPath: ctx.logoPath });

  // Top Project Summary Bar
  addRect(slide, 0.58, 1.40, 12.15, 1.25, { fill: MB.pale, line: MB.line, radius: 0.15 });
  addText(slide, placeholder(d.projectName, "[TÊN DỰ ÁN: CHUYỂN ĐỔI SỐ NỀN TẢNG NGÂN HÀNG LÕI & DIGITAL BANKING]"), 0.90, 1.58, 7.5, 0.35, { fontFace: FONT.head, fontSize: 16, bold: true, color: MB.navy });
  addText(slide, placeholder(d.projectLead, "Project Sponsor: [Ban TGĐ]  •  PM: [Khối CNTT & Khối Vận Hành]"), 0.90, 1.95, 7.5, 0.25, { fontSize: 12, color: MB.gray });

  // 4 RAG Status Indicators
  addChip(slide, "SCOPE: ON TRACK", 8.80, 1.55, 1.80, "green");
  addChip(slide, "TIME: ON TRACK", 10.80, 1.55, 1.70, "green");
  addChip(slide, "BUDGET: IN CONTROL", 8.80, 2.05, 1.80, "blue");
  addChip(slide, "RISK: MANAGED", 10.80, 2.05, 1.70, "green");

  // Milestones & Workstreams
  addRect(slide, 0.58, 2.80, 7.80, 3.20, { fill: MB.white, line: MB.line, radius: 0.15 });
  addText(slide, "[CÁC MỐC TIẾN ĐỘ CHÍNH (MILESTONES)]", 0.90, 3.02, 5.0, 0.28, { fontFace: FONT.head, fontSize: 14, bold: true, color: MB.blue });

  const milestones = safeArray(d.milestones, [
    { phase: "M1. Khảo sát & Thiết kế kiến trúc giải pháp", status: "100% Hoàn thành", date: "Q1/2026", tone: "green" },
    { phase: "M2. Phát triển phần mềm & Tích hợp Core API", status: "85% Đang làm", date: "Q2/2026", tone: "blue" },
    { phase: "M3. Kiểm thử người dùng (UAT) & Stress test", status: "Chuẩn bị", date: "Q3/2026", tone: "yellow" },
    { phase: "M4. Golive toàn hệ thống & Chuyển giao", status: "Kế hoạch", date: "Q4/2026", tone: "gray" }
  ]);

  milestones.forEach((m, i) => {
    const y = 3.40 + i * 0.62;
    addText(slide, m.phase, 0.90, y, 4.8, 0.24, { fontSize: 12, bold: true });
    addText(slide, m.date, 5.80, y, 0.8, 0.24, { fontSize: 11, color: MB.gray });
    addChip(slide, m.status, 6.70, y - 0.05, 1.45, m.tone);
  });

  // Next Steps & Escalations
  addRect(slide, 8.60, 2.80, 4.13, 3.20, { fill: MB.white, line: MB.line, radius: 0.15 });
  addText(slide, "[HÀNH ĐỘNG TUẦN TỚI]", 8.90, 3.02, 3.5, 0.28, { fontFace: FONT.head, fontSize: 14, bold: true, color: MB.navy });
  const nextActions = safeArray(d.nextActions, [
    "1. Hoàn tất kết nối 15 API thanh toán",
    "2. Tổ chức đào tạo UAT đợt 1 cho 200 user",
    "3. Trình phê duyệt ngân sách bảo mật bổ sung"
  ]);
  nextActions.forEach((act, i) => {
    addText(slide, act, 8.90, 3.45 + i * 0.70, 3.6, 0.60, { fontSize: 12, color: MB.navy });
  });

  // Footer
  addRect(slide, 0.58, 6.15, 12.15, 0.50, { fill: MB.lightBlue, line: false, radius: 0.08 });
  addText(slide, "[KẾT LUẬN PMO]  Dự án bám sát tiến độ đề ra, dự kiến hoàn thành đúng hạn Golive trong Quý 4/2026.", 0.88, 6.28, 11.5, 0.25, { fontSize: 12, bold: true, color: MB.blue });
  addDataNote(slide);
}

// -------------------------------------------------------------
// COMPLETE 40 LAYOUT REGISTRY
// -------------------------------------------------------------
export const layoutRegistry = {
  // 24 Base Layouts
  cover_light: coverLight,
  cover_gradient: coverGradient,
  agenda,
  section_divider: sectionDivider,
  executive_summary: executiveSummary,
  key_message: keyMessage,
  kpi_overview: kpiOverview,
  financial_dashboard: financialDashboard,
  trend,
  plan_actual: planActual,
  composition,
  data_table: dataTable,
  comparison,
  cx_dashboard: cxDashboard,
  funnel,
  problem_solution: problemSolution,
  process: processFlow,
  risk_matrix: riskMatrix,
  roadmap,
  ui_showcase: uiShowcase,
  case_study: caseStudy,
  closing,
  quote,
  action_tracker: actionTracker,

  // 16 New Extended Layouts
  data_insight_split: dataInsightSplit,
  balance_sheet: balanceSheet,
  pnl_bridge: pnlBridge,
  cash_flow: cashFlow,
  segment_performance: segmentPerformance,
  region_performance: regionPerformance,
  cib_portfolio: cibPortfolio,
  credit_quality: creditQuality,
  collections,
  sla_dashboard: slaDashboard,
  incident_dashboard: incidentDashboard,
  root_cause: rootCause,
  controls_compliance: controlsCompliance,
  decision_matrix: decisionMatrix,
  scenario_analysis: scenarioAnalysis,
  project_status: projectStatus
};

export function renderSlide(pptx, slide, data, ctx) {
  const renderer = layoutRegistry[data.layout];
  if (!renderer) throw new Error(`Layout không được hỗ trợ: ${data.layout}`);
  renderer(pptx, slide, data, ctx);
}
