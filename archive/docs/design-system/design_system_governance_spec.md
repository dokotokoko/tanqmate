# Design System Governance Spec

## Purpose
This spec defines the project-wide frontend design system standard for `apps/frontend`.
It is based on `docs/design_system_review_report.md` and the current UI structure, especially the chat experience that already expresses the right tone: warm, soft, and calm.

This document is the contract for:
- visual tokens
- component variants
- page-family guidance
- migration priorities
- governance rules to prevent style drift

## System Direction

The system is **Warm-Neutral First + Trust Blue Accent**.

Meaning:
- warm neutrals are the default background and surface language
- blue is kept, but only as a trust / information / navigation accent
- the main action color is warm, not saturated blue
- all screens should feel like one product family, not separate mini-products

## Foundation Tokens

### Color roles

Use semantic roles, not ad hoc hex values in components.

Recommended token set:
- `canvas`: `#FFFAED`
- `surface`: `#FFFDF7`
- `surfaceSubtle`: `#FFF6E8`
- `surfaceRaised`: `#FFFFFF`
- `borderSoft`: `#F0E8D8`
- `borderWarm`: `#FFE4C8`
- `textPrimary`: `#2D2A26`
- `textSecondary`: `#6B6560`
- `textMuted`: `#9E9891`
- `accentWarm`: `#FF8C5A`
- `accentWarmHover`: `#FF7A42`
- `accentWarmSoft`: `#FFE4CC`
- `trustBlue`: `#7BA9C9`
- `trustBlueHover`: `#5F94B9`

Rules:
- warm accents handle primary actions, emotional affordances, and conversational emphasis
- trust blue handles metadata, secondary actions, navigation, and stable informational states
- avoid high-saturation blue as the default brand color

### Spacing

Use an 8px base with the following canonical steps:
- `4, 8, 12, 16, 24, 32, 48, 64`

Component defaults:
- page gutters: `24`
- section spacing: `32-48`
- card padding: `24`
- form field padding: `12-16`
- chip padding: `6-12`

Rules:
- do not invent one-off spacing values for common layouts
- dense views may compress spacing, but only by moving one token step down
- avoid mixed spacing systems inside the same page

### Radius

Canonical radii:
- `xs`: `4`
- `sm`: `8`
- `md`: `12`
- `lg`: `16`
- `xl`: `24`
- `pill`: `9999`

Component defaults:
- button: `14`
- card: `16`
- input: `12`
- chip: `16`
- dialog: `20`

Rules:
- use one radius family per surface group
- do not mix sharp and rounded corners randomly in the same module
- keep interactive controls slightly softer than containers

### Typography

Primary font stack:
- `"Noto Sans JP", "Roboto", "Helvetica", "Arial", sans-serif`

Hierarchy:
- page title: `28-32px`, `700`, tight line-height
- section title: `20-24px`, `600`
- body: `16px`, `400`, line-height around `1.6`
- support text: `14px`, `400-500`
- caption/meta: `12-13px`, `500`

Rules:
- use the same type family across all product pages
- do not introduce new fonts per page family
- keep text color warm and low-pressure rather than pure black

## Component Contracts

### Button

Standard variants:
- `solid`: warm primary action
- `soft`: warm secondary action
- `outline`: quiet bordered action
- `ghost`: text-only action
- `danger`: destructive action only

Rules:
- one primary button style should dominate across the product
- `solid` is for save, send, continue, confirm
- `trustBlue` may be used for secondary navigation or metadata actions, but not as the default CTA
- avoid gradient buttons in core product flows
- icon-only buttons must have accessible labels

### Card

Standard variants:
- `default`: surface card with soft shadow
- `elevated`: stronger separation for focus areas
- `outlined`: low-emphasis structural card
- `tinted`: warm-tinted informational surface
- `interactive`: hoverable card with clear affordance

Rules:
- cards should read as surfaces, not boxes
- `tinted` is preferred for reflective or conversational content
- `outlined` is preferred for dense dashboard sections
- avoid decorative gradients unless explicitly approved for a specific campaign-like surface

### Input

Standard variants:
- `outlined`: default for forms and chat composer
- `filled`: compact or low-friction entry
- `surface`: quiet input embedded in a warm panel

Rules:
- every input needs a visible label or an accessible equivalent
- focus state should be warm by default
- helper and error states must be visible without relying on color alone
- keep placeholder text muted, never the same weight as entered text

### Chips

Use `Badge` and `InteractiveChip` as the current chip family until a unified chip primitive is introduced.

Standard chip types:
- `filter`: selectable taxonomy
- `status`: passive state label
- `action`: small reversible action
- `emotion`: reflective self-report or diary choice

Chip variants:
- `filled`
- `soft`
- `outlined`

Rules:
- interactive chips must look clickable
- selected chips should use subtle fill, not saturated blocks
- chips should not become the main visual language for long text
- limit the number of simultaneous selected chips in reflective flows

### Layout Shells

Standard shells:
- `AppShell`: global warm canvas, shared navigation, consistent gutters
- `ChatShell`: full-height conversation column, sticky composer, minimal chrome
- `DiaryShell`: reflective surface stack, stronger breathing room, slower pacing
- `DashboardShell`: denser information layout with sidebar and summary cards
- `FormShell`: centered column, narrow width, single dominant action

Rules:
- each page family must pick one shell and stick to it
- shell background should come from tokens, not page-local hex values
- do not mix multiple shell metaphors on the same page

## Page Family Guidance

### Chat

Role:
- the baseline product experience and visual reference point

Guidance:
- use the warm canvas and soft surfaces as the default frame
- keep the composer sticky and visually calm
- use warm accent for send, confirm, and emotional emphasis
- use blue only for trust, information, or secondary cues

Do:
- keep message hierarchy clear
- prioritize calm spacing and legibility
- let the AI feel responsive without becoming flashy

Don't:
- turn chat into a bright SaaS control panel
- add decorative gradients or hard blue UI chrome

### Diary

Role:
- reflective, introspective, emotionally attentive

Guidance:
- softer than chat, with more whitespace and gentler contrast
- use warm tints and muted labels
- support gradual progression instead of sharp step changes

Do:
- make self-reporting feel easy and non-judgmental
- let emotion and intensity be expressed by touch-like controls

Don't:
- overuse blue, metrics, or gamified heat visuals
- let AI explanation dominate the user's own feeling

### Dashboard

Role:
- dense overview and navigation hub

Guidance:
- keep the warm base, but allow slightly more structural contrast
- use blue more often here than in chat or diary, but only for information hierarchy
- cards and dividers should carry the structure, not heavy borders

Do:
- reduce visual noise
- group content into clear summary blocks
- keep the primary CTA visually consistent with the rest of the system

Don't:
- make the dashboard the place where experimental colors appear first
- use unrelated accent palettes per widget

### Forms

Role:
- sign-in, sign-up, reset, onboarding, and structured data entry

Guidance:
- most restrained page family
- one clear primary action
- minimal ornament, strong hierarchy, predictable spacing

Do:
- keep labels explicit
- make validation immediate and local
- use warm neutral surfaces to reduce friction

Don't:
- split form styles by feature area
- add competing CTA colors

## Do / Don't Rules

### Do

- use design tokens before custom values
- choose one primary accent per page
- keep surfaces warm, soft, and layered
- reuse shared primitives first
- make interactive states obvious and accessible
- keep text color warm and readable

### Don't

- do not hardcode hex colors in page components unless there is a documented exception
- do not create new component variants without a cross-page use case
- do not mix blue-primary and warm-primary in the same interaction surface
- do not introduce gradients as default product styling
- do not use separate spacing systems across the app
- do not let page-local fixes become the new standard

## Migration Priorities

1. Freeze the foundation tokens in `design-system.ts` and treat them as the source of truth.
2. Align `global.css` to the same tokens so CSS variables and MUI theme stop drifting.
3. Refactor shared primitives in this order: `Button`, `Card`, `Input`, `Badge` / chip family, then layout shells.
4. Migrate chat first, because it already expresses the target tone and can become the reference implementation.
5. Migrate diary next, because it needs the most emotional consistency and benefits from the warm system.
6. Normalize dashboard and form pages after the core tone is locked.
7. Remove remaining inline hex values and page-local shadows as the last cleanup step.

## Governance Rules

### Source of truth

- `apps/frontend/src/styles/design-system.ts` is the canonical design token file.
- `global.css` may mirror tokens, but it may not redefine the system independently.
- shared components must consume tokens rather than invent new palettes.

### Change control

- any new token, variant, or shell needs a written rationale and a named owner
- any exception must be temporary, documented, and tied to a specific migration ticket
- design changes in shared components require visual review across at least chat, diary, dashboard, and forms

### Drift prevention

- no hardcoded colors in feature pages unless they map to an approved semantic token
- no one-off shadows, radii, or spacing scales in page code
- no page may override the system just to "look better" without promoting the pattern to the spec

### Review checklist

Before merging UI work, confirm:
- tokens are used instead of local constants
- page family matches the correct shell
- primary action color is correct for the page family
- spacing and radius follow the canonical scale
- focus, hover, disabled, and error states are present
- responsive behavior is preserved on mobile and tablet

### Deprecation policy

- keep old values only long enough to migrate one owner area
- deprecated colors or variants should be removed after their last consumer is migrated
- if a deprecated pattern survives, promote it only after updating this spec

## Summary

The design system should not be a collection of neutral utilities. It should codify the product's actual visual truth:
warm, calm, readable, and emotionally safe.

The key rule is simple:
- blue supports trust and information
- warm neutrals define the product
- the chat experience is the reference implementation
- shared primitives and tokens must enforce that consistency everywhere else
