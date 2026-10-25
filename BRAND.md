# HAMi Brand Guide

Visual rules for diagrams, slides and graphics that feature HAMi. Values come from the website tokens in [`src/css/custom.css`](src/css/custom.css) and the official [CNCF artwork](https://github.com/cncf/artwork/tree/main/projects/hami).

## Colors

| Token | Hex | Use |
|---|---|---|
| Primary | `#76b900` | Brand green: accents, key fills and strokes |
| Primary light / hover | `#8ed400` | Hover, lighter accent |
| Primary dark | `#69a400` | Pressed, depth |
| Link | `#4f8500` | Green text on light backgrounds |
| Secondary | `#39c6f4` | Metrics, observability, info |
| Tertiary | `#7c8cff` | Scheduling, policy |
| Success | `#3ddc97` | Positive state |
| Warning | `#f5b942` | Attention |
| Text | `#15202b` | Body text |
| Heading | `#0f1722` | Headings |
| Muted | `#4f6378` | Secondary text, labels |
| Background | `#f5f8fb` | Canvas |
| Surface | `#ffffff` | Cards, nodes, panels |
| Border | `#d5dee8` | Borders, dividers |

Dark mode surfaces: `#0b0f14` (background), `#171e27` (surface), `#263241` (surface 3), `#f5f7fa` (text).

`#76b900` fails text contrast on white. Use it for fills and strokes, and `#4f8500` for green text.

Suggested diagram mapping: green for HAMi components, blue for observability, indigo for scheduling, neutrals for everything else.

## Fonts

| Role | Font | Fallback |
|---|---|---|
| Headings | Space Grotesk | "Avenir Next", "Segoe UI", sans-serif |
| Body and labels | Source Sans 3 | "Noto Sans", "Segoe UI", sans-serif |
| Code, YAML, CLI | IBM Plex Mono | "SFMono-Regular", Consolas, monospace |

## Logo

- Use the official SVGs from the [CNCF artwork repo](https://github.com/cncf/artwork/tree/main/projects/hami). Never redraw the melon or retype the "HAMi" wordmark.
- The official color logo is filled `#0FD05D`, which differs from the website green `#76b900`. Do not recolor the logo; use `#76b900` for the surrounding design.
- There is no full-color wordmark lockup. Use the color icon alone, or a black or white lockup.
- Black or color variant on light backgrounds, white variant on dark ones.
- Keep the aspect ratio. No gradients, shadows, strokes or skewing.
- Minimum size: icon 24px tall, horizontal lockup 100px wide, stacked lockup 64px wide.

HAMi and the HAMi logo are trademarks of The Linux Foundation. See the [trademark usage guidelines](https://www.linuxfoundation.org/legal/trademark-usage).

## Diagrams

- Prefer text-based sources (Mermaid, or hand-written SVG using the colors above) so visuals stay easy to update.
- Use the same palette and font stack across all diagrams, in light and dark mode.
- No animated or decorative generated imagery.
