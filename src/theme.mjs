export const MB = {
  blue: "171EDB",
  blue2: "3157F5",
  red: "F50912",
  navy: "081235",
  gray: "8A91A8",
  lightBlue: "E9ECFF",
  background: "F3F5F4",
  white: "FFFFFF",
  line: "DDE2EE",
  pale: "F8F9FC",
  success: "0E9F6E",
  successBg: "E9F8F1",
  warning: "F59E0B",
  warningBg: "FFF6DF",
  dangerBg: "FFF0F1"
};

export const FONT = {
  head: "Segoe UI",
  body: "Calibri"
};

export const SLIDE = {
  width: 13.333,
  height: 7.5,
  marginX: 0.58,
  footerY: 7.05
};

export const BRAND_RULES = {
  ratio: "16:9",
  gridColumns: 12,
  spacingPx: [4, 8, 12, 16, 24, 32, 48],
  radiusPx: [8, 12, 16],
  minimumBodyPt: 16,
  minimumCaptionPt: 11,
  primaryGradient: [MB.blue, MB.blue2]
};

export const px = (value) => value / 96;
