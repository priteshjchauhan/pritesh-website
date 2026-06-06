# p.rite.sh — personal showcase

A modern, immersive, brochure-style personal site for **Pritesh J. Chauhan** — a
rebuild of the old WordPress site. Single page, no CMS, no build step.

## How to view

**Just double-click `index.html`.** Everything (including the 3D) works directly
over `file://` — Three.js is vendored locally and the scripts are plain classic
scripts, so there's no build, server, or internet requirement.

Optional: to serve it over HTTP instead, run `python3 -m http.server` in this
folder and open `http://localhost:8000`.

## Design

- **Palette:** deep navy (trust) with black and silver accents.
- **Light & dark themes:** auto-detects the visitor's OS preference, with a header
  ☀/☾ toggle that overrides and persists the choice. The 3D scene re-tunes for each
  theme (additive glow on dark, navy-on-light otherwise); both meet AA contrast.
- **Immersive 3D background:** a full-screen, living **network constellation** —
  hundreds of glowing nodes joined by distance-faded links, drifting organically
  with atmospheric depth fog, a far starfield and gold-free dust (Three.js /
  WebGL). It evokes networks & connectivity (a cybersecurity leader's world).
- **Scrollytelling:** the camera glides forward *through* the network as you
  scroll, with pointer parallax; a fixed chapter rail (01–04) acts as a scrollspy.
- **Photography:** the portrait of Pritesh anchors the hero; travel, lifestyle and
  car photos (carried over from the original site) fill the interest cards.
- **Page-load intro:** a loader (animated 0→100% counter + brand) that wipes up
  to reveal the site, then triggers the hero animation.
- **Kinetic typography:** the hero name rises line-by-line out of a mask, the rest
  of the hero fades/rises in sequence, and section headings rise out of a mask as
  they scroll into view.
- **Immersive interaction (Lusion-inspired):**
  - **Smooth momentum scrolling** — the page is eased/weighted for that buttery
    feel (fine pointers only; native scroll on touch and reduced-motion).
  - **Cursor-reactive constellation** — the network web parts and springs back
    around your pointer in real time.
  - **Custom cursor** — a precise ring that grows over interactive elements.
- **Premium touches:** animated flowing gradient on the name (`@property`),
  cursor-follow aurora glow, magnetic buttons, film-grain texture, scroll-progress
  bar, animated stat counters, 3D-tilt photo cards.

## Accessibility (ADA / WCAG 2.1 AA oriented)

- Semantic landmarks (`header`/`nav`/`main`/`section`/`footer`), skip link, and
  `aria-labelledby` on every section.
- **Motion control:** respects `prefers-reduced-motion` *and* offers an in-page
  "Motion" toggle (WCAG 2.2.2) that freezes all animation, the 3D loop, smooth
  scrolling and the custom cursor; the choice persists in `localStorage`.
- Smooth scrolling keeps keyboard focus on-screen (focused elements are scrolled
  into view) and intercepts in-page anchors so jump links still work.
- High-contrast text, visible `:focus-visible` outlines, keyboard-operable
  everywhere, decorative 3D canvas marked `aria-hidden`.
- Graceful degradation: if WebGL is unavailable, a styled navy gradient shows
  instead; content is never left hidden if scripts fail.
- `Person` structured data (JSON-LD), Open Graph tags, descriptive `alt`/labels.

## Files

```
index.html        — markup + content + metadata
css/styles.css    — all styling, design tokens, responsive + reduced-motion rules
js/main.js        — interactions + the Three.js 3D scene
js/vendor/three.min.js — vendored Three.js r149 (so file:// works offline)
assets/img/       — portrait + travel/lifestyle/car photos (from the old site)
```

## Editing content

All copy lives directly in `index.html`. Social links are in the **Connect**
section. Colors are CSS custom properties at the top of `css/styles.css`
(`--navy`, `--silver`, `--bg`, etc.) — change them in one place to re-theme.
