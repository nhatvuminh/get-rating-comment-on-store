import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pptxgen from "pptxgenjs";
import { MB, FONT } from "./theme.mjs";
import { renderSlide, layoutRegistry } from "./layouts.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const inputPath = path.resolve(process.cwd(), process.argv[2] ?? path.join(root, "input/example-deck.json"));
const outputPath = path.resolve(process.cwd(), process.argv[3] ?? path.join(root, "output/MB_Generated.pptx"));
const logoPath = path.join(root, "assets/mb_logo.png");

if (!fs.existsSync(inputPath)) throw new Error(`Không tìm thấy input: ${inputPath}`);
if (!fs.existsSync(logoPath)) throw new Error(`Không tìm thấy logo: ${logoPath}`);

const deck = JSON.parse(fs.readFileSync(inputPath, "utf8"));
if (!Array.isArray(deck.slides) || deck.slides.length === 0) throw new Error("Input phải có mảng slides không rỗng.");

for (const [i, item] of deck.slides.entries()) {
  if (!layoutRegistry[item.layout]) throw new Error(`Slide ${i + 1}: layout '${item.layout}' chưa được hỗ trợ.`);
  if ((item.title ?? "").length > 86) console.warn(`Slide ${i + 1}: title dài, nên rút gọn để tránh xuống dòng.`);
}

fs.mkdirSync(path.dirname(outputPath), { recursive: true });

const pptx = new pptxgen();
pptx.layout = "LAYOUT_WIDE";
pptx.author = deck.meta?.author ?? "MB Presentation Generator";
pptx.company = deck.meta?.company ?? "MB";
pptx.subject = deck.meta?.subject ?? "Finance & Banking Presentation";
pptx.title = deck.meta?.title ?? "MB Finance Banking Presentation";
pptx.lang = "vi-VN";
pptx.theme = {
  headFontFace: FONT.head,
  bodyFontFace: FONT.body,
  lang: "vi-VN"
};

pptx.defineSlideMaster({
  title: "MB_STANDARD",
  background: { color: MB.white },
  objects: []
});
pptx.defineSlideMaster({
  title: "MB_DARK",
  background: { color: MB.navy },
  objects: []
});

deck.slides.forEach((item, index) => {
  const darkLayouts = new Set(["cover_gradient", "section_divider", "closing"]);
  const slide = pptx.addSlide({ masterName: darkLayouts.has(item.layout) ? "MB_DARK" : "MB_STANDARD" });
  slide.background = { color: darkLayouts.has(item.layout) ? MB.navy : MB.white };
  renderSlide(pptx, slide, item, { index: index + 1, logoPath, deck });
  slide.addNotes(`[Sources]\n- MB Brand System do người dùng cung cấp.\n- Nội dung slide được đọc từ ${path.basename(inputPath)}.`);
});

await pptx.writeFile({ fileName: outputPath, compression: true });
console.log(`Đã tạo: ${outputPath}`);
