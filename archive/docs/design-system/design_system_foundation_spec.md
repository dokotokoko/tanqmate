# Design System Foundation Spec

## Purpose

This document defines the visual foundation for the project's frontend design system.
The goal is not to create a generic UI theme, but to formalize the visual language that already works best in the current AI chat screen and extend it across the entire app.

Core intent:

- Make the UI feel soft, warm, and calm without becoming childish
- Keep the product trustworthy and readable
- Prevent future color drift and one-off styling decisions
- Use the chat UI as the visual reference standard, not an exception

## Design Principles

1. Warm first, blue second.
   The base environment should feel like paper, cream, and warm light. Blue is allowed, but only as a trust and information accent.
2. Surfaces do the work.
   Use layered surfaces, subtle borders, and shadow depth instead of strong color blocks.
3. Tone should be supportive, not loud.
   The UI should reduce pressure on the user, especially in reflective and AI-assisted flows.
4. One system, many contexts.
   Chat, diary, settings, dashboards, and forms should share the same visual grammar.
5. No isolated palette usage.
   Colors must be assigned by role, not chosen ad hoc per component.

## Brand Tone

The brand tone should read as:

- Intelligent
- Gentle
- Warm
- Trustworthy
- Reflective
- Human

Avoid these tones:

- Cold SaaS blue dominance
- Hard white backgrounds
- Excessive contrast
- Decorative color noise
- Game-like or toy-like styling

## Color Strategy

### High-Level Rule

- Warm neutrals are the base system
- Warm accents are the main action color
- Blue is reserved for trust, state, and information

### Role-Based Palette

| Role | Hex | Purpose |
|---|---:|---|
| `canvas` | `#FFFAED` | App background, outer stage |
| `surface` | `#FFFDF7` | Main cards, panels, input shells |
| `surfaceSubtle` | `#FFF6E8` | Secondary surfaces, helper areas, soft sections |
| `surfaceRaised` | `#FFFFFF` | Rare highest-contrast panels, dialogs, popovers |
| `borderSoft` | `#F0E8D8` | Default divider and card border |
| `borderWarm` | `#FFE4C8` | Accent border, active chat surfaces |
| `textPrimary` | `#2D2A26` | Main text, headings, important labels |
| `textSecondary` | `#6B6560` | Supporting text, body copy, metadata |
| `textMuted` | `#9E9891` | Hints, placeholders, inactive metadata |
| `accentWarm` | `#FF8C5A` | Primary action, warm highlight, emotional emphasis |
| `accentWarmHover` | `#FF7A42` | Hover state for warm actions |
| `accentWarmActive` | `#FF6B35` | Active/pressed state for warm actions |
| `accentWarmSoft` | `#FFE4CC` | Soft fill for warm emphasis |
| `trustBlue` | `#7BA9C9` | Informational accent, calm support state |
| `trustBlueHover` | `#5F94B9` | Hover state for blue accent |
| `trustBlueSoft` | `#DCEAF3` | Soft blue background for info surfaces |

### Suggested Palette Grouping

Use these groups as the foundation for tokens:

- Warm neutrals: `#FFFAED`, `#FFFDF7`, `#FFF6E8`, `#F0E8D8`
- Warm accent family: `#FFE4CC`, `#FF8C5A`, `#FF7A42`, `#FF6B35`
- Trust blue family: `#DCEAF3`, `#7BA9C9`, `#5F94B9`
- Text family: `#2D2A26`, `#6B6560`, `#9E9891`

## Surface Hierarchy

The app should use a clear 4-level surface model.

| Level | Hex | Use |
|---|---:|---|
| Level 0 | `#FFFAED` | Whole-page canvas, ambient background |
| Level 1 | `#FFFDF7` | Standard content surfaces, cards, chat shells |
| Level 2 | `#FFF6E8` | Inset sections, helper panels, secondary containers |
| Level 3 | `#FFFFFF` | Dialogs, popovers, high-clarity overlays |

Rules:

- Do not default to pure white for the whole app
- Prefer surface layering over heavy borders
- Use the lowest surface that still preserves readability
- Reserve the highest surface for exceptional emphasis

## Text Colors

Text should stay warm and slightly softened.

| Role | Hex | Use |
|---|---:|---|
| `textPrimary` | `#2D2A26` | Headings, body text, interactive labels |
| `textSecondary` | `#6B6560` | Descriptions, helper text, timestamps |
| `textMuted` | `#9E9891` | Placeholder text, disabled hints, low-priority metadata |
| `textInverse` | `#FFFFFF` | Text on solid warm accent or dark overlays |

Rules:

- Avoid true black for default copy
- Use warm gray for the majority of text
- Keep contrast strong enough for readability, but not harsh

## Focus Colors

Focus states should feel intentional and calm.

### Preferred Focus Set

- `focusWarm`: `rgba(255, 140, 90, 0.35)`
- `focusWarmStrong`: `rgba(255, 122, 66, 0.45)`
- `focusBlue`: `rgba(123, 169, 201, 0.30)`

### Usage Rules

- Use warm focus for primary actions, inputs, chat controls, diary flows, and emotional or reflective interactions
- Use blue focus only when the UI is informational, navigational, or structurally neutral
- Never mix warm and blue focus states in the same component family

## Elevation and Shadow

Shadows should imply softness and depth, not darkness.

### Shadow Guidance

| Token | Suggested Value | Use |
|---|---|---|
| `shadowSoft` | `0 4px 16px rgba(120, 92, 64, 0.08)` | Cards, input shells, subtle floating surfaces |
| `shadowMedium` | `0 8px 24px rgba(120, 92, 64, 0.12)` | Elevated panels, dialogs, active overlays |
| `shadowAccent` | `0 8px 24px rgba(255, 140, 90, 0.18)` | Primary action areas, warm emphasis blocks |

Rules:

- Prefer warm shadows over neutral gray shadows
- Avoid heavy blur and dark opacity
- Use shadow to separate layers, not to dramatize them

## Blue vs Warm Accent Usage

This is the main policy for preventing future visual inconsistency.

### Warm Accents

Use warm accents for:

- Primary CTA buttons
- Send / save / confirm actions
- Active chat input emphasis
- Emotional or reflective states
- Highlighting the user's current attention

Warm accents should feel like action and proximity.

### Blue Accents

Use blue accents for:

- Informational badges
- History, status, and metadata
- Calm system guidance
- Secondary navigation
- Neutral selection states that should not feel emotional

Blue should feel like trust and structure, not urgency.

### Do Not

- Do not use blue as the default main button color across the app
- Do not mix warm and blue as competing primaries on the same screen
- Do not use blue for emotionally sensitive prompts if warm accents are available
- Do not use warm orange for large informational dashboards unless the action context is explicit

## Component Behavior Rules

- Buttons: primary buttons should be warm; blue should be secondary or informational
- Cards: default cards should use `surface` with `borderSoft`
- Inputs: default input shells should be `surfaceSubtle` or `surface`, with warm focus
- Avatars and highlights: warm gradients are preferred for assistant or guidance experiences
- Dividers: use subtle warm borders instead of sharp neutral lines

## Token Governance

To keep the system stable:

- Design tokens are the source of truth
- Components should consume tokens, not hardcoded hex values
- If a new color appears in a single screen, it must be mapped to an existing role or added as a named token
- Any new token must specify role, usage, and non-usage rules

## Definition of Done for the Visual Foundation

The design system is considered stable when:

- The app background, cards, and inputs share the same warm surface logic
- Primary actions are warm by default
- Blue appears in support roles, not as the dominant brand color
- Chat, diary, and general app screens feel visually related
- No isolated component introduces a conflicting color language

## Summary

The project should adopt a `Warm-Neutral First + Trust Blue Accent` foundation.
This preserves the best qualities of the current chat UI while making the entire frontend more coherent, calmer, and easier to extend without visual drift.
