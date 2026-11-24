---
name: Apple
url: https://apple.com
colors:
  primary: '#0071e3'
  primary-hover: '#005bb5' # Inferred from common interactive states
  background: '#f5f5f7'
  background-dark: '#000000'
  background-dark-secondary: '#161617'
  background-dark-tertiary: '#1d1d1f'
  surface: '#ffffff'
  text-primary: '#1d1d1f'
  text-secondary: '#86868b' # Inferred from contrast pair
  text-inverse: '#ffffff'
  text-link: '#0066cc'
  text-accent: '#2997ff'
  neutral: '#d2d2d7'
  border: '#d2d2d7'
  focus-ring: '#0071e3'
typography:
  display:
    family: 'SF Pro Display, sans-serif'
    size: 56px
    weight: 400
    line-height: 1.2
  heading1:
    family: 'SF Pro Display, sans-serif'
    size: 44px
    weight: 400
    line-height: 1.2
  heading2:
    family: 'SF Pro Display, sans-serif'
    size: 28px
    weight: 400
    line-height: 1.2
  body:
    family: 'SF Pro Text, sans-serif'
    size: 17px
    weight: 400
    line-height: 1.5
  small:
    family: 'SF Pro Text, sans-serif'
    size: 14px
    weight: 400
    line-height: 1.5
  caption:
    family: 'SF Pro Text, sans-serif'
    size: 12px
    weight: 400
    line-height: 1.5
spacing:
  base: 4px
  scale: [4, 8, 12, 16, 20, 24, 32, 48, 128]
radius:
  sm: 8px
  md: 11px
  full: 999px # Extracted as 999
elevation:
  card: 'rgba(0, 0, 0, 0.22) 3px 5px 30px 0px'
motion:
  duration-fast: '240ms'
  duration-base: '320ms'
  easing-standard: 'cubic-bezier(0.4, 0, 0.6, 1)'
components:
  button-primary:
    bg: '{colors.primary}'
    text: '{colors.text-inverse}'
    radius: '{radius.md}'
    padding: '8px 15px'
  button-secondary:
    bg: 'transparent'
    text: '{colors.text-inverse}'
    border: '1px solid {colors.text-inverse}'
    radius: '{radius.md}'
    padding: '8px 15px'
  card:
    bg: '{colors.surface}'
    radius: '{radius.sm}'
    shadow: '{elevation.card}'
  input:
    bg: '{colors.surface}'
    text: '{colors.text-primary}'
    border: '1px solid {colors.neutral}'
    radius: '{radius.sm}'
    padding: '8px 12px'
---

# Design System Inspired by Apple

## 1. Visual Theme & Atmosphere
Apple's design system is characterized by its meticulous clarity, premium aesthetic, and immersive product showcases. The primary visual experience is defined by expansive, clean layouts featuring high-resolution product photography against contrasting backgrounds: light sections use `#f5f5f7` while dark, cinematic sections employ `#000000` or `#161617`. Interactive elements, such as calls-to-action, are highlighted with a vibrant `#0071e3` blue, maintaining a focused and intuitive user journey. Typography, primarily using SF Pro Display for headlines and SF Pro Text for body copy, emphasizes legibility and a sophisticated, modern tone.

The brand's signature is its ability to blend functional minimalism with a rich, engaging visual narrative. Subtle animations, including 26 SVG animations and 6 CSS animations, enhance interactivity without distracting from the content, providing a fluid user experience. The overall atmosphere is one of refined elegance and technological aspiration, where every element serves to elevate the product and user interaction.

**Key Characteristics**
*   **Clean Layouts**: Generous whitespace with `#f5f5f7` and `#000000` backgrounds.
*   **Product-Centric Imagery**: High-fidelity, full-bleed product photography.
*   **Minimal UI Chrome**: Focus on content, minimal decorative elements.
*   **SF Pro Typography**: Clear hierarchy with SF Pro Display and SF Pro Text.
*   **Vibrant CTAs**: Interactive elements use `#0071e3` for emphasis.
*   **Subtle Motion**: CSS and SVG animations enhance interaction.
*   **Soft Edges**: `8px` and `11px` border radii on interactive elements.

## 2. Color Palette & Roles
Apple's color palette is restrained yet impactful, focusing on high contrast and clear functional roles.

-   **Primary**: `#0071e3` — The core brand blue, used for primary calls-to-action, active states, and key interactive elements.
-   **Primary Hover**: `#005bb5` (inferred from common interactive states) — A slightly darker shade of blue, indicating a hover state for primary interactive elements.
-   **Accent Colors**:
    -   `#2997ff` — A lighter, more vibrant blue used for secondary text links and highlights, often on dark backgrounds.
    -   `#0066cc` — A standard blue for body text links on light backgrounds, ensuring strong readability.
-   **Neutral Scale**:
    -   `background`: `#f5f5f7` — The predominant light background color for most content sections, providing a clean canvas.
    -   `background-dark`: `#000000` — Used for immersive, full-width hero sections and global navigation, creating a dramatic contrast.
    -   `background-dark-secondary`: `#161617` — A slightly lighter dark background, used in specific dark UI contexts.
    -   `background-dark-tertiary`: `#1d1d1f` — Another dark variant, often seen in global navigation and footer backgrounds.
    -   `surface`: `#ffffff` — Pure white, used for cards, modals, and specific content blocks to create visual separation.
    -   `text-primary`: `#1d1d1f` — The main text color for body copy and headings on light backgrounds, ensuring excellent legibility.
    -   `text-secondary`: `#86868b` (inferred from contrast pair) — A muted gray for secondary information, footnotes, or less prominent text.
    -   `text-inverse`: `#ffffff` — White text used exclusively on dark backgrounds (`#000000`, `#161617`, `#1d1d1f`) for maximum contrast.
    -   `neutral`: `#d2d2d7` — A light gray used for subtle borders, dividers, and disabled states.
-   **Interactive**:
    -   `border`: `#d2d2d7` — Used for subtle borders on inputs and other structural elements.
    -   `focus-ring`: `#0071e3` — The distinct blue focus indicator for accessibility, providing clear visual feedback.

## 3. Typography Rules
Apple's typography system prioritizes clarity, hierarchy, and a modern aesthetic, primarily utilizing the SF Pro font family.

-   **Font Family**:
    -   Primary: `'SF Pro Text', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol'`
    -   Display: `'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol'`
    -   Monospace: `'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, Courier, monospace` (inferred standard stack)
-   **Hierarchy**:
    -   **Display**: `SF Pro Display` `56px` `400` · line-height `1.2` · tracking `none` · Used for prominent hero headlines.
    -   **H1**: `SF Pro Display` `44px` `400` · line-height `1.2` · tracking `none` · Primary section titles.
    -   **H2**: `SF Pro Display` `28px` `400` · line-height `1.2` · tracking `none` · Secondary section titles.
    -   **Body**: `SF Pro Text` `17px` `400` · line-height `1.5` · tracking `none` · Standard paragraph text.
    -   **Small**: `SF Pro Text` `14px` `400` · line-height `1.5` · tracking `none` · Supporting text, form labels.
    -   **Caption**: `SF Pro Text` `12px` `400` · line-height `1.5` · tracking `none` · Footnotes, metadata.
    -   **Code/Mono**: `SFMono-Regular` `14px` `400` · line-height `1.5` · tracking `none` · For code snippets or technical content.
-   **Principles**:
    -   **Functional Hierarchy**: SF Pro Display is reserved for larger, impactful headings, while SF Pro Text is used for body copy and smaller text sizes, ensuring a clear visual distinction.
    -   **Optimal Legibility**: A consistent line-height of `1.5` for body text and `1.2` for headings ensures comfortable reading across devices.
    -   **Minimal Weight Variation**: The design system predominantly uses `400` (Regular) and `600` (Semibold) weights, maintaining a clean and uncluttered appearance.
    -   **System Font Integration**: Leveraging Apple's native SF Pro fonts provides seamless integration and performance on Apple devices, with robust fallbacks for other platforms.

## 4. Component Stylings

### Buttons
Apple buttons are clean and functional, with subtle micro-interactions to provide feedback.

#### Primary Button
A prominent call-to-action with a solid blue background and white text. It subtly darkens on hover and active states, indicating interactivity.
```css
.button-primary {
  background-color: var(--color-primary, #0071e3);
  color: var(--color-text-inverse, #ffffff);
  font-family: var(--typography-body-family, 'SF Pro Text', sans-serif);
  font-size: 17px; /* Extracted from buttons data */
  font-weight: 400; /* Extracted from buttons data */
  padding: 8px 15px; /* Extracted from buttons data */
  border: none;
  border-radius: var(--radius-md, 11px);
  cursor: pointer;
  transition: background-color var(--motion-duration-fast, 240ms) var(--motion-easing-standard, cubic-bezier(0.4, 0, 0.6, 1));
}

.button-primary:hover {
  background-color: var(--color-primary-hover, #005bb5); /* inferred from screenshot */
}

.button-primary:active {
  background-color: #004488; /* inferred from screenshot */
  transform: translateY(0.5px); /* inferred from screenshot */
}

.button-primary:disabled {
  opacity: var(--sk-link-disabled-opacity, 0.42); /* Extracted from cssVariables */
  cursor: default;
}
```


<details>
<summary>Secondary Button</summary>

An outline button, typically used on dark backgrounds, providing a less assertive call-to-action. It gains a subtle background fill on hover.
```css
.button-secondary {
  background-color: transparent;
  color: var(--color-text-inverse, #ffffff);
  font-family: var(--typography-body-family, 'SF Pro Text', sans-serif);
  font-size: 17px; /* Extracted from buttons data */
  font-weight: 400; /* Extracted from buttons data */
  padding: 8px 15px; /* Extracted from buttons data */
  border: 1px solid var(--color-text-inverse, #ffffff);
  border-radius: var(--radius-md, 11px);
  cursor: pointer;
  transition: background-color var(--motion-duration-fast, 240ms) var(--motion-easing-standard, cubic-bezier(0.4, 0, 0.6, 1)),
              color var(--motion-duration-fast, 240ms) var(--motion-easing-standard, cubic-bezier(0.4, 0, 0.6, 1));
}

.button-secondary:hover {
  background-color: rgba(255, 255, 255, 0.1); /* inferred from screenshot */
}

.button-secondary:active {
  background-color: rgba(255, 255, 255, 0.2); /* inferred from screenshot */
  transform: translateY(0.5px); /* inferred from screenshot */
}

.button-secondary:disabled {
  opacity: var(--sk-link-disabled-opacity, 0.42); /* Extracted from cssVariables */
  cursor: default;
}
```

</details>

<details>
<summary>Ghost Button (Text-only)</summary>

A text-only button, often used for "Learn more" or "Buy" links within content blocks. It gains an underline on hover.
```css
.button-ghost {
  background-color: transparent;
  color: var(--color-primary, #0071e3);
  font-family: var(--typography-body-family, 'SF Pro Text', sans-serif);
  font-size: 17px; /* Extracted from buttons data */
  font-weight: 400; /* Extracted from buttons data */
  padding: 0;
  border: none;
  border-radius: 0;
  cursor: pointer;
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  gap: 4px; /* inferred from screenshot */
  transition: text-decoration var(--motion-duration-fast, 240ms) var(--motion-easing-standard, cubic-bezier(0.4, 0, 0.6, 1)),
              color var(--motion-duration-fast, 240ms) var(--motion-easing-standard, cubic-bezier(0.4, 0, 0.6, 1));
}

.button-ghost:hover {
  text-decoration: underline;
  color: var(--color-primary-hover, #005bb5); /* inferred from screenshot */
}

.button-ghost:active {
  color: #004488; /* inferred from screenshot */
}

.button-ghost:disabled {
  opacity: var(--sk-link-disabled-opacity, 0.42); /* Extracted from cssVariables */
  cursor: default;
}
```

</details>
### Cards & Containers
Cards are used to present product information or content in a distinct, elevated block.

#### Standard Card
A white card with subtle shadows, used for product listings or informational blocks. It maintains a flat appearance, with a subtle interaction on hover.
```css
.card {
  background-color: var(--colors-surface, #ffffff);
  border-radius: var(--radius-sm, 8px);
  box-shadow: var(--elevation-card, rgba(0, 0, 0, 0.22) 3px 5px 30px 0px);
  padding: var(--spacing-48, 48px); /* inferred from screenshot */
  transition: box-shadow var(--motion-duration-base, 320ms) var(--motion-easing-standard, cubic-bezier(0.4, 0, 0.6, 1));
}

.card:hover {
  box-shadow: rgba(0, 0, 0, 0.28) 4px 6px 36px 0px; /* inferred from screenshot, slightly more pronounced */
}
```


<details>
<summary>Dark Product Container</summary>

Full-width dark sections used to showcase products with white text, creating a cinematic and immersive experience.
```css
.container-dark-product {
  background-color: var(--colors-background-dark, #000000);
  color: var(--colors-text-inverse, #ffffff);
  padding: var(--spacing-48, 48px) 0; /* inferred from screenshot */
  text-align: center;
  border-radius: 0;
  transition: background-color var(--motion-duration-base, 320ms) var(--motion-easing-standard, cubic-bezier(0.4, 0, 0.6, 1));
}
```

</details>
### Inputs & Forms
Form elements are clean, with clear focus states for accessibility.

#### Text Input
A standard text input field with a light background and subtle border. It features a distinct blue focus ring.
```css
.input-text {
  background-color: var(--colors-surface, #ffffff);
  color: var(--colors-text-primary, #1d1d1f);
  font-family: var(--typography-body-family, 'SF Pro Text', sans-serif);
  font-size: 17px; /* inferred from screenshot */
  font-weight: 400; /* inferred from screenshot */
  padding: 8px 12px;
  border: 1px solid var(--colors-neutral, #d2d2d7);
  border-radius: var(--radius-sm, 8px);
  transition: border-color var(--motion-duration-fast, 240ms) var(--motion-easing-standard, cubic-bezier(0.4, 0, 0.6, 1)),
              box-shadow var(--motion-duration-fast, 240ms) var(--motion-easing-standard, cubic-bezier(0.4, 0, 0.6, 1));
}

.input-text:focus {
  border-color: var(--colors-focus-ring, #0071e3);
  outline: 2px solid var(--colors-focus-ring, #0071e3); /* Extracted from pseudoStates */
  outline-offset: var(--sk-focus-offset, 1px); /* Extracted from cssVariables */
}

.input-text:disabled {
  background-color: var(--colors-background, #f5f5f7); /* inferred from screenshot */
  color: var(--colors-text-secondary, #86868b); /* inferred from screenshot */
  cursor: not-allowed;
}
```


<details>
<summary>Form Label</summary>

Standard label for form fields, using the small text style.
```css
.form-label {
  color: var(--colors-text-primary, #1d1d1f);
  font-family: var(--typography-small-family, 'SF Pro Text', sans-serif);
  font-size: 14px;
  font-weight: 400;
  line-height: 1.5;
  display: block;
  margin-bottom: var(--spacing-4, 4px); /* inferred from screenshot */
}
```

</details>

<details>
<summary>Checkbox/Radio</summary>

(None observed in source)

</details>
### Navigation
Navigation elements are minimal and designed for clarity, especially in the global header.

#### Top Navigation Bar
A semi-transparent dark bar at the top, containing primary navigation links and utility icons.
```css
.nav-bar-top {
  background-color: rgba(0, 0, 0, 0.8); /* inferred from screenshot */
  color: var(--colors-text-inverse, #ffffff);
  height: 44px; /* Extracted from cssVariables --globalnav-height */
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 var(--spacing-20, 20px); /* inferred from screenshot */
  position: sticky;
  top: 0;
  width: 100%;
  z-index: 1; /* Extracted from elevation.zIndexValues */
  backdrop-filter: saturate(180%) blur(20px); /* inferred from common Apple styling */
  transition: background var(--motion-duration-base, 320ms) var(--motion-easing-standard, cubic-bezier(0.4, 0, 0.6, 1));
}
```


<details>
<summary>Navigation Link</summary>

Individual links within the top navigation bar, featuring subtle hover effects.
```css
.nav-link {
  color: var(--colors-text-inverse, #ffffff);
  font-family: var(--typography-caption-family, 'SF Pro Text', sans-serif);
  font-size: 12px;
  font-weight: 400;
  text-decoration: none;
  padding: 0 var(--spacing-8, 8px); /* inferred from screenshot */
  height: 44px; /* Matches nav bar height */
  display: flex;
  align-items: center;
  transition: color var(--motion-duration-fast, 240ms) var(--motion-easing-standard, cubic-bezier(0.4, 0, 0.6, 1));
}

.nav-link:hover {
  color: rgba(255, 255, 255, 0.7); /* inferred from screenshot */
}

.nav-link.active,
.nav-link[aria-current="page"] {
  color: var(--colors-text-inverse, #ffffff);
  text-decoration: underline; /* inferred from screenshot */
}
```

</details>

<details>
<summary>Dropdown Menu</summary>

(Dropdown menus are complex and context-dependent. A basic styling for a simple dropdown is provided, but full global nav flyouts involve more intricate CSS and JS.)
```css
.dropdown-menu {
  background-color: rgba(0, 0, 0, 0.8); /* inferred from screenshot */
  color: var(--colors-text-inverse, #ffffff);
  padding: var(--spacing-16, 16px);
  border-radius: var(--radius-sm, 8px); /* inferred from screenshot */
  box-shadow: rgba(0, 0, 0, 0.3) 0px 4px 12px; /* inferred from screenshot */
  position: absolute;
  top: 100%;
  left: 0;
  min-width: 160px; /* inferred from screenshot */
  z-index: 2; /* Extracted from elevation.zIndexValues */
  backdrop-filter: saturate(180%) blur(20px); /* inferred from common Apple styling */
  opacity: 0;
  visibility: hidden;
  transform: translateY(10px); /* inferred from screenshot */
  transition: opacity var(--motion-duration-base, 320ms) var(--motion-easing-standard, cubic-bezier(0.4, 0, 0.6, 1)),
              transform var(--motion-duration-base, 320ms) var(--motion-easing-standard, cubic-bezier(0.4, 0, 0.6, 1)),
              visibility var(--motion-duration-base, 320ms) step-end; /* inferred from screenshot */
}

.dropdown-menu.is-open {
  opacity: 1;
  visibility: visible;
  transform: translateY(0);
  transition: opacity var(--motion-duration-base, 320ms) var(--motion-easing-standard, cubic-bezier(0.4, 0, 0.6, 1)),
              transform var(--motion-duration-base, 320ms) var(--motion-easing-standard, cubic-bezier(0.4, 0, 0.6, 1)),
              visibility var(--motion-duration-base, 320ms) step-start; /* inferred from screenshot */
}
```

</details>
### Links
Links are distinguished by color and an underline on hover.

#### Standard Link
Used for general text links within body copy on light backgrounds.
```css
.link-standard {
  color: var(--colors-text-link, #0066cc);
  text-decoration: none;
  transition: text-decoration-color var(--motion-duration-fast, 240ms) var(--motion-easing-standard, cubic-bezier(0.4, 0, 0.6, 1));
}

.link-standard:hover {
  text-decoration: underline;
  text-decoration-color: initial; /* Extracted from pseudoStates */
}

.link-standard:visited {
  color: var(--colors-text-link, #0066cc); /* inferred from screenshot */
}
```


<details>
<summary>Secondary Link</summary>

Used for links that need to stand out more, often on dark backgrounds or as secondary CTAs.
```css
.link-secondary {
  color: var(--colors-text-accent, #2997ff);
  text-decoration: none;
  transition: text-decoration-color var(--motion-duration-fast, 240ms) var(--motion-easing-standard, cubic-bezier(0.4, 0, 0.6, 1));
}

.link-secondary:hover {
  text-decoration: underline;
  text-decoration-color: initial; /* Extracted from pseudoStates */
}

.link-secondary:visited {
  color: var(--colors-text-accent, #2997ff); /* inferred from screenshot */
}
```

</details>
### Badges
(none observed in source)

## 5. Layout Principles
Apple's layout is characterized by generous spacing, a flexible grid, and a focus on product-centric presentation.

-   **Spacing System**:
    Base unit: `4px`
    Scale: `[4px, 8px, 12px, 16px, 20px, 24px, 32px, 48px, 128px]`
    -   `4px`: Smallest increments, for tight inline elements or minor adjustments.
    -   `8px`: Standard spacing for form elements, icon-text separation, and small component margins.
    -   `12px`: Padding for smaller buttons, spacing between list items.
    -   `16px`: Default internal padding for cards, spacing between paragraphs.
    -   `20px`: Horizontal padding for global navigation on smaller viewports.
    -   `24px`: Standard gutter for grid columns (`--sk-cssgrid-column-gutter-inner`), vertical spacing between components.
    -   `32px`: Larger component margins, vertical spacing between content blocks.
    -   `48px`: Generous section padding, hero content padding.
    -   `128px`: Maximum spacing, used for large vertical separation in hero sections or between major content areas.

-   **Grid & Container** _Note: container widths and column counts are not extracted from the source. The values below are reasonable defaults inferred from the visible layout density._
    -   Max width: `1440px` (inferred from common desktop viewport size)
    -   Columns: `12` (from `--sk-cssgrid-columns`)
    -   Gutter: `24px` (from `--sk-cssgrid-column-gutter-inner-large`)
    -   Section Padding: `48px` vertical padding for main content sections (inferred from screenshot).

-   **Whitespace Philosophy**:
    Whitespace is used as a primary design element to create a sense of calm, focus, and premium quality. Ample negative space surrounds product imagery and key messages, allowing content to breathe and stand out. It guides the user's eye and reduces visual clutter, reinforcing the brand's commitment to simplicity and elegance. This generous use of space is crucial for highlighting product details and creating a luxurious, uncluttered user experience.

-   **Border Radius Scale**:
    -   `sm`: `8px` — Used for standard interactive elements like inputs and cards, providing a soft, friendly edge.
    -   `md`: `11px` — Applied to primary and secondary buttons, offering a slightly more pronounced rounded corner.
    -   `full`: `999px` — Used for capsule-shaped elements or where a fully rounded shape is desired (e.g., small badges, circular avatars).

## 6. Depth & Elevation
Apple employs a subtle elevation system, primarily relying on shadows for product cards and specific UI elements, while most interactive components remain flat. Z-index values are clearly defined for stacking context.

-   **Base (z-0)**: `none` — Default content, background elements, and most static UI.
-   **Interactive (z-1)**: `none` — Global navigation links, ensuring they are clickable above base content.
-   **Dropdown (z-2)**: `none` — Locale switcher content and other simple overlays.
-   **Card (z-3)**: `rgba(0, 0, 0, 0.22) 3px 5px 30px 0px` — Product tiles and content cards, providing a subtle lift from the background.
-   **Button (z-4)**: `none` — Primary and secondary buttons, ensuring they are interactive above cards.
-   **Curtain (z-9998)**: `none` — Global navigation overlay, used to dim content when a menu is open.
-   **Message (z-9999)**: `none` — Global message bars, appearing above all standard content.
-   **Switcher (z-10000)**: `none` — Locale switcher modal, positioned at the very top of the stacking context.

**Shadow Philosophy**:
Shadows are used sparingly and with high subtlety, primarily to give a slight sense of depth to product cards (`rgba(0, 0, 0, 0.22) 3px 5px 30px 0px`). They are not extensively used on interactive UI elements like buttons or inputs, which tend to remain flat. This approach maintains a clean, modern aesthetic, emphasizing the content and products rather than complex UI layering. The focus is on a natural, almost imperceptible lift rather than strong, defined shadows.

## 7. Do's and Don'ts

### Do's
-   **Prioritize Primary CTAs**: Always use `{colors.primary}` (`#0071e3`) for primary calls-to-action like "Learn more" buttons.
-   **Establish Clear Hierarchy**: Pair `SF Pro Display 44px 400` for main headings on `{colors.background}` (`#f5f5f7`) to ensure visual prominence.
-   **Maintain Ample Spacing**: Ensure at least `24px` of vertical spacing between major content sections to prevent clutter.
-   **Ensure Text Contrast**: Use `{colors.text-primary}` (`#1d1d1f`) for body text on `{colors.background}` (`#f5f5f7`); measured ratio 15.46:1 passes AAA.
-   **Consistent Button Radius**: Apply `border-radius: 11px` to all primary and secondary buttons for a unified soft-edge appearance.
-   **Accessible Link Colors**: Utilize `{colors.text-link}` (`#0066cc`) for standard body text links; measured ratio 5.11:1 passes AA on light backgrounds.
-   **Immersive Dark Sections**: Employ `{colors.background-dark}` (`#000000`) as a background for immersive product showcases, pairing it with `{colors.text-inverse}` (`#ffffff`).
-   **Subtle Card Elevation**: Apply `rgba(0, 0, 0, 0.22) 3px 5px 30px 0px` shadow only to product cards for subtle depth, not other UI elements.
-   **Focus Ring Visibility**: Ensure interactive elements use `{colors.focus-ring}` (`#0071e3`) for their focus state with an `outline-offset` of `1px`.

### Don'ts
-   **Avoid Low Contrast Text**: Never place `{colors.text-secondary}` (`#86868b`) text on `{colors.background-dark-tertiary}` (`#1d1d1f`) backgrounds; measured ratio 4.65:1 only passes AA.
-   **Restrict Spacing Values**: Do not introduce custom spacing values; use only the `4, 8, 12, 16, 20, 24, 32, 48, 128px` scale.
-   **Misuse Display Font**: Do not use `SF Pro Display` for body text; reserve it exclusively for headings `28px` and above.
-   **Default Underlines**: Never apply `text-decoration: underline` to links in their default state; reserve it for the `:hover` state.
-   **Inconsistent Border Radius**: Do not use `border-radius` values other than `8px`, `11px`, or `999px` for interactive elements.
-   **Compromise Dark Mode Contrast**: Avoid placing `{colors.text-accent}` (`#2997ff`) text on `{colors.background-dark}` (`#000000`) if AAA contrast is required; measured ratio 6.96:1 passes AA.
-   **Unnecessary Shadows**: Do not apply shadows to navigation elements or input fields; keep these components flat.
-   **Excessive Font Weights**: Avoid using more than two font weights (`400`, `600`) for general UI text.

## 8. Responsive Behavior
_Note: breakpoints below are measured from the source. Adjust to the brand's actual media queries when implementing._

-   **Measured Breakpoints**:
    -   **Mobile Small** (~<734px): `(max-width: 734px)`: Navigation collapses to a hamburger menu, product cards stack vertically, typography scales down.
    -   **Mobile Large** (~<833px): `(max-width: 833px)`: Refined mobile layout, some elements might shift from single column to two.
    -   **Tablet** (~<1068px): `(max-width: 1068px)`: Navigation may remain collapsed or expand to a simplified horizontal bar, grid layouts adjust to 2-4 columns.
    -   **Desktop** (~>1069px): `(min-width: 1069px)`: Full global navigation visible, multi-column layouts, larger typography.
    -   **Desktop Large** (~>1441px): `(min-width: 1441px)`: Expanded content areas, wider image displays, maximum grid columns.

-   **Touch Targets**:
    -   Minimum touch target size for interactive elements is `44px` (inferred from common practice).
    -   Maintain at least `8px` of clear space between touch targets to prevent accidental taps.

-   **Collapsing Strategy**:
    -   **Navigation**: Global navigation links collapse into a hamburger menu below `1068px`; the Apple logo and utility icons remain visible.
    -   **Cards**: Product cards transition from multi-column grids to single-column stacking on mobile breakpoints (`<734px`).
    -   **Typography**: Display and heading font sizes scale down proportionally across breakpoints to maintain legibility and fit.
    -   **Padding**: Horizontal section padding reduces from `48px` on desktop to `20px` or `16px` on mobile.
    -   **Forms**: Input fields and form elements maintain their full width but reduce vertical padding on smaller screens.
    -   **Spacing**: Vertical spacing between content blocks may be slightly condensed on mobile to optimize screen real estate.

## 9. Agent Prompt Guide

-   **Quick Color Reference**
    -   primary: `#0071e3`
    -   primary-hover: `#005bb5`
    -   background: `#f5f5f7`
    -   background-dark: `#000000`
    -   background-dark-secondary: `#161617`
    -   background-dark-tertiary: `#1d1d1f`
    -   surface: `#ffffff`
    -   text-primary: `#1d1d1f`
    -   text-secondary: `#86868b`
    -   text-inverse: `#ffffff`
    -   text-link: `#0066cc`
    -   text-accent: `#2997ff`
    -   neutral: `#d2d2d7`
    -   border: `#d2d2d7`
    -   focus-ring: `#0071e3`

-   **Iteration Guide**
    1.  Always use `{colors.primary}` (`#0071e3`) for primary CTA backgrounds with `{colors.text-inverse}` (`#ffffff`) text.
    2.  Ensure primary buttons have `8px 15px` padding and `border-radius: 11px`.
    3.  Apply `SF Pro Display 56px 400` for hero display text and `SF Pro Text 17px 400` for body copy.
    4.  Utilize the `4, 8, 12, 16, 20, 24, 32, 48, 128px` spacing scale for all layout and component spacing.
    5.  Set `border-radius: 8px` for standard cards and input fields.
    6.  Ensure text input fields have a `1px solid {colors.neutral}` border and a `2px solid {colors.focus-ring}` focus ring with `1px` offset.
    7.  Implement `opacity: 0.42` for all `:disabled` interactive elements.
    8.  Apply `rgba(0, 0, 0, 0.22) 3px 5px 30px 0px` shadow only to product cards, not other UI components.
    9.  Ensure `SF Pro Text 12px 400` navigation links on `{colors.background-dark}` (`#000000`) turn `rgba(255,255,255,0.7)` on hover.
    10. Maintain AAA contrast for `{colors.text-primary}` (`#1d1d1f`) on `{colors.background}` (`#f5f5f7`).
    11. Implement a `transition: background-color 240ms cubic-bezier(0.4, 0, 0.6, 1)` for button hover states.
    12. Collapse global navigation into a hamburger menu at `(max-width: 1068px)`.

<!-- DESIGNMD_VALIDATOR_WARNINGS
{
  "version": 1,
  "generatedAt": "2026-11-12T19:53:48.565Z",
  "summary": {
    "unpairedBanned": 2,
    "bannedPhrase": 1,
    "total": 3
  },
  "warnings": [
    {
      "kind": "banned-phrase",
      "term": "premium aesthetic",
      "sentence": "Apple's design system is characterized by its meticulous clarity, premium aesthetic, and immersive product showcases."
    },
    {
      "kind": "unpaired-banned-word",
      "term": "premium",
      "sentence": "Apple's design system is characterized by its meticulous clarity, premium aesthetic, and immersive product showcases."
    },
    {
      "kind": "unpaired-banned-word",
      "term": "refined",
      "sentence": "The overall atmosphere is one of refined elegance and technological aspiration, where every element serves to elevate the product and user interaction."
    }
  ]
}
-->
