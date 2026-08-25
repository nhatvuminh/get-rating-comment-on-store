# MB Antigravity Slide Generator Starter Kit

Bộ mã nguồn tạo PowerPoint `.pptx` theo MB Brand System, dùng được trong dự án Node.js thông thường và có thể giao cho Antigravity tiếp tục phát triển thành tool hoàn chỉnh.

## Có sẵn

- Engine JSON → PowerPoint bằng PptxGenJS.
- 24 layout đã code: cover, agenda, section, executive summary, KPI, dashboard tài chính, trend, plan vs actual, composition, table, comparison, CX/VOC, funnel, problem–solution, process, risk matrix, roadmap, UI showcase, case study, quote, action tracker và closing.
- Theme MB tập trung trong `src/theme.mjs`.
- Logo MB và bộ tham chiếu thiết kế.
- Native chart, table, card, timeline và shape; không xuất cả slide thành ảnh.
- Speaker notes ghi nguồn tham chiếu.
- JSON Schema và kiểm tra đầu vào.

## Cấu trúc

```text
assets/                         Logo MB
input/example-deck.json         Nội dung mẫu
input/content-schema.json       Schema dữ liệu
input/layout-catalog.json       24 layout có sẵn + 16 layout cần mở rộng
reference/                      Brand kit, deck chuẩn và contact sheet
src/theme.mjs                   Color/font/grid tokens
src/helpers.mjs                 Thành phần dùng lại
src/layouts.mjs                 Layout renderers
src/validate.mjs                Kiểm tra JSON
src/generate.mjs                Entry point tạo PPTX
ANTIGRAVITY_PROMPT.txt          Prompt giao việc cho Antigravity
```

## Chạy project

Yêu cầu: Node.js 20+ và cài font `Space Grotesk`, `Inter` trên máy.

```bash
npm install
npm run validate
npm run generate
```

File demo xuất tại:

```text
output/MB_Demo_Generated.pptx
```

Tạo deck từ JSON khác:

```bash
node src/generate.mjs input/your-deck.json output/your-deck.pptx
```

## Quy tắc nội dung đầu vào

- Mỗi slide bắt buộc có `layout`.
- Nội dung thiếu được thay bằng placeholder tiếng Việt, không dùng Lorem Ipsum.
- Dữ liệu mẫu phải ghi `Dữ liệu minh họa`.
- Tiêu đề nên dưới 76 ký tự và không được chủ động cho xuống hai dòng.
- Không tạo số liệu hoặc kết luận kinh doanh nếu input không cung cấp.

Ví dụ:

```json
{
  "layout": "kpi_overview",
  "title": "[TỔNG QUAN CHỈ SỐ]",
  "kpis": [
    { "label": "[DOANH THU]", "value": "[XXX TỶ VND]", "delta": "[+XX%]", "tone": "green" },
    { "label": "[CHI PHÍ]", "value": "[XXX TỶ VND]", "delta": "[±XX%]", "tone": "red" }
  ]
}
```

## Khi đưa vào Antigravity

1. Giải nén toàn bộ thư mục và mở thư mục project trong Antigravity.
2. Dán nội dung `ANTIGRAVITY_PROMPT.txt` vào agent.
3. Yêu cầu Antigravity chạy `npm install`, `npm run generate` trước khi sửa code.
4. Sau đó cho agent mở rộng 16 layout còn lại trong `input/layout-catalog.json`.
5. Giữ nguyên public JSON contract để tool/web UI có thể gọi engine ổn định.

## Nguyên tắc kỹ thuật bắt buộc

- Không tạo slide bằng screenshot hoặc ảnh phẳng.
- Logo luôn dùng file gốc, giữ tỷ lệ và màu sắc.
- Chỉ dùng palette trong `src/theme.mjs`; xanh lá/vàng chỉ dùng cho trạng thái dữ liệu.
- Body không dưới 16 pt, caption không dưới 11 pt trong phiên bản production.
- Chart tối đa 2–4 màu, không 3D.
- Mọi title một dòng; nếu dài phải rút gọn hoặc đổi layout.
- Sau mỗi thay đổi layout phải tạo PPTX demo và render để kiểm tra clipping/overlap.

PptxGenJS là thư viện MIT và có thể chạy bằng Node.js, trình duyệt hoặc React. Nguồn chính thức: https://github.com/gitbrent/PptxGenJS
