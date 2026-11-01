#!/usr/bin/env node
/**
 * Generates the 6 avatar SVGs in public/avatars/.
 * Deterministic gradient initial avatars — edit NAMES or palette and re-run:
 *
 *   node scripts/generate-avatars.mjs
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = join(root, "public", "avatars");
mkdirSync(outDir, { recursive: true });

const NAMES = ["Maya Ito", "Ravi Menon", "Iris Kato", "Kenji Oda", "Sofia Lange", "Owen Park"];
const PALETTE = [
  ["#8f7bff", "#5537d4"],
  ["#34d9c3", "#0f766e"],
  ["#e479f3", "#a21caf"],
  ["#f5b544", "#b45309"],
  ["#5aa2ff", "#1d4ed8"],
  ["#f59e4b", "#c2410c"],
];

const initials = (name) =>
  name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .toUpperCase();

const svg = (name, [a, b]) => `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${a}"/>
      <stop offset="1" stop-color="${b}"/>
    </linearGradient>
  </defs>
  <rect width="64" height="64" rx="32" fill="url(#g)"/>
  <text x="32" y="41" font-family="Manrope, sans-serif" font-size="24" font-weight="800" fill="#ffffff" text-anchor="middle">${initials(name)}</text>
</svg>
`;

NAMES.forEach((name, i) => {
  const file = join(outDir, `avatar-${i + 1}.svg`);
  writeFileSync(file, svg(name, PALETTE[i % PALETTE.length]));
  console.log("wrote", file);
});
