---
version: alpha
name: "探Qメイト"
description: "A calm, supportive design system for inquiry-based learning."

colors:
  canvas: "#FFFAED"
  surface: "#FFFDF7"
  surface-subtle: "#FFF6E8"
  surface-raised: "#FFFFFF"
  text-primary: "#2D2A26"
  text-secondary: "#6B6560"
  border-soft: "#F0E8D8"
  accent-warm: "#FF8C5A"
  accent-warm-strong: "#F9733D"
  trust-blue: "#7BA9C9"
  success: "#4F9D69"
  warning: "#D89A2B"
  danger: "#D9534F"

typography:
  body-md:
    fontFamily: "Noto Sans JP"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.75
  label-md:
    fontFamily: "Noto Sans JP"
    fontSize: "14px"
    fontWeight: 600
    lineHeight: 1.5
  heading-md:
    fontFamily: "Noto Sans JP"
    fontSize: "22px"
    fontWeight: 700
    lineHeight: 1.45

spacing:
  unit: "8px"
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"

rounded:
  sm: "6px"
  md: "8px"
  lg: "12px"
---

# DESIGN.md

`DESIGN.md` is the source of truth for UI design in 探Qメイト. It defines visual tokens, component direction, UX tone, accessibility expectations, and the educational posture that UI implementation must preserve.

Implementation token details live in `apps/frontend/src/styles/design-system.ts`. Broader background and migration notes are summarized in `docs/design_system_master_spec.md`, but day-to-day UI decisions should start here.

## Brand & Style

探Qメイト is a calm companion for inquiry-based learning. The interface should feel warm, clear, supportive, and low-pressure.

Design principles:

- 答えを与えるより、問いを育てる
- 管理ではなく、伴走する
- 評価ではなく、前進を支援する
- 生徒に安心感を与える
- 教員が支援判断をしやすい
- 個人情報や内省内容を不用意に露出しない

The central visual rule is:

> Warm-Neutral First + Trust Blue Accent

Use warm neutrals as the base. Use warm orange for primary action and forward movement. Use blue only for trust, information, navigation, and organized state display. Blue-first SaaS styling is the old direction and should not be reintroduced.

## Colors

Core tokens:

| Token | Value | Use |
|---|---:|---|
| `canvas` | `#FFFAED` | App background |
| `surface` | `#FFFDF7` | Standard content surfaces |
| `surfaceSubtle` | `#FFF6E8` | Inset areas, quiet panels, input backgrounds |
| `surfaceRaised` | `#FFFFFF` | Dialogs, popovers, high-clarity surfaces |
| `textPrimary` | `#2D2A26` | Main text |
| `textSecondary` | `#6B6560` | Secondary text |
| `borderSoft` | `#F0E8D8` | Low-pressure borders |
| `accentWarm` | `#FF8C5A` | Primary actions, send, save, next |
| `accentWarmStrong` | `#F9733D` | Hover / active warm action |
| `trustBlue` | `#7BA9C9` | Information, history, organized state |
| `success` | `#4F9D69` | Completed / healthy states |
| `warning` | `#D89A2B` | Caution without alarm |
| `danger` | `#D9534F` | Destructive or serious error |

Rules:

- Do not use pure white as the default page background.
- Do not add page-specific palettes.
- Do not use blue for primary CTA.
- Do not introduce fixed colors in components unless this file and `design-system.ts` are updated.
- Use semantic roles rather than visual preference.

## Typography

The UI should be readable in Japanese, calm in density, and clear under repeated use.

| Role | Size | Weight | Line height | Use |
|---|---:|---:|---:|---|
| Heading MD | 22px | 700 | 1.45 | Section headings and page titles |
| Body MD | 16px | 400 | 1.75 | Main reading text |
| Body SM | 14px | 400 | 1.65 | Secondary explanations |
| Label MD | 14px | 600 | 1.5 | Form labels, compact controls |
| Caption | 12px | 400 | 1.5 | Metadata and helper text |

Rules:

- Keep letter spacing at `0`.
- Do not scale font size with viewport width.
- Avoid hero-scale type inside dashboards, cards, toolbars, and form panels.
- Preserve comfortable line height for reflective text.

## Layout & Spacing

Use an 8px spacing base.

| Token | Value | Use |
|---|---:|---|
| `xs` | 4px | Tight icon/text gaps |
| `sm` | 8px | Compact control gaps |
| `md` | 16px | Standard content spacing |
| `lg` | 24px | Section spacing |
| `xl` | 32px | Page-level spacing |

Layout rules:

- Use stable dimensions for boards, toolbars, icon buttons, counters, and repeated tiles.
- Avoid nested cards.
- Use full-width page bands or unframed layouts for sections.
- Keep operational screens dense but organized.
- Student reflection surfaces should have more breathing room than admin tables.

## Elevation & Depth

Depth should clarify hierarchy without making the UI feel heavy.

- Prefer borders and surface contrast before shadows.
- Use subtle shadows only for floating elements, dialogs, and active overlays.
- Avoid strong glow, glass, large gradients, and decorative orbs.

## Shapes

Default corner radius:

- Small controls: `6px`
- Standard cards and panels: `8px`
- Dialogs and larger surfaces: `12px`

Cards should generally stay at `8px` radius or less unless there is a clear reason and existing component precedent.

## Components

### App Shell

The app shell provides navigation, page gutters, and the baseline warm background.

- Background: `canvas`
- Content surfaces: `surface`
- Avoid page-specific background colors
- Keep navigation predictable and quiet

### Cards

Cards are for repeated items, modals, and framed tools. Do not put cards inside other cards.

- Use `surface`
- Use `borderSoft`
- Keep shadows minimal
- Use compact headings and clear metadata

### Inquiry Card

Used to support student inquiry prompts, next actions, and thinking scaffolds.

- Tone: suggestive, not directive
- Primary action: warm accent
- Include enough context for the next step
- Do not imply that the AI has decided the correct answer

### Reflection Card

Used for diary, reflection, and personal sense-making.

- Keep visual pressure low
- Preserve private-feeling space
- Avoid judgmental status colors
- Make edit and confirm actions clear

### Teacher Alert Card

Used to help teachers notice support opportunities.

- Show summarized, student-confirmed information only
- Avoid labels that classify students as problematic
- Use warning color sparingly
- Prefer "needs follow-up cue" over punitive phrasing

### Buttons

- Primary action: warm accent
- Secondary action: neutral surface with soft border
- Information action: trust blue only when the action is about viewing, history, or organization
- Destructive action: danger token and explicit label

Use icon buttons for familiar tool actions when an icon exists. Provide accessible labels.

### Inputs

- Use `surfaceSubtle` or `surface`
- Keep focus rings visible and warm or blue depending on context
- Helper text should be specific and non-blaming
- Error text should explain recovery

### Chips

- Use chips for filters, selectable tags, emotion labels, and compact states
- Avoid high-saturation fills
- Keep selected states clear without becoming visually loud

### AI Suggestion Block

AI suggestions must look like support, not final judgment.

- Label AI output as a suggestion, perspective, or draft
- Separate user reflection from AI-generated text
- Keep sources visible when web search or external material is used
- Do not present AI output as a final answer or teacher evaluation

## UX Writing

Student-facing text should be gentle, concrete, and connected to the next action.

Use:

- `次に試してみること`
- `問いを少し具体的にしてみましょう`
- `今わかっていること`
- `まだわからないこと`
- `まず一つ選んでみましょう`
- `AIの見立てとしては`

Avoid:

- `間違っています`
- `正解は`
- `あなたの考えは不十分です`
- `問題のある生徒`
- `AIが決めます`
- `必ずこうしてください`

Teacher-facing text should be scannable and careful. It may be more compact, but it must not expose raw private reflections or overstate AI confidence.

## Accessibility

- Use semantic HTML and accessible labels.
- Keep keyboard navigation intact.
- Maintain visible focus states.
- Do not rely on color alone for status.
- Ensure text contrast is sufficient on warm surfaces.
- Respect reduced-motion preferences.
- Avoid animation that interrupts reading or reflection.

## Do's and Don'ts

Do:

- Use warm neutral surfaces.
- Use warm accent for primary actions.
- Use trust blue for information and organization.
- Keep student-facing UI calm and supportive.
- Separate private reflections, AI drafts, and teacher-visible summaries.
- Update this file when UI rules change.

Don't:

- Reintroduce blue-primary SaaS styling.
- Add fixed colors directly in screens.
- Make AI output look like a final answer.
- Use judgmental labels for students.
- Put cards inside cards.
- Mix API, database, or workflow rules into this document.
