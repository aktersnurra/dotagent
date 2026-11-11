# Color

Provenance tags: **[video]** heuristic from design talks, **[practice]** established
practice.

## Build a palette in this order

1. **One primary (brand) color.** Choose by what the product should feel like, not by
   taste alone. Common associations [video]: blue = trust, red = danger/urgency,
   yellow = warning, green = success. Treat these as defaults, not laws.
2. **Neutrals.** A gray ramp, ideally tinted slightly toward the primary's hue so grays
   feel related to it [practice]. Most of the UI is neutral.
3. **Derive a ramp from the primary** [video]: lighten for backgrounds and chips, darken
   for text on those backgrounds. ~9–11 steps (50–950). Keep hue steady, vary lightness,
   ease chroma at both ends.
4. **Semantic colors**: success, warning, danger, info, each with the same ramp shape
   [video]. Used for states, chips, validation, charts.
5. **Optional accent**: one, only if the primary cannot carry emphasis.

Build ramps in a perceptual space such as OKLCH so equal lightness steps look equal
across hues [practice]. Raw HSL ramps look uneven (yellow looks far brighter than blue
at the same L).

## Proportions

Roughly 60% neutral surface, 30% secondary/neutral UI, 10% primary/accent [practice].
Accent loses power when spread widely. "Let the color find you" [video]: start neutral
and add color where it _means_ something (a focus state, a new-item chip, an announcement
bar).

## Harmony (when you need more than one hue)

- **Analogous** (neighbors on the wheel): calm, low risk.
- **Complementary** (opposites): high energy; use one as dominant, the other sparingly.
- **Triadic/split**: only with strong restraint.

For product UI, one primary plus semantic colors usually beats a multi-hue scheme.

## Contrast

- Body text 4.5:1, large text (18px+ or 14px+ bold) and UI components 3:1 (WCAG AA)
  [practice].
- Compute it; do not eyeball. Do not rely on color alone to convey state; pair it with
  an icon or text.
- Placeholder and disabled text still need to be legible enough to read.

## Dark mode

[video unless noted]

- Lower border contrast; bright borders glare.
- No shadows. Make raised surfaces _lighter_ than the background.
- Reduce saturation and brightness of bright chips; flip tint/shade roles for text.
- Backgrounds may be a very dark tint of the brand hue (deep purple, green, red), not
  only navy or gray.
- Pure black backgrounds with pure white text are harsh; step both in.
- Derive dark tokens deliberately; do not just invert the light ramp [practice].

## Color for data

Use a separate, validated categorical palette for charts and keep semantic colors
reserved for status. For chart color decisions use the `dataviz` skill when available.

## Common mistakes

- Too bright and saturated everywhere; soften the palette until one thing leads.
- Color used decoratively instead of meaningfully.
- Many unrelated hues; the product reads as unfinished.
- Text on tinted backgrounds that was never contrast-checked.
