# Scannability and decisions

Two ideas from the source talks. Tag **[video]** means a heuristic from a talk, not a
standard. For the reasoning behind them see `principles.md`.

## 1. Scannability

People do not read a screen; they arrive with a question and hunt for the answer
[video]. Edges, differentiation, and recognizable visuals are not decoration, they make
the answer faster to find.

### Edges

- **Lock content to edges** [video]. A good receipt: text hard left, prices hard right,
  only things you are not meant to read are centered. Alignment is what lets the eye
  travel.
- **A compact element should border at least two edges** of its container [video]. In a
  list, each line creates an edge for the next item to stack against.
- **Do not fill empty space with more content.** Ask which edges could hold it, and move
  content to clear an edge or _manufacture_ one (line avatar and buttons into a solid
  line) [video].
- **Do not hide actions in a menu just to tidy space** [video]; fix the layout first.
- **Full-width lines lose edges.** Stretching every row to the full width removes the
  alignment that made the list feel right [video].

### Differentiation

- **The common problem is undifferentiated content**, not too little white space [video].
  Extra white space helps a little and makes the page longer. Differentiate: avatars,
  icons, grouping (by due date, by category), chips for categories.
- **Emphasis is difference from neighbors.** It is not something an element has [video].
  If every chip is in its default state, nothing stands out. Change the surroundings
  (make defaults quiet and gray), not the element (more bold, more color).
- **Defaults recede; non-defaults signal** [video]. A checkbox is not blue when off. Apply
  the same to settings, filters, and chips: show what differs from the default.
- **Prefer recognizable visuals over labels** [video]: a familiar icon or diagram
  registers without reading. Adding labels, comparisons and tooltips to make something
  clear can make the screen harder to read. Exception: icon-only action bars rely on
  tooltips.
- **Links and chips expose choices** [video]: blue underlined links and category chips
  put tag-swapping on the surface instead of behind a menu.

### Containers

- **Cards give four edges for free** [video], which is why they work. Do not nest them:
  "borders on borders and three radii". A single column line can replace nested cards.
- Cards or no cards, the test is the same: is it scannable?

## 2. Decision support

Use for filters, pickers, configurators, search, anything where the user is working out
what they want. Requirements are not fixed; people trade off (bedrooms vs budget) while
they look [video].

### Show consequences before the choice

- **The commit button shows the result count**: "Show 41 homes", not "Show homes" [video].
- **Each option shows its count** before it is chosen (3 beds -> 459, 4 beds -> 229)
  [video]. A zero-result option should look different from a good one.
- **Distribution beats a bare slider**: a histogram behind a price slider shows where
  options cluster and where stretching the budget unlocks more [video].
- **Give context** ("459 of 1,557 fit", median price for the current selection) [video].
- **Derive when users think in other terms**: a budget calculator (deposit, monthly
  payment, rate) that yields an affordable price and overlays it on the histogram
  [video].

### Keep decisions on one view

- Do not give each filter its own page. 7 taps for 2 filters and results that
  disappear make the decision harder, even if each screen looks simpler [video].
- Related controls live together, over or beside the results, so the effect is visible
  as you adjust.
- Make controls visible, not buried in dropdowns: quick-filter chips plus a filter button
  and a sort button, a result count, and a visible active-filter state [video].

### Choose the right input

- **Steppers (+/-) suit nudging a known number** (basket quantity, thermostat). They are
  slow when the user already knows they want 3, and they hide the other options [video].
- **Visible option buttons** for small discrete sets. Make semantics explicit: "3+" means
  at least 3; exact 3 stays available separately [video].
- **Slider plus manual input** for ranges: quick exploration and precision [video].
- **Preset values** for common cases (500 g, 1 kg, 2 kg) with a custom option [video].
- **When there is no correct default, give control** (cards vs compact list) [video].

### Be specific and honest

- **Placeholders say what is searchable**: "Places, dishes or cuisines" [video].
- Show _why_ something is first when you know ("Best match"), only if it is true [video].
- **More information makes the UI busier**; separate what helps the decision from noise
  and cut the rest [video].
- Do not claim a simpler-looking UI is simpler to use. Judge by how easily the decision
  gets made [video].
