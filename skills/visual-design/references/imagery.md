# Imagery

Provenance tags: **[video]** heuristic from design talks, **[practice]** established
practice. Imagery had the thinnest source material; most of this file is practice. Treat
prompt advice as a starting point to iterate on.

## What images are for

[video] Images add a pop of color and make scanning fast. A logo says who is selling; a
photo says what you get. An image in a list can _identify_ or _create appetite_; appetite
needs real space (a 56px thumbnail will not do it). Prefer full-width or large images
when the image is the product.

Choose the image role per slot: identify, persuade, or decorate. Drop decorative images
that do not earn their space.

## Consistency across a catalog

[video] Pick a treatment that keeps working for every item (natural look, clean
background, same crop and framing), so the whole catalog follows one visual system.
Put text (name, numbers) beside or below the image rather than on it, so cards look the
same whatever image arrives.

## Directing image generation (AI or commissioned)

1. **Gather references first** [video]: similar apps, Pinterest-style boards, art styles.
   Name what you borrow.
2. **Choose a named art direction** [video + practice]: style (flat vector, 3D clay,
   boho hand-drawn, photographic), palette (tie it to your color tokens), light, mood,
   and what to avoid. One direction per product.
3. **Write the spec before generating** [video]: product requirements, screen list, then
   generate each screen or asset against that spec.
4. **Prompt structure** [practice]: subject; style; composition and crop; palette
   (hex values from your tokens); lighting; background; aspect ratio; negative list
   (no text, no watermark, no extra fingers). Reuse the same style block verbatim across
   prompts for consistency.
5. **Iterate and lock**: pick a keeper, reuse its prompt and seed/reference image for
   the rest of the set.
6. **Validate visually** [video]: screenshot the built screen against the generated
   design and fix differences.
7. Do not rely on generated text inside images; render real text in the UI.

## Text over images

[video] A full-screen flat overlay "doesn't do the image justice". Use a linear gradient
that shows the image and fades into a background where text sits, optionally with a
progressive blur on top. Verify text contrast over the _worst_ region of the image
[practice].

## Technical

- Serve images sized for their slot (and density), never ~10x the displayed size [video].
- Provide alt text for meaningful images; mark decorative ones empty [practice].
- Reserve space (aspect-ratio) to avoid layout shift; use a placeholder or blur-up while
  loading [practice].
- Prefer modern formats (WebP/AVIF) with fallback where needed [practice].
- Icons: one style, size equal to line-height; a custom icon set gives personality and
  stops category images competing with content images [video].
