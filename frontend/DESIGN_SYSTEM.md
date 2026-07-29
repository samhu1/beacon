# Signal0 Design System

**Premium News Aggregator · Bloomberg Terminal × Apple News × Notion**

---

## 1. Design Principles

- **Calm & Intentional**: No visual noise, every element serves a purpose
- **Premium & Trustworthy**: High-quality typography, subtle shadows, refined spacing
- **Highly Legible**: Excellent contrast, generous whitespace, clear hierarchy
- **Structured**: Consistent grid, predictable patterns, logical information architecture

---

## 2. Color System

### Dark-First Palette

#### Backgrounds
```
bg-main:     #050509  - Deep charcoal, main canvas
bg-elevated: #141419  - Slightly lighter, for cards
bg-subtle:   #1E1E28  - Pills, secondary surfaces
bg-hover:    #252530  - Hover states
```

#### Text
```
text-primary:   #F7F7FA  - Main content, headlines
text-secondary: #A0A3B5  - Metadata, labels
text-tertiary:  #707385  - Timestamps, captions
text-accent:    #E1E4FF  - Interactive labels
```

#### Accents
```
accent-main:      #5B7FFF  - Primary CTA, links, selection
accent-secondary: #E85D9A  - Highlights, subtle glows
```

#### Semantic / Sentiment
```
positive: #4ECDC4  (teal)
negative: #FF6B6B  (soft red)
neutral:  #6B8EAE  (blue-grey)
```

#### Category Colors
```
AI:       #5B7FFF  (blue)
Markets:  #4ECDC4  (teal)
Politics: #FF6B6B  (red)
Culture:  #E85D9A  (magenta)
World:    #6B8EAE  (grey-blue)
```

#### Borders
```
border-subtle: rgba(255, 255, 255, 0.08)  - 1px dividers
border-strong: rgba(255, 255, 255, 0.12)  - Key separations
border-accent: rgba(91, 127, 255, 0.3)    - Accent borders
```

---

## 3. Typography

### Font Family
**Inter** (fallback: system sans-serif)

### Type Scale

| Token | Size | Weight | Line Height | Usage |
|-------|------|--------|-------------|-------|
| `display-lg` | 32px | 600 | 1.2 | Page titles |
| `h1` | 24px | 600 | 1.3 | Section headers |
| `h2` | 20px | 600 | 1.3 | Subsection headers |
| `h3` | 18px | 500-600 | 1.3 | Card titles |
| `body-lg` | 16px | 400-500 | 1.5 | Main copy |
| `body-sm` | 14px | 400 | 1.4 | Metadata, tags |
| `caption-xs` | 12px | 500 | 1.3 | Timestamps, labels |

### Font Weights
- Regular: 400
- Medium: 500
- Semibold: 600
- Bold: 700

---

## 4. Spacing System

**Base unit: 4px**

```
spacing-1:  4px
spacing-2:  8px
spacing-3:  12px
spacing-4:  16px
spacing-5:  20px
spacing-6:  24px
spacing-8:  32px
spacing-10: 40px
spacing-12: 48px
```

### Common Patterns
- Card padding: 16-20px
- Section spacing: 40-48px
- Card gaps: 16-24px
- Button padding: 12px 24px

---

## 5. Layout Grid

- **Columns**: 12
- **Gutter**: 24px
- **Max width**: 1320px
- **Outer margin**: 48px (desktop), 20px (mobile)

### Breakpoints
```
mobile:  375px - 767px
tablet:  768px - 1023px
desktop: 1024px+
wide:    1440px+
```

---

## 6. Border Radius

```
sm:   8px   - Small buttons, inputs
md:   12px  - Compact cards
lg:   16px  - Standard cards
xl:   18px  - Large cards
full: 9999px - Pills, tags, rounded buttons
```

---

## 7. Shadows

```
subtle: 0 2px 8px rgba(0,0,0,0.12)   - Resting cards
medium: 0 4px 16px rgba(0,0,0,0.16)  - Hover cards
strong: 0 8px 24px rgba(0,0,0,0.24)  - Modals, overlays
glow-accent: 0 0 24px rgba(91,127,255,0.3)  - Node halos
```

---

## 8. Motion & Transitions

### Duration
- Fast: 120ms (micro-interactions)
- Base: 180ms (standard transitions)
- Slow: 240ms (complex animations)

### Easing
- `ease-out` for entrances
- `ease-in-out` for state changes

### Principles
- No bouncy animations
- Confident and calm movements
- Subtle scale/fade combinations

---

## 9. Iconography

- **Style**: Thin line icons
- **Stroke width**: 1.5px
- **Size**: 16px, 20px, 24px
- **Library**: Lucide React (consistent with current setup)

---

## 10. Component Specifications

### Button

**Primary Button**
- Height: 40px
- Padding: 12px 24px
- Radius: 9999px (pill)
- Font: body-sm (14px), medium (500)
- Background: accent-main
- Text: text-primary
- Hover: accent-main-hover + lift 2px + shadow-medium
- Active: scale 0.98
- Transition: 180ms ease-out

**Secondary Button**
- Same dimensions
- Background: transparent
- Border: 1px border-strong
- Text: text-secondary
- Hover: bg-subtle + text-primary

**Icon Button**
- Size: 40px × 40px
- Radius: 8px or full
- Background: transparent
- Hover: bg-subtle
- Icon: 20px

### Card

**Standard Story Card**
- Width: 100% of container
- Padding: 20px
- Radius: 16px
- Background: bg-elevated
- Border: 1px border-subtle
- Shadow: subtle (resting), medium (hover)
- Hover: lift 4px, border-strong
- Transition: 180ms ease-out

**Compact Briefing Card**
- Padding: 16px
- Radius: 12px
- Same colors/borders

### Pill / Tag

**Category Pill**
- Height: 24px
- Padding: 6px 12px
- Radius: 9999px
- Font: caption-xs (12px), medium
- Background: bg-subtle
- Text: text-secondary
- Border: 1px border-subtle

**Sentiment Tag**
- Same dimensions
- Background: positive-subtle / negative-subtle / neutral-subtle
- Text: positive / negative / neutral
- Optional dot indicator (6px circle)

### Badge

**Noise Compression Badge**
- Height: 20px
- Padding: 4px 8px
- Radius: 6px
- Font: caption-xs, medium
- Background: accent-main with 20% opacity
- Text: accent-main
- Icon: 12px compression symbol

**Rank Badge**
- Size: 28px × 28px
- Radius: 8px
- Font: caption-xs, semibold
- Background: gradient (accent-main to accent-secondary)
- Text: text-primary
- Position: absolute top-left of card

### Input

**Search Input**
- Height: 44px
- Padding: 12px 16px
- Radius: 12px
- Font: body-sm
- Background: bg-subtle
- Border: 1px border-subtle
- Focus: border-accent + shadow-glow-accent
- Placeholder: text-tertiary

### Graph Node

**Story Cluster Node**
- Radius: 12px - 24px (based on importance)
- Core: bg-elevated (solid)
- Halo: accent-main or accent-secondary (30-40% opacity, 8px blur)
- Category ring: 2px stroke, category color
- Sentiment indicator: 4px dot at edge
- Hover: scale 1.1, intensify glow
- Selected: scale 1.15, strong glow, connected edges brighten

### Timeline

**Horizontal Micro-Timeline**
- Height: 32px
- Line: 2px, border-subtle
- Dots: 8px circles, bg-elevated with border-strong
- Active dot: accent-main with glow
- Spacing: proportional to time intervals

**Vertical Timeline (Detail View)**
- Width: 2px line, border-subtle
- Event bullets: 12px circles
- Spacing: 24px between events
- Hover: bullet scales to 14px, shows tooltip

---

## 11. Screen Layouts

### Map View (Desktop 1440px)

```
┌─────────────────────────────────────────────────────────────┐
│ Top Bar (72px)                                              │
│ [Logo] [Search ──────────────────] [🔔] [👤]              │
├──┬──────────────────────────────────────────────────────┬───┤
│N │ Map View                                             │ S │
│a │ ┌────────────────────────────────────────────────┐  │ i │
│v │ │ Today's Map          [3h▾] [AI][Markets][All]  │  │ d │
│  │ └────────────────────────────────────────────────┘  │ e │
│7 │                                                      │   │
│2 │ ┌────────────────────────────────────────────────┐  │ P │
│p │ │                                                 │  │ a │
│x │ │         [Graph Canvas - 640px height]          │  │ n │
│  │ │                                                 │  │ e │
│  │ │          ●  ●    ●                             │  │ l │
│  │ │       ●     ●  ●   ●                          │  │   │
│  │ │         ●  ●    ●                             │  │ 3 │
│  │ │                                                 │  │ 6 │
│  │ └────────────────────────────────────────────────┘  │ 0 │
│  │                                                      │ p │
│  │ [Story List or Selected Story Detail]               │ x │
└──┴──────────────────────────────────────────────────────┴───┘
```

### Stream View (Desktop)

```
┌─────────────────────────────────────────────────────────────┐
│ Top Bar (72px)                                              │
├──┬──────────────────────────────────────────────────────────┤
│N │ Stream                                                   │
│a │ ┌────────────────────────────────────────────────────┐  │
│v │ │ [All][Following][Saved]  [AI][Markets]  [Sort ▾]  │  │
│  │ └────────────────────────────────────────────────────┘  │
│  │                                                          │
│  │ ┌────────────────────────────────────────────────────┐  │
│  │ │ Story Card (840px width, centered)                 │  │
│  │ │ [AI • Policy]              [Reduced 72%] [●Neutral]│  │
│  │ │ Title: Major AI Policy Update...                   │  │
│  │ │ • Bullet 1                                         │  │
│  │ │ • Bullet 2                                         │  │
│  │ │ Sources: [NYT][WSJ][BBC] +2                       │  │
│  │ │ Timeline: ●───●───●                               │  │
│  │ │ [🔖] [👁️‍🗨️]                    [Open Story →]      │  │
│  │ └────────────────────────────────────────────────────┘  │
│  │                                                          │
│  │ [24px spacing]                                           │
│  │                                                          │
│  │ ┌────────────────────────────────────────────────────┐  │
│  │ │ Story Card 2...                                    │  │
│  │ └────────────────────────────────────────────────────┘  │
└──┴──────────────────────────────────────────────────────────┘
```

### Mobile (375px)

```
┌───────────────────────┐
│ [Logo] [🔍] [🔔] [👤]│ 56px
├───────────────────────┤
│                       │
│   Main Content        │
│   (Full Width)        │
│                       │
│                       │
│                       │
│                       │
│                       │
│                       │
│                       │
├───────────────────────┤
│ [Map][Stream][Brief]  │ 64px
│ [  ●  ][      ][    ] │
└───────────────────────┘
```

---

## 12. Interaction States

### Card Interactions
- **Default**: shadow-subtle, border-subtle
- **Hover**: lift 4px, shadow-medium, border-strong
- **Active/Click**: scale 0.99, shadow-subtle
- **Selected**: border-accent, shadow-glow-accent

### Node Interactions
- **Default**: gentle float animation
- **Hover**: scale 1.1, glow intensifies, tooltip appears
- **Selected**: scale 1.15, strong glow, dim unconnected nodes to 30%
- **Connected**: edges brighten to full opacity

### Button Interactions
- **Default**: resting state
- **Hover**: lift 2px, shadow-medium, color shift
- **Active**: scale 0.98
- **Disabled**: opacity 40%, no hover

---

## 13. Loading & Empty States

### Skeleton Loader
- Background: bg-subtle
- Shimmer: linear gradient sweep, 1.5s duration
- Shapes: match final content (rectangles for text, circles for avatars)

### Empty State
- Icon: 48px, text-tertiary
- Heading: h3, text-secondary
- Description: body-sm, text-tertiary
- CTA: Primary button

---

## 14. Accessibility

- **Contrast ratios**: WCAG AA minimum (4.5:1 for text)
- **Focus indicators**: 2px accent-main ring, 2px offset
- **Keyboard navigation**: All interactive elements tabbable
- **Screen readers**: Proper ARIA labels and semantic HTML
- **Motion**: Respect `prefers-reduced-motion`

---

## 15. Implementation Notes

### CSS Custom Properties
All tokens defined in `design-system.css` using `@theme` directive (Tailwind v4)

### Component Library
Build reusable React components in `frontend/src/components/`:
- `Button.jsx`
- `Card.jsx`
- `Badge.jsx`
- `Pill.jsx`
- `Input.jsx`
- `GraphNode.jsx`
- `Timeline.jsx`
- `StoryCard.jsx`
- `SkeletonLoader.jsx`

### State Management
- Use React Context for global state (filters, selected story, theme)
- Local state for component interactions
- Consider Zustand for complex state if needed

### Graph Rendering
- Use D3.js force simulation for node layout
- Canvas or SVG rendering (SVG preferred for accessibility)
- Optimize for 50-100 nodes visible at once

---

**End of Design System Documentation**

