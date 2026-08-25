import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pptxgen from "pptxgenjs";
import { MB, FONT } from "./theme.mjs";
import { renderSlide, layoutRegistry } from "./layouts.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");

export async function generateDeckPptx(deck, outputPath = null, options = {}) {
  if (!deck || !Array.isArray(deck.slides) || deck.slides.length === 0) {
    throw new Error("Dữ liệu deck không hợp lệ hoặc danh sách slide trống.");
  }

  const logoPath = options.logoPath || path.join(root, "assets/mb_logo.png");
  const validLogoPath = fs.existsSync(logoPath) ? logoPath : null;

  const pptx = new pptxgen();
  pptx.defineLayout({ name: "WIDE_16_9", width: 13.333, height: 7.5 });
  pptx.layout = "WIDE_16_9";
  pptx.author = deck.meta?.author ?? "MB Slide Generator";
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

  const darkLayouts = new Set(["cover_gradient", "section_divider", "closing"]);

  deck.slides.forEach((item, index) => {
    if (!layoutRegistry[item.layout]) {
      console.warn(`Slide ${index + 1}: Layout '${item.layout}' chưa được đăng ký, fallback sang 'executive_summary'.`);
      item.layout = "executive_summary";
    }

    const isDark = darkLayouts.has(item.layout);
    const slide = pptx.addSlide({ masterName: isDark ? "MB_DARK" : "MB_STANDARD" });
    slide.background = { color: isDark ? MB.navy : MB.white };
    renderSlide(pptx, slide, item, { index: index + 1, logoPath: validLogoPath, deck });
    slide.addNotes(`[Sources]\n- MB Brand System Presentation Engine.\n- Layout: ${item.layout}\n- Slide ${index + 1} of ${deck.slides.length}.`);
  });

  if (outputPath) {
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    await pptx.writeFile({ fileName: outputPath, compression: true });
    return { success: true, outputPath };
  } else {
    // Generate as stream buffer for API responses
    const buffer = await pptx.write({ outputType: "nodebuffer" });
    return { success: true, buffer };
  }
}

// CLI entry point
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const inputPath = path.resolve(process.cwd(), process.argv[2] ?? path.join(root, "starter-kit/input/example-deck.json"));
  const outputPath = path.resolve(process.cwd(), process.argv[3] ?? path.join(root, "output/MB_Generated.pptx"));

  if (!fs.existsSync(inputPath)) throw new Error(`Không tìm thấy input: ${inputPath}`);
  const deck = JSON.parse(fs.readFileSync(inputPath, "utf8"));
  await generateDeckPptx(deck, outputPath);
  console.log(`Đã tạo thành công file PPTX: ${outputPath}`);
}
