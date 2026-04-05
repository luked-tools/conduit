# Conduit UI Design System

This document is the required source of truth for creating, updating, or reviewing UI in Conduit. Any change to the interface should be evaluated against these rules before implementation is considered complete.

## 1. Purpose

Conduit is a diagram-building workspace for mapping systems, functions, and connections. The interface should feel:

- Precise, not decorative
- Dense, but calm
- Technical, without becoming hostile
- Flexible enough for complex diagrams
- Fast to scan during long working sessions

The UI is not a marketing site. It is a working surface for structuring information.

## 2. Product Character

Conduit's visual language is built from three ideas:

- Editorial workspace: strong headings, clear hierarchy, restrained ornament
- Mapping tool: spatial freedom, lightweight chrome, high legibility on canvas
- Technical instrument: mono labels, explicit controls, visible system state

When adding UI, prefer "quiet confidence" over novelty. New surfaces should look like they belong beside the canvas, sidebar, document panel, and node cards that already exist.

## 3. Core Design Principles

### 3.1 Canvas First

The diagram canvas is the primary product surface. Supporting UI must help users act on the canvas, not compete with it.

- Keep persistent chrome compact.
- Float secondary controls when possible.
- Avoid large blocking surfaces unless the task truly needs focused editing.

### 3.2 High Signal, Low Noise

Every element must earn its place.

- Prefer one strong visual cue over several weak ones.
- Use borders, weight, and spacing before adding more color.
- Avoid decorative shadows, gradients, badges, and icons that do not improve comprehension.

### 3.3 Progressive Disclosure

Show the minimum needed for fast action, then reveal depth on demand.

- Preview before detail
- Summary before configuration
- Inline adjustment before modal workflows

This pattern already exists in the document panel, property sections, appearance panel, and function editor flows and should remain the default.

First-launch guidance should follow the same rule:

- use one lightweight welcome surface, not a step-by-step tour
- keep the canvas visible while teaching the first moves
- explain only the core actions needed to start
- make dismissal immediate and persistent

### 3.4 Direct Manipulation Wins

If a task can be done by dragging, selecting, editing inline, or acting directly on an object, prefer that over distant controls.

- Canvas interactions should feel immediate and reversible.
- Property panels should complement direct manipulation, not replace it.

### 3.5 State Must Be Obvious

Users should always understand:

- what is selected
- what mode they are in
- what will happen next
- whether a change is local, global, temporary, or saved

Mode ambiguity is a design bug.

### 3.6 Layering Must Stay Predictable

Conduit is a structured mapping tool, not a freeform illustration canvas. Layering should therefore optimize readability first.

Rules:

- Nodes and boundary boxes sit above connectors in normal viewing.
- Connectors can be ordered relative to other connectors.
- Nodes can be ordered relative to other nodes and boundaries.
- Connectors do not inherit the layer of either endpoint node.
- A selected connector may temporarily rise above other content when needed for editing handles, routing, or endpoint adjustment.

Rationale:

- Node content must remain readable in dense diagrams.
- Boundaries should continue to frame systems rather than be visually cut through by lines.
- Users should not have to reason about which endpoint "wins" a connector's layer when two connected nodes sit on different layers.
- Temporary editing elevation is acceptable when it improves manipulation clarity, but it should not redefine the normal reading order of the diagram.

## 4. Interface Anatomy

The current product has seven primary UI layers. New work should fit into this structure unless there is a strong reason to change the architecture.

1. Top bar: global actions, file/draft actions, import/export, theme access
2. Sidebar: inventory, properties, editing controls, counts, system metadata
3. Document panel: lightweight metadata editing and document framing
4. Canvas: main spatial workspace
5. Nodes and arrows: primary editable objects
6. Slide-out panels: focused supporting tools such as theme and appearance
7. Modals: deeper tasks that need form-heavy or multi-step editing

Rule:

- Global actions belong in the top bar.
- Selection-driven controls belong in the sidebar.
- Canvas-object styling belongs near the object or in a focused companion panel.
- Short metadata belongs in floating panels.
- Complex structured editing belongs in modals.

Additional layering rule:

- Canvas objects are arranged in two predictable families: node-family objects and connector-family objects. Ordering within a family is adjustable; the node family remains visually above the connector family except during temporary connector editing states.

## 5. Visual Foundations

### 5.1 Color System

The UI already uses a token-based color model and all future work must extend that system rather than bypass it.

Primary tokens in use:

- `--bg`
- `--surface`
- `--surface2`
- `--surface3`
- `--border`
- `--border2`
- `--text`
- `--text2`
- `--text3`
- `--accent`
- `--accent2`
- `--accent3`
- `--danger`
- `--arrow-color`
- node and I/O tokens

Rules:

- Do not hard-code colors in new UI unless the value is temporary and clearly marked for tokenization.
- New reusable UI colors must become CSS custom properties.
- `--accent` is the primary action color.
- `--accent2` is for alternate system emphasis.
- `--accent3` is reserved for highlights, selected emphasis, and active manipulation.
- Destructive actions must use `--danger`.

### 5.2 Theme Compatibility

Conduit supports multiple presets and custom theming. Any new UI must work in:

- default
- midnight
- forest
- ember
- slate
- dark navy
- custom mixes derived from token edits

Rules:

- Never assume a light background.
- Never rely on a single brand color for contrast.
- New components must derive background, text, and border colors from tokens.
- Focus, hover, selected, disabled, and destructive states must remain legible across themes.

### 5.3 Typography

Current typography is part of the product's identity and should remain the default:

- `Inter` for UI and content
- `IBM Plex Mono` for labels, metadata, pills, counts, and technical microcopy

Rules:

- Use sans-serif for primary reading and actions.
- Use mono sparingly for metadata, taxonomies, status, and compact system labels.
- Preserve the existing hierarchy: strong titles, restrained labels, muted metadata.
- Avoid oversized headings in utility surfaces.

### 5.4 Shape and Radius

Conduit uses soft but restrained geometry.

- Standard corner treatment is small-radius and functional.
- Pills are reserved for I/O chips, metadata chips, and small semantic tokens.
- Avoid oversized rounded corners on utility panels.

### 5.5 Elevation

Elevation should communicate interaction priority, not decoration.

- Base canvas objects: minimal shadow or none
- Floating panels: soft, controlled shadow
- Modals: strongest elevation in the system

Rule:

- If elevation is increased, border clarity usually should increase too.

## 6. Layout Rules

### 6.1 Density

Conduit is intentionally information-dense, but density must still feel ordered.

- Default toward compact controls.
- Use tight vertical rhythm in tools and property stacks.
- Keep enough spacing to distinguish groups without making the app feel airy.

### 6.2 Alignment

- Left alignment is the default for text and control stacks.
- Use consistent internal alignment within each panel.
- Avoid center alignment except for small icon-only controls or empty states.

### 6.3 Responsive Behavior

The product must remain usable on narrower widths, but desktop remains the primary target.

Rules:

- Canvas access must remain intact at all widths.
- Persistent panels should collapse, slide, or layer before shrinking critical controls to unusable sizes.
- Floating panels must avoid clipping outside the viewport.

## 7. Component Standards

### 7.1 Top Bar

The top bar is compact, operational, and always available.

- Keep it short in height.
- Group related actions with separators.
- Reserve primary button treatment for the most important global action in that context.
- Avoid filling the bar with low-priority actions.

### 7.2 Sidebar

The sidebar is the product's operational control tower.

- Organize content into clear sections.
- Support fast scanning with small labels, visible grouping, and compact form controls.
- Use collapsible groups when content grows.
- Empty states should tell the user what to select or do next.
- Group related property controls with subtle framed sections rather than heavy filled cards.
- In-sidebar groups should rely primarily on spacing, headings, and light borders; avoid dense grey fills that feel heavier than Theme or Layers.

### 7.3 Floating Panels

The document panel, theme panel, and appearance panel establish the standard for secondary editing surfaces.

- They should feel attached to the main workflow, not like separate pages.
- Use them for lightweight editing and previews.
- Keep headers small and actionable.
- Support quick dismissal with outside click or Escape when appropriate.

### 7.4 Modals

Modals are for higher-complexity tasks such as editing node detail, functions, exports, or connection setup.

Rules:

- Use modals only when inline or panel-based editing would become cramped or ambiguous.
- Modal content should be task-focused, not overloaded.
- The primary action must be visually clear.
- Escaping a modal should feel safe and predictable.

### 7.5 Buttons

Button hierarchy should remain simple:

- neutral
- primary
- accent utility
- danger

Rules:

- Button labels must be verbs or clear noun phrases.
- Icon-only buttons require a tooltip or a very obvious nearby label.
- Disabled buttons should still look intentional, not broken.

Segmented controls:

- Use segmented controls for small, mutually exclusive view or mode switches.
- Prefer a shared container with a sliding active selector over styling each option as an unrelated button.
- The active segment should move, not blink between disconnected fills.
- Labels in segmented controls should stay short and scannable.
- This pattern is appropriate for compact switches such as direction, mode, or scoped panel filters.

### 7.6 Inputs

- Use clear labels for all structured form inputs.
- Use placeholders only as examples, not as replacements for labels.
- Inline validation should be calm and specific.
- Color pickers, sliders, selects, and text fields should share a common visual family.

### 7.7 Pills and Chips

Pills are meaningful in Conduit because they express I/O semantics and compact metadata.

Rules:

- Do not overuse pill styling for generic UI labels.
- Inputs and outputs must remain visually distinct.
- Pill text must stay readable at small sizes.

## 8. Canvas Object Rules

### 8.1 Nodes

Nodes are the core units of meaning and should feel stable, readable, and scannable.

Required hierarchy for standard nodes:

1. Tag or system identifier
2. Title
3. Subtitle or description
4. Functions section
5. I/O pills

Rules:

- Title must remain the strongest text element.
- Tag is optional but, when present, should feel system-like and compact.
- Subtitle must support multi-line reading without dominating the card.
- Functions should read as a structured list, not as body copy.
- Background customization must not reduce legibility.

### 8.2 Boundary Nodes

Boundary nodes are structural containers, not peers to standard system cards.

Rules:

- They should read as framing devices.
- Their styling must stay lighter and less dominant than content nodes.
- Resizing affordances should remain visible without becoming visually loud.

### 8.3 Connectors

Connectors communicate relationship and flow.

Rules:

- Line style should clarify meaning, not create visual clutter.
- Arrowheads must be legible at normal zoom.
- Labels should stay readable above busy diagrams.
- Selected connectors need clear emphasis.
- Manual routing controls should appear only when useful.

### 8.4 Selection and Editing Handles

- Selection must be immediately visible.
- Drag handles should appear only in an active editing state.
- Interactive handles should be easy to target without overwhelming the object.

## 9. Interaction Design Standards

### 9.1 Interaction Priority

Preferred order of interaction patterns:

1. Direct manipulation on canvas
2. Inline editing
3. Sidebar or floating panel adjustment
4. Modal workflow

### 9.2 Hover and Focus

Hover should preview possibility. Focus should confirm control.

Rules:

- Hover states may reveal affordances.
- Focus states must be keyboard-visible.
- Hover alone must never be the only way to understand a control.

### 9.3 Motion

Motion should be quick, minimal, and purposeful.

Acceptable uses:

- panel entrance and exit
- hover emphasis
- state transition
- subtle selection reinforcement

Avoid:

- long easing
- decorative looping animation
- motion that competes with dragging/editing

### 9.4 Undo-Friendly Design

Because Conduit is an editing tool, interactions should assume users will experiment.

Rules:

- Changes should be easy to reverse.
- Risky actions should be clearly labeled.
- The UI should encourage exploration without fear.

## 10. Content and Microcopy

Conduit copy should be:

- direct
- short
- technical but human
- free of marketing language

Rules:

- Buttons should use plain action labels like "Edit functions", "New connection", or "Duplicate node".
- Helper text should explain outcome, not restate the control label.
- Empty states should tell the user what to do next.
- Avoid exclamation points, jokes, or overly chatty system text.

## 11. Accessibility Requirements

Every UI change must be checked for accessibility, not treated as optional polish.

Minimum expectations:

- sufficient text/background contrast across themes
- visible keyboard focus
- labels for non-obvious controls
- hover interactions that also have keyboard or click access
- modal Escape behavior where appropriate
- readable text at compact sizes

If a feature depends on color alone, it is incomplete.

## 12. Implementation Rules For Designers and Engineers

These rules are mandatory when changing UI:

- Reuse existing tokens before inventing new ones.
- If a new visual pattern will appear more than once, formalize it instead of styling it ad hoc.
- Keep selection, hover, focus, active, disabled, and danger states explicit.
- Prefer extending existing panel and control patterns over introducing a new visual language.
- Do not introduce a one-off font, radius system, shadow style, or animation style.
- Avoid hard-coded layout magic numbers when the spacing can be tokenized or standardized.
- Test new UI in at least one light preset and one dark preset.
- Validate that the UI still makes sense with dense content, long labels, and empty content.

## 13. Review Checklist

Use this checklist before shipping UI work.

### Visual

- Does it look native to Conduit?
- Does it preserve canvas-first hierarchy?
- Does it remain legible in light and dark themes?
- Is the hierarchy obvious at a glance?

### Interaction

- Is the quickest workflow direct and obvious?
- Are states and modes clearly communicated?
- Is the feature reversible or safely constrained?
- Are hover, focus, and selected states all clear?

### Content

- Are labels short and specific?
- Does helper text add information rather than noise?
- Do empty states guide the next action?

### Accessibility

- Is contrast acceptable?
- Can keyboard users understand and operate it?
- Are icons understandable without guesswork?

### System Fit

- Does it reuse the existing token and component language?
- Would this still feel coherent if repeated across the app?
- If copied elsewhere, would it improve the system or create drift?

## 14. When To Update This Document

Update this document whenever any of the following change:

- visual foundation tokens
- typography system
- component behavior patterns
- modal or panel architecture
- interaction priorities
- accessibility standards
- new reusable UI primitives

If implementation changes and this document is no longer true, the document must be updated in the same body of work.
