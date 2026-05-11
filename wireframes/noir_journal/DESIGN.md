---
name: Noir Journal
colors:
  surface: '#f4fbf4'
  surface-dim: '#d4dcd5'
  surface-bright: '#f4fbf4'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eef6ee'
  surface-container: '#e8f0e8'
  surface-container-high: '#e2eae3'
  surface-container-highest: '#dde4dd'
  on-surface: '#161d19'
  on-surface-variant: '#3c4a42'
  inverse-surface: '#2b322d'
  inverse-on-surface: '#ebf3eb'
  outline: '#6c7a71'
  outline-variant: '#bbcabf'
  surface-tint: '#006c49'
  primary: '#006c49'
  on-primary: '#ffffff'
  primary-container: '#0fbd83'
  on-primary-container: '#00452d'
  inverse-primary: '#4adfa2'
  secondary: '#5f5e5e'
  on-secondary: '#ffffff'
  secondary-container: '#e2dfde'
  on-secondary-container: '#636262'
  tertiary: '#a43b37'
  on-tertiary: '#ffffff'
  tertiary-container: '#ff8078'
  on-tertiary-container: '#741818'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#6cfcbc'
  primary-fixed-dim: '#4adfa2'
  on-primary-fixed: '#002113'
  on-primary-fixed-variant: '#005236'
  secondary-fixed: '#e5e2e1'
  secondary-fixed-dim: '#c8c6c5'
  on-secondary-fixed: '#1c1b1b'
  on-secondary-fixed-variant: '#474746'
  tertiary-fixed: '#ffdad7'
  tertiary-fixed-dim: '#ffb3ad'
  on-tertiary-fixed: '#410004'
  on-tertiary-fixed-variant: '#842422'
  background: '#f4fbf4'
  on-background: '#161d19'
  surface-variant: '#dde4dd'
typography:
  display-xl:
    fontFamily: Newsreader
    fontSize: 48px
    fontWeight: '400'
    lineHeight: '1.1'
  headline-md:
    fontFamily: Newsreader
    fontSize: 24px
    fontWeight: '400'
    lineHeight: '1.2'
  label-caps:
    fontFamily: Be Vietnam Pro
    fontSize: 12px
    fontWeight: '500'
    lineHeight: '1'
    letterSpacing: 0.15em
  body-main:
    fontFamily: Be Vietnam Pro
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.5'
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  container-max: 448px
  edge-margin: 1.5rem
  stack-gap-lg: 2rem
  stack-gap-md: 0.75rem
  stack-gap-sm: 0.25rem
---

## Brand & Style

The brand identity is "Editorial Minimalism" with a "Cinematic Nostalgia" twist. It evokes the feeling of a premium independent magazine or a curated vintage film gallery. The target audience values intentionality, aesthetics, and the "romanticization" of daily life.

The design style is a hybrid of **Minimalism** and **Soft Brutalism**. It utilizes high-contrast typography and heavy structural borders (Brutalism) but maintains a clean, airy layout with generous white space and a muted, sophisticated color palette (Minimalism). A subtle noise texture overlay adds a tactile, analog film quality to the digital interface, reducing the clinical feel of flat design.

## Colors

The palette is grounded in high-contrast neutrals to maintain an editorial feel. 

- **Primary**: A vibrant mint green (#0FBD83) used sparingly for selection states and brand accents.
- **Surface**: An off-white, slightly cool "Paper" tint (#F6F8F7) serves as the primary canvas.
- **Ink**: The core text and structural elements use a near-black (#232323) and true black/dark grey (#1A1A1A) for maximum legibility and "hard" visual weight.
- **Muted**: A medium grey (#8A8A8A) is reserved for metadata and secondary labels to create a clear hierarchy.

## Typography

The system relies on a sophisticated "Serif-Sans" pairing. 

- **Display & Headlines**: Newsreader provides a literary, authoritative voice. Italics are used for primary headers to emphasize the "Memoir" or storytelling aspect.
- **Body & Interface**: Be Vietnam Pro (substituted for Satoshi) offers a clean, contemporary sans-serif counterpart that ensures high legibility for metadata and functional UI elements.
- **Hierarchy**: Dramatic scale shifts (48px to 12px) create an immediate editorial rhythm. Metadata is always uppercase with wide tracking to distinguish it from narrative content.

## Layout & Spacing

The system uses a **Fixed Grid** approach for mobile-first consumption, centered within a maximum width of 448px. 

- **Rhythm**: Vertical spacing follows a "tight-loose" rhythm. Content within a group (e.g., a card's image and its title) is tightly packed (0.75rem), while distinct sections or articles are separated by a generous gap (2rem).
- **Safe Areas**: A consistent side margin of 1.5rem (24px) ensures content never feels crowded against the screen edges.
- **Alignment**: All elements are left-aligned to mirror the reading experience of a book or magazine.

## Elevation & Depth

This system rejects traditional ambient shadows in favor of **Structural Depth**.

- **Hard Shadows**: Depth is communicated through "Hard Shadows"—solid, non-blurred offsets (4px 4px 0px 0px) in `#1A1A1A`. This gives interactive elements a physical, "stamped" feel.
- **Borders**: 1px solid borders in `#1A1A1A` define the boundaries of cards and inputs, reinforcing the Brutalist influence.
- **Tonal Layers**: The noise texture overlay acts as the top-most layer, "binding" the background and foreground elements together under a single atmospheric grain.

## Shapes

The shape language is primarily **Sharp**. 

- **Containers**: Article thumbnails and cards use a 2px (rounded-sm) radius, appearing almost square to maintain a serious, architectural look.
- **Floating Elements**: Action buttons (FABs) break the grid with a fully circular (rounded-full) shape, making them instantly recognizable as interactive "tools" rather than content containers.
- **Media**: All images should maintain a consistent 16:9 aspect ratio with a subtle border to separate photography from the background.

## Components

### Buttons
- **Floating Action Button (FAB)**: Large (56x56px), circular, with a black background and a hard shadow. On hover, the icon rotates 90 degrees.
- **Standard Buttons**: Rectangular with a 2px radius and 1px border.

### Cards
- **Article Card**: A vertical stack consisting of a 16:9 image container (with a 1px border), followed by a serif headline and uppercase sans-serif metadata. 
- **Interactive State**: Cards should scale slightly (98%) on press to provide tactile feedback.

### Feedback & Motion
- **Noise Overlay**: A persistent SVG turbulence filter at 4% opacity across the entire viewport.
- **Skeleton States**: Use the `#F0EFEA` tint for loading blocks to match the warm paper aesthetic.
- **Transitions**: Use long durations (700ms) for image hover scales to mimic a slow-motion cinematic feel, but fast durations (200ms) for UI interactions like button presses.

### Input Fields
- Underlined or fully boxed with 1px black borders. No soft shadows. Typography should be `body-main`.