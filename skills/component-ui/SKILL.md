---
name: component-ui
description: Build UI by reusing existing components instead of writing them from scratch. Use when adding or changing any UI element in a Phoenix/LiveView or Bonsai/OCaml project, or when tempted to hand-roll a toast, dialog, dropdown, command menu, drawer, tabs, or animated number. Covers inventorying the project's components, the reuse order, picking foundations vs specialists vs showpiece components, and adapting them to the project's tokens. Complements `ui-design` (structure) and `visual-design` (surface).
---

# Component-first UI

AI-built UI looks generic when every toast, menu and dialog is written from scratch with
default styling. Models skip the details: stacking, focus, keyboard navigation,
drag physics, reduced motion. Existing components already carry those details, and
someone else's taste. Reuse them, then make them match the project.

## Reuse order

Stop at the first step that works.

1. **Project component** — already in the codebase. Use it as-is.
2. **Project component, extended** — add a variant or attribute. Do not fork it.
3. **Composition** — build from existing project components.
4. **Foundation or specialist library** — adopt a free, open-source library that does the
   hard behavior. Never propose paid libraries, pro tiers, or licensed MCP servers.
5. **New component** — only when 1–4 fail. Build it from project tokens and match the
   existing components' API and file layout.

Never write a second toast, modal, or dropdown system next to an existing one.

## Workflow

1. **Inventory first.** Before writing markup, list what exists: component modules, design
   tokens (colors, radius, spacing, type), and an existing page that looks like the target.
   Use that page as the style reference.
2. **Map the screen to components.** For each UI element, name the component that covers
   it. Mark gaps explicitly.
3. **Fill gaps by the reuse order.** Say which step you used for each gap.
4. **Give Claude the library's docs.** For a library you adopt, save its `llms.txt` (or
   docs) into the project, or use a free docs MCP, so you use real component names and
   attributes instead of guessing. Ask before adding a dependency.
5. **Adapt to tokens.** Library defaults are an "AI look" of their own: same radius, gray
   palette, font (default shadcn and daisyUI palettes are recognizable). Set radius,
   color, and type from the project's tokens. No one-off values.
6. **Check the behavior you adopted.** Keyboard, focus, disabled, loading, and empty states
   still work after restyling. Apply `visual-design`'s feedback kit.
7. **One showpiece per page.** Animated or decorative components (effects, backgrounds,
   animated buttons) get one standout moment per page. Ten make nothing stand out.

## Component kinds

- **Foundations** supply behavior and accessibility (dialogs, menus, tabs, inputs). Use
  them for most of the app, then style them.
- **Specialists** do one hard component well (toast, drawer, command palette, animated
  number). Use one rather than hand-rolling the behavior.
- **Showpiece components** are finished, styled, flashy. Use sparingly, adapt to tokens.

Prefer libraries whose code is copied into the project (open code) or that are plain
function/module APIs. Claude can then read and edit them.

## Phoenix / LiveView

- Look in `lib/<app>_web/components/` first: `core_components.ex` and any other
  function-component modules. Check attrs, slots, and variants before adding markup.
- Use the existing function components (`<.button>`, `<.input>`, `<.modal>`,
  `<.table>`, `<.flash>`) rather than raw HTML with ad hoc Tailwind classes.
- Extend with `attr`/`slot` and a `variant` attr. Do not copy a component to change one class.
- Interactive behavior (dialogs, menus, command palettes, toasts) goes through
  `Phoenix.LiveView.JS` or a colocated hook, not hand-rolled JS. Keep focus handling and
  `Esc` close correct.
- If the project uses daisyUI or another Tailwind kit, use its component classes through
  the project's function components. Do not mix kits. daisyUI publishes a free
  `llms.txt`; save it into the project so Claude uses real class names.
- Check the stack before adding a dependency: Tailwind config, `assets/`, and the
  existing JS hooks. Ask before adding a new UI library.

## Bonsai / OCaml

- Start with `Bonsai_web_ui_view`: layout helpers (`hbox`, `vbox`) and themed widgets
  such as `button` and `card` (they take a `Theme.t`). Then look for the project's own Vdom component modules and
  UI kit before writing `Vdom.Node` trees. Check for a shared `ui` or `components` library, and for style
  modules built with `ppx_css`.
- Build views from those components and compose them in `let%arr` or `Bonsai.assoc`.
  State and effects stay in the Bonsai graph, not in the view helper.
- Style through the project's existing CSS variables and style modules, not inline values.
- If no kit exists, create small, reusable view functions for repeated elements
  (button, field, dialog) in one module, with variants as typed arguments. Do not repeat
  raw nodes across pages.
- Bonsai versions must match `virtual_dom` versions (for example Bonsai 0.17 needs
  `virtual_dom` 0.17). Check the pin before adding a dependency.
- If a JS library is the only good option for a specialist behavior, wrap it behind one
  small Bonsai-facing module. Ask before adding it.

## Reference libraries (when the project has none)

Free and open source only. Names to consider by kind. Verify they fit the stack and the
licence before proposing; most target React.

- Foundations: shadcn/ui, Radix, Base UI.
- Specialists: Sonner (toasts), Vaul (drawers), cmdk (command menu), NumberFlow
  (animated numbers).
- Showpieces: Magic UI, Aceternity UI (free components only), 21st.dev.

For Phoenix and Bonsai, treat these as design references for behavior and look to
reproduce with the project's own components, unless the user wants a JS island.

## Output

State what you reused, what you extended, and what you created, each with one reason.
If you added a dependency, name it and why no existing component sufficed.
