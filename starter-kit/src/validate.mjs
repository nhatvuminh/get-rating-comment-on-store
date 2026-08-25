import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const input = path.resolve(process.cwd(), process.argv[2] ?? path.join(here, "../input/example-deck.json"));
const deck = JSON.parse(fs.readFileSync(input, "utf8"));
const errors = [];
const warnings = [];

if (!Array.isArray(deck.slides) || deck.slides.length === 0) errors.push("slides phải là một mảng và không được rỗng.");
for (const [i, slide] of (deck.slides ?? []).entries()) {
  if (!slide.layout) errors.push(`Slide ${i + 1}: thiếu layout.`);
  if ((slide.title ?? "").length > 76) warnings.push(`Slide ${i + 1}: title dài hơn 76 ký tự, nên rút gọn.`);
  if ((slide.body ?? "").length > 420) warnings.push(`Slide ${i + 1}: body dài hơn 420 ký tự, nên tách slide.`);
}

if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}
console.log(`OK: ${deck.slides.length} slide hợp lệ.`);
if (warnings.length) console.warn(warnings.join("\n"));
