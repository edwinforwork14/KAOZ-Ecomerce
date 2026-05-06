---
name: Industrial Athletics Core
colors:
  surface: '#131313'
  surface-dim: '#131313'
  surface-bright: '#393939'
  surface-container-lowest: '#0e0e0e'
  surface-container-low: '#1c1b1b'
  surface-container: '#201f1f'
  surface-container-high: '#2a2a2a'
  surface-container-highest: '#353534'
  on-surface: '#e5e2e1'
  on-surface-variant: '#c4c7c8'
  inverse-surface: '#e5e2e1'
  inverse-on-surface: '#313030'
  outline: '#8e9192'
  outline-variant: '#444748'
  surface-tint: '#c6c6c6'
  primary: '#ffffff'
  on-primary: '#2f3131'
  primary-container: '#e2e2e2'
  on-primary-container: '#636565'
  inverse-primary: '#5d5f5f'
  secondary: '#c8c6c4'
  on-secondary: '#30302f'
  secondary-container: '#474745'
  on-secondary-container: '#b6b5b3'
  tertiary: '#ffffff'
  on-tertiary: '#33302f'
  tertiary-container: '#e8e1df'
  on-tertiary-container: '#686362'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#e2e2e2'
  primary-fixed-dim: '#c6c6c6'
  on-primary-fixed: '#1a1c1c'
  on-primary-fixed-variant: '#454747'
  secondary-fixed: '#e4e2e0'
  secondary-fixed-dim: '#c8c6c4'
  on-secondary-fixed: '#1b1c1b'
  on-secondary-fixed-variant: '#474745'
  tertiary-fixed: '#e8e1df'
  tertiary-fixed-dim: '#ccc5c4'
  on-tertiary-fixed: '#1e1b1a'
  on-tertiary-fixed-variant: '#4a4645'
  background: '#131313'
  on-background: '#e5e2e1'
  surface-variant: '#353534'
typography:
  display:
    fontFamily: Space Grotesk
    fontSize: 72px
    fontWeight: '700'
    lineHeight: '1.1'
    letterSpacing: -0.04em
  h1:
    fontFamily: Space Grotesk
    fontSize: 48px
    fontWeight: '600'
    lineHeight: '1.2'
    letterSpacing: -0.02em
  h2:
    fontFamily: Space Grotesk
    fontSize: 32px
    fontWeight: '600'
    lineHeight: '1.2'
    letterSpacing: -0.01em
  h3:
    fontFamily: Space Grotesk
    fontSize: 24px
    fontWeight: '500'
    lineHeight: '1.3'
    letterSpacing: 0em
  body-lg:
    fontFamily: Space Grotesk
    fontSize: 18px
    fontWeight: '400'
    lineHeight: '1.6'
    letterSpacing: 0em
  body-md:
    fontFamily: Space Grotesk
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.6'
    letterSpacing: 0em
  label-caps:
    fontFamily: Space Grotesk
    fontSize: 12px
    fontWeight: '700'
    lineHeight: '1'
    letterSpacing: 0.15em
  mono-data:
    fontFamily: Space Grotesk
    fontSize: 14px
    fontWeight: '500'
    lineHeight: '1'
    letterSpacing: 0.05em
spacing:
  unit: 4px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 48px
  xxl: 80px
  gutter: 16px
  margin: 24px
---

## Brand & Style

The design system for KAOS Urban Athletics is built on a foundation of technical precision and raw urban energy. It targets a high-performance demographic that values "engineered" aesthetics over superficial trends. The brand personality is disciplined, utilitarian, and uncompromisingly premium.

The visual style merges **Minimalism** with **Modern Industrial** cues. It avoids organic shapes in favor of structured, geometric rigidity. The emotional response should be one of "industrial reliability"—feeling like a piece of high-end gym equipment or architectural concrete. By stripping away color, the focus shifts entirely to form, texture (implied through grays), and the rhythm of typography.

## Colors

This design system utilizes a strictly monochrome palette to emphasize high-contrast technical layouts. 

- **Primary (Branco):** Used for primary text and high-action focal points. It provides the maximum contrast against the dark canvas.
- **Secondary (Inox):** A light metallic gray for supporting UI elements, icons, and secondary actions.
- **Tertiary (Cinza):** Used for disabled states, borders, and subtle structural dividers.
- **Surface (Chumbo):** The primary container color. It sits one level above the background to create depth without using shadows.
- **Background (Preto):** The base canvas. Dark mode is the default and mandatory state to maintain the "Urban Night" aesthetic.

The palette is intentionally devoid of hue to keep the focus on photography and performance data.

## Typography

The typography uses **Space Grotesk** exclusively. This choice reinforces the technical, futuristic, and geometric nature of the brand.

- **Headlines:** Should be set with tight tracking (letter-spacing) to feel dense and powerful. 
- **Labels:** Use uppercase styling with generous letter spacing for a "technical specification" look, ideal for tags, categories, and small metadata.
- **Numerics:** Since performance metrics are key, use the font's geometric numerals for heart rates, weights, and times, ensuring they are always high-contrast (Branco on Preto).

## Layout & Spacing

This design system employs a **Fixed Grid** model for desktop and a **Fluid Grid** for mobile. The layout rhythm is based on a 4px baseline, ensuring all elements align to a strict mathematical scale.

- **Grid:** A 12-column system is used for web, while a 4-column system is used for mobile. 
- **Margins:** Generous outer margins (24px+) prevent the technical UI from feeling cluttered.
- **Gutters:** Tight 16px gutters keep related information clusters feeling unified.
- **Composition:** High-contrast "asymmetric" layouts are encouraged. Large blocks of Preto (Black) background should be balanced by sharp, precise lines of Branco (White) text or Inox (Light Gray) borders.

## Elevation & Depth

To maintain a minimal and industrial aesthetic, this design system rejects ambient shadows. Depth is achieved through **Tonal Layers** and **Low-contrast Outlines**.

1. **Level 0 (Background):** Preto (#121212) - The base of the application.
2. **Level 1 (Containers/Cards):** Chumbo (#2c2c2c) - Used to group information.
3. **Level 2 (Active States/Popovers):** Cinza (#75706f) - Only used for temporary overlays or highlighted segments.

**Borders:** Instead of shadows, use 1px solid borders in Cinza or Chumbo to define shapes. This creates a "blueprinted" look that feels more technical and intentional than soft shadows.

## Shapes

The shape language is strictly **Sharp (0px roundedness)**. 

To evoke an industrial, engineered feel, there are no rounded corners in this design system. Buttons, input fields, cards, and image containers must all feature 90-degree angles. This severity reinforces the "KAOS" brand—bold, direct, and architectural. The only exception to circularity is for user avatars or specific data visualizations (like progress rings), which must be perfectly circular to maintain the geometric theme.

## Components

- **Buttons:**
    - **Primary:** Solid Branco background with Preto text. Sharp corners.
    - **Secondary:** Transparent background with a 1px Inox border and Inox text.
    - **Hover States:** Invert the colors or shift the border thickness to 2px for a tactile "mechanical" feel.

- **Input Fields:**
    - Underlined style or full Chumbo box with 1px Cinza border. Labels should use the `label-caps` typography style placed above the field.

- **Chips/Tags:**
    - Small, rectangular blocks with Cinza background and Branco text. Avoid any padding-left/right that makes them look pill-shaped; keep them as rigid rectangles.

- **Cards:**
    - Background: Chumbo. No shadow. 1px Cinza border. Use typography and spacing to create hierarchy within the card rather than decorative elements.

- **Lists:**
    - Separated by 1px solid Chumbo horizontal lines. Use the `mono-data` font style for list suffixes (e.g., timestamps or values) to maintain the technical aesthetic.

- **Additional Components:**
    - **Data Visualizer:** Use 1px stroke lines for graphs. Avoid filled area charts; keep them as wireframes to maintain the minimal, industrial theme.