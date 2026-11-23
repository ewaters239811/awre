import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import postcss from "postcss";

const css = fs.readFileSync(
  new URL("../app/globals.css", import.meta.url),
  "utf8",
);
const root = postcss.parse(css);
const tokens = new Map();
root.walkRules((rule) => {
  if (rule.selectors?.includes(":root"))
    rule.walkDecls((decl) => tokens.set(decl.prop, decl.value));
});

function rgb(token) {
  const [h, s, l] = tokens
    .get(`--${token}`)
    .split(/\s+/)
    .map(Number.parseFloat);
  const saturation = s / 100;
  const lightness = l / 100;
  const a = saturation * Math.min(lightness, 1 - lightness);
  return [0, 8, 4].map((offset) => {
    const k = (offset + h / 30) % 12;
    return 255 * (lightness - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)));
  });
}
function luminance(color) {
  return color
    .map((value) => {
      const channel = value / 255;
      return channel <= 0.04045
        ? channel / 12.92
        : ((channel + 0.055) / 1.055) ** 2.4;
    })
    .reduce(
      (sum, value, index) => sum + value * [0.2126, 0.7152, 0.0722][index],
      0,
    );
}
function contrast(first, second) {
  const values = [luminance(first), luminance(second)];
  return (Math.max(...values) + 0.05) / (Math.min(...values) + 0.05);
}

test("the shared dark palette restores olive, ivory, and champagne colors", () => {
  const expected = {
    background: "0a0b09",
    card: "141613",
    primary: "9cb78f",
    "primary-soft": "a6bb9a",
    foreground: "f5f0e5",
    achievement: "d1b97e",
  };
  for (const [token, hex] of Object.entries(expected)) {
    const channels = hex.match(/../g).map((part) => parseInt(part, 16));
    rgb(token).forEach((value, index) =>
      assert.ok(Math.abs(value - channels[index]) < 0.6, token),
    );
  }
  const themedRules = [];
  root.walkRules((rule) => {
    if (rule.selectors?.includes(":root")) themedRules.push(rule);
  });
  assert.equal(themedRules.length, 1);
  assert.deepEqual(themedRules[0].selectors, [
    ":root",
    "html.light",
    "html.dark",
  ]);
});

test("the new palette maintains readable text, primary controls, placeholders, and focus and input boundaries", () => {
  for (const [foreground, background] of [
    ["foreground", "background"],
    ["muted-foreground", "card"],
    ["primary-foreground", "primary"],
    ["achievement", "card"],
  ])
    assert.ok(
      contrast(rgb(foreground), rgb(background)) >= 4.5,
      `${foreground} on ${background}`,
    );
  assert.ok(contrast(rgb("input"), rgb("card")) >= 3);
  assert.ok(contrast(rgb("ring"), rgb("background")) >= 3);
  for (const stop of ["primary-soft", "foreground", "achievement"])
    assert.ok(contrast(rgb("primary-foreground"), rgb(stop)) >= 4.5);
  const placeholder = rgb("muted-foreground").map(
    (value, index) => value * 0.85 + rgb("card")[index] * 0.15,
  );
  assert.ok(contrast(placeholder, rgb("card")) >= 4.5);
});

test("olive surfaces and shared controls do not retain the teal or brown palettes", () => {
  assert.ok(
    !/#8bcbc1|#d1af89|#1c1917|#2a2420/i.test(css),
  );
  root.walkRules((rule) => {
    if (["body", "html.light body", "html.dark body"].includes(rule.selector))
      rule.walkDecls("background", (decl) => {
        assert.ok(decl.value.includes("var(--page-background)"));
        assert.ok(decl.value.includes("hsl(var(--background))"));
      });
  });
  for (const file of [
    "components/ui/button.tsx",
    "components/ui/slider.tsx",
    "components/navigation.tsx",
    "components/daily-flow.tsx",
  ]) {
    const source = fs.readFileSync(
      new URL(`../${file}`, import.meta.url),
      "utf8",
    );
    assert.ok(source.includes("bg-primary"), file);
    assert.ok(!/#8bcbc1|#d1af89|#1c1917|#2a2420/i.test(source), file);
  }
});

test("immersive motion is decorative and never animates layout dimensions or score values", () => {
  const names = [];
  const allowed = new Set(["opacity", "transform", "filter", "stroke-dashoffset"]);
  root.walkAtRules("keyframes", (rule) => {
    if (!rule.params.startsWith("clearpth-")) return;
    names.push(rule.params);
    rule.walkDecls((decl) => assert.ok(allowed.has(decl.prop), decl.prop));
  });
  assert.deepEqual(names.sort(), ["clearpth-page-enter", "clearpth-reveal", "clearpth-ring-breathe", "clearpth-ring-draw"]);
  let sheenBlocksClicks = true;
  root.walkRules((rule) => {
    if (rule.selector === ".clearpth-primary-button::after")
      rule.walkDecls("pointer-events", (decl) => { sheenBlocksClicks = decl.value !== "none"; });
  });
  assert.equal(sheenBlocksClicks, false);
});

test("reduced-motion preferences disable animation and transitions without hiding content", () => {
  const reduced = root.nodes.find((node) => node.type === "atrule" && node.name === "media" && node.params === "(prefers-reduced-motion: reduce)");
  assert.ok(reduced);
  const disabled = new Set();
  reduced.walkDecls((decl) => {
    if (["animation", "transition"].includes(decl.prop) && decl.value === "none" && decl.important) disabled.add(decl.prop);
    assert.ok(!["display", "visibility", "opacity"].includes(decl.prop));
  });
  assert.equal(disabled.size, 2);
});
