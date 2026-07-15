/** Pure OKLCH / WCAG / colorblind math for grading the theme palette. No IO, no
 *  dependencies — the theme test consumes these to assert every token's
 *  lightness, hue, contrast, and mutual separation. Conversions follow Björn
 *  Ottosson's OKLab; CVD uses the Viénot–Brettel LMS approximation. */

type Rgb = [number, number, number];

function hexToRgb(hex: string): Rgb {
  const h = hex.replace("#", "");
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255) as Rgb;
}
function toLinear(c: number): number {
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}
function toGamma(c: number): number {
  return c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
}
function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (x: number) => Math.round(Math.max(0, Math.min(1, x)) * 255);
  return (
    "#" + [r, g, b].map((x) => clamp(x).toString(16).padStart(2, "0")).join("")
  );
}

function srgbToOklab(hex: string): [number, number, number] {
  const [r, g, b] = hexToRgb(hex).map(toLinear) as Rgb;
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}

export function hexToOklch(hex: string): { L: number; C: number; H: number } {
  const [L, a, b] = srgbToOklab(hex);
  const C = Math.hypot(a, b);
  let H = (Math.atan2(b, a) * 180) / Math.PI;
  if (H < 0) H += 360;
  return { L, C, H };
}

function relativeLuminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map(toLinear) as Rgb;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
export function wcagContrast(a: string, b: string): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const hi = Math.max(la, lb);
  const lo = Math.min(la, lb);
  return (hi + 0.05) / (lo + 0.05);
}

export function deltaE(a: string, b: string): number {
  const x = srgbToOklab(a);
  const y = srgbToOklab(b);
  return Math.hypot(x[0] - y[0], x[1] - y[1], x[2] - y[2]);
}

export function simulateCvd(hex: string, type: "deut" | "prot"): string {
  const [r, g, b] = hexToRgb(hex).map(toLinear) as Rgb;
  const L = 17.8824 * r + 43.5161 * g + 4.11935 * b;
  const M = 3.45565 * r + 27.1554 * g + 3.86714 * b;
  const S = 0.0299566 * r + 0.184309 * g + 1.46709 * b;
  let l2: number;
  let m2: number;
  const s2 = S;
  if (type === "prot") {
    l2 = 2.02344 * M - 2.52581 * S;
    m2 = M;
  } else {
    l2 = L;
    m2 = 0.494207 * L + 1.24827 * S;
  }
  const rr = 0.080944448 * l2 - 0.130504409 * m2 + 0.116721066 * s2;
  const gg = -0.0102485335 * l2 + 0.0540193266 * m2 - 0.113614708 * s2;
  const bb = -0.000365296938 * l2 - 0.00412161469 * m2 + 0.693511405 * s2;
  return rgbToHex(toGamma(rr), toGamma(gg), toGamma(bb));
}
