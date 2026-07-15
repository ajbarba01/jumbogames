/**
 * Hand-drawn background layer: scattered low-opacity doodles (asterisks,
 * squiggles, a star) fixed behind every surface. Per docs/UI.md the doodle
 * register lives on the background only, never on components. Decorative and
 * aria-hidden; colors are theme tokens so a scale swap recolors them.
 */

type Doodle = {
  left: string;
  top: string;
  opacity: number;
  rotate?: number;
  w: number;
  h: number;
  box: string;
  d: string;
  stroke: string;
  sw: number;
};

const CREAM = "var(--color-s12)";
const YELLOW = "var(--color-accent)";
const PINK = "var(--color-accent-2)";

const DOODLES: Doodle[] = [
  {
    left: "4%",
    top: "6%",
    opacity: 0.1,
    w: 42,
    h: 42,
    box: "0 0 42 42",
    d: "M21 4 L21 38 M6 13 L36 29 M36 13 L6 29",
    stroke: CREAM,
    sw: 3,
  },
  {
    left: "88%",
    top: "9%",
    opacity: 0.13,
    rotate: 15,
    w: 46,
    h: 24,
    box: "0 0 46 24",
    d: "M3 18 C 10 6, 16 20, 24 10 S 38 4, 43 12",
    stroke: YELLOW,
    sw: 3.5,
  },
  {
    left: "72%",
    top: "3%",
    opacity: 0.09,
    rotate: -10,
    w: 34,
    h: 34,
    box: "0 0 34 34",
    d: "M8 8 L26 26 M26 8 L8 26",
    stroke: CREAM,
    sw: 3,
  },
  {
    left: "10%",
    top: "26%",
    opacity: 0.08,
    rotate: 8,
    w: 52,
    h: 52,
    box: "0 0 52 52",
    d: "M26 6 C 40 6, 46 16, 44 27 C 42 40, 30 47, 19 43 C 9 40, 5 29, 10 20 C 14 12, 22 10, 28 14",
    stroke: CREAM,
    sw: 3,
  },
  {
    left: "92%",
    top: "34%",
    opacity: 0.11,
    rotate: -18,
    w: 40,
    h: 40,
    box: "0 0 40 40",
    d: "M20 3 L20 37 M5 11 L35 29 M35 11 L5 29",
    stroke: PINK,
    sw: 3,
  },
  {
    left: "3%",
    top: "48%",
    opacity: 0.12,
    rotate: -6,
    w: 58,
    h: 30,
    box: "0 0 58 30",
    d: "M4 22 C 14 8, 22 24, 32 12 S 48 6, 54 14 M46 6 L55 13 L45 19",
    stroke: YELLOW,
    sw: 3,
  },
  {
    left: "85%",
    top: "55%",
    opacity: 0.08,
    rotate: 12,
    w: 44,
    h: 44,
    box: "0 0 44 44",
    d: "M22 5 L26 17 L38 17 L28 24 L32 37 L22 29 L12 37 L16 24 L6 17 L18 17 Z",
    stroke: CREAM,
    sw: 2.6,
  },
  {
    left: "14%",
    top: "70%",
    opacity: 0.1,
    rotate: 20,
    w: 36,
    h: 36,
    box: "0 0 36 36",
    d: "M18 4 L18 32 M6 10 L30 26 M30 10 L6 26",
    stroke: CREAM,
    sw: 3,
  },
  {
    left: "68%",
    top: "76%",
    opacity: 0.12,
    rotate: -8,
    w: 50,
    h: 26,
    box: "0 0 50 26",
    d: "M3 18 C 11 6, 18 22, 27 11 S 42 5, 47 13",
    stroke: PINK,
    sw: 3.5,
  },
  {
    left: "40%",
    top: "88%",
    opacity: 0.09,
    rotate: 6,
    w: 38,
    h: 38,
    box: "0 0 38 38",
    d: "M10 10 L28 28 M28 10 L10 28",
    stroke: YELLOW,
    sw: 3,
  },
  {
    left: "52%",
    top: "14%",
    opacity: 0.07,
    rotate: -14,
    w: 46,
    h: 46,
    box: "0 0 46 46",
    d: "M23 5 C 35 5, 41 14, 39 24 C 37 35, 26 41, 16 38 C 8 35, 4 26, 8 18",
    stroke: CREAM,
    sw: 2.8,
  },
  {
    left: "28%",
    top: "40%",
    opacity: 0.07,
    rotate: 24,
    w: 30,
    h: 30,
    box: "0 0 30 30",
    d: "M15 3 L15 27 M4 8 L26 22 M26 8 L4 22",
    stroke: CREAM,
    sw: 2.6,
  },
];

export function Doodles(): React.JSX.Element {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10">
      {DOODLES.map((doodle, i) => (
        <svg
          key={i}
          width={doodle.w}
          height={doodle.h}
          viewBox={doodle.box}
          className="absolute"
          style={{
            left: doodle.left,
            top: doodle.top,
            opacity: doodle.opacity,
            transform: doodle.rotate
              ? `rotate(${doodle.rotate}deg)`
              : undefined,
          }}
        >
          <path
            d={doodle.d}
            stroke={doodle.stroke}
            strokeWidth={doodle.sw}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ))}
    </div>
  );
}
