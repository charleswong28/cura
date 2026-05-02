# Cura Design System

Design tokens and component specifications. Source reference: [Refero style](https://styles.refero.design/style/b458ca1a-70f0-4f85-b745-f879a4d08457).

---

## Colors

### Neutrals

| Name | Hex | Usage |
|------|-----|-------|
| Ink Black | `#000000` | Primary text, headings, borders |
| Snow | `#ffffff` | Card backgrounds (90% opacity) |
| Canvas | `#f8f8f8` | Page background |
| Fog | `#efefef` | Header background |
| Pebble | `#d9d9d9` | Button fills |
| Graphite | `#636363` | Body text |
| Slate | `#959595` | Tertiary / metadata text |
| Steel | `#aeaeae` | Disabled states, icon strokes |
| Ash | `#7c7c7c` | Subtle borders |

### Accents

| Name | Hex | Usage |
|------|-----|-------|
| Rose Quartz | `#c679c4` | Spectrum gradient — pink anchor |
| Marigold | `#ffb005` | Spectrum gradient — amber anchor |
| Signal Blue | `#0358f7` | Spectrum gradient — blue anchor |
| Hot Pink | `#fd02f5` | Accent highlight only |

### Spectrum Gradient

Used exclusively as ambient glow or decorative strip — never as a solid fill.

```css
linear-gradient(90deg, #c679c4 0%, #fa3d1d 25%, #ffb005 50%, #e1e1fe 75%, #0358f7 100%)
```

---

## Typography

**Primary font:** ABC Oracle (weights 300, 400, 500)
Fallbacks: GT Super Display → DM Sans → Instrument Serif light

Scale uses Minor Third ratio (×1.2).

| Role | Size | Weight | Line Height | Letter Spacing |
|------|------|--------|-------------|----------------|
| display | 72px | 300 | 1.11 | −2.88px |
| heading-lg | 54px | 300 | 1.17 | −2.16px |
| heading | 50px | 400 | 1.18 | −2px |
| heading-sm | 22px | 400 | 1.25 | −0.44px |
| subheading | 18px | 400 | 1.33 | — |
| body | 16px | 400 | 1.25 | — |
| body-sm | 14px | 400 | 1.21 | — |
| caption | 10px | 400 | 1.50 | — |

**Rules:**
- Weight 300 for display (50px+) with `letter-spacing: -0.04em`
- Maximum weight: 500 — never use 600+
- Never introduce a second typeface
- Link hover: animate underline only, never change color

---

## Spacing

**Base unit:** 8px

| Token | Value |
|-------|-------|
| xs | 5px |
| sm | 6px |
| md | 10px |
| lg | 14–15px |
| xl | 20px |
| 2xl | 24px |
| 3xl | 32px |
| 4xl | 34px |

**Layout:**

| Purpose | Value |
|---------|-------|
| Max content width | 1200px |
| Section vertical gap | 80–120px |
| Card padding | 32px |
| Element gap | 15–20px |

---

## Border Radius

| Element | Value |
|---------|-------|
| Cards | 30px |
| Buttons (default) | 30px |
| Pill buttons | 9999px |
| Images | 10px |
| Nav items | 16px |
| Containers | 40px |

Minimum radius anywhere: 10px — never go below.

---

## Shadows

One shadow token used throughout the entire system:

```css
box-shadow: rgba(0, 0, 0, 0.08) 0px 0px 8px 0px;
```

Never exceed 8px blur. No coloured shadows.

---

## Surface Elevation

| Level | Name | Background | Extra |
|-------|------|------------|-------|
| 0 | Canvas | `#f8f8f8` | Page background |
| 1 | Header | `#efefef` | `backdrop-filter: blur(24px)` |
| 2 | Card | `rgba(255, 255, 255, 0.9)` | `backdrop-filter: blur(24px)` |
| 3 | Button | `#d9d9d9` | — |

No dark section backgrounds.

---

## Components

### Frosted Content Card

```css
background: rgba(255, 255, 255, 0.9);
backdrop-filter: blur(24px);
border-radius: 30px;
padding: 32px;
box-shadow: rgba(0, 0, 0, 0.08) 0px 0px 8px 0px;
```

- Heading text: `#000000`
- Body text: `#636363`

### Neutral Filled Button

```css
background: #d9d9d9;
color: rgba(0, 0, 0, 0.85);
border-radius: 30px;
font-size: 14–16px;
font-weight: 500;
```

Hover state: `background: #000000; color: #ffffff`

### Ghost Pill Button

```css
background: transparent;
color: rgba(0, 0, 0, 0.85);
border-radius: 9999px;
```

### Sticky Header

```css
background: #efefef;
backdrop-filter: blur(24px);
height: ~52px;
```

Nav links: 14px, weight 400, `#000000`

---

## Do / Don't

| Do | Don't |
|----|-------|
| Use spectrum gradient as ambient glow or decorative strip only | Use saturated colors as solid fills |
| Keep buttons neutral gray or transparent | Use radius below 10px |
| Apply 30px radius consistently | Use font weights above 500 |
| Apply `backdrop-filter: blur(24px)` to elevated surfaces | Add shadows beyond 8px blur |
| Use `#636363` for body, `#959595` for tertiary text | Place dark section backgrounds |
| Animate underline on link hover | Change link color on hover |
| Single typeface (ABC Oracle) throughout | Introduce a second typeface |
