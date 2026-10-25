# HAMi Brand Guide

Visual rules for diagrams, slides and graphics that feature HAMi. Values come from the website tokens in [`src/css/custom.css`](src/css/custom.css) and the official [CNCF artwork](https://github.com/cncf/artwork/tree/main/projects/hami).

## Colors

| Token                 | Hex       | Use                                         |
| --------------------- | --------- | ------------------------------------------- |
| Primary               | `#10d05d` | Brand green: accents, key fills and strokes |
| Primary light / hover | `#35e37b` | Hover, lighter accent                       |
| Primary dark          | `#0ebd54` | Pressed, depth                              |
| Primary darkest       | `#08883b` | Deep green                                  |
| Link                  | `#0a8f3d` | Green text on light backgrounds             |
| Secondary             | `#39c6f4` | Metrics, observability, info                |
| Tertiary              | `#7c8cff` | Scheduling, policy                          |
| Success               | `#3ddc97` | Positive state                              |
| Warning               | `#f5b942` | Attention                                   |
| Danger                | `#ff5c7a` | Errors                                      |
| Text                  | `#15202b` | Body text                                   |
| Heading               | `#0f1722` | Headings                                    |
| Muted                 | `#4f6378` | Secondary text, labels                      |
| Background            | `#f5f8fb` | Canvas                                      |
| Surface               | `#ffffff` | Cards, nodes, panels                        |
| Border                | `#d5dee8` | Borders, dividers                           |

Dark mode: `#0b0f14` (background), `#171e27` (surface), `#263241` (surface 3), `#f5f7fa` (text), `#2a3442` (border). The accent colors stay the same, and links use `#35e37b`.

`#10d05d` fails text contrast on white. Use it for fills and strokes, and `#0a8f3d` for green text.

Suggested diagram mapping: green for HAMi components, blue for observability, indigo for scheduling, neutrals for everything else.

## Fonts

The font stacks are declared in `custom.css` as `--hami-font-display`, `--hami-font-body` and `--hami-font-mono`. The site does not bundle or load the named web fonts, so in practice browsers render the fallbacks. Reference the same stacks in SVGs and graphics.

| Role            | Font          | Fallback                              |
| --------------- | ------------- | ------------------------------------- |
| Headings        | Space Grotesk | "Avenir Next", "Segoe UI", sans-serif |
| Body and labels | Source Sans 3 | "Noto Sans", "Segoe UI", sans-serif   |
| Code, YAML, CLI | IBM Plex Mono | "SFMono-Regular", Consolas, monospace |

## Logo

- Use the official SVGs from the [CNCF artwork repo](https://github.com/cncf/artwork/tree/main/projects/hami) (copies live in `static/img/`, e.g. `hami-graph-color.svg`). Never redraw the melon or retype the "HAMi" wordmark.
- The official color logo is filled `#0FD05D`, which matches the website primary `#10d05d` closely. Do not recolor the logo.
- There is no full-color wordmark lockup. Use the color icon alone, or a black or white lockup.
- Black or color variant on light backgrounds, white variant on dark ones.
- Keep the aspect ratio. No gradients, shadows, strokes or skewing.
- Minimum size: icon 24px tall, horizontal lockup 100px wide, stacked lockup 64px wide.

HAMi and the HAMi logo are trademarks of The Linux Foundation. See the [trademark usage guidelines](https://www.linuxfoundation.org/legal/trademark-usage).

## Diagrams

Mermaid is the preferred format, so visuals stay easy to update. The site themes it through `custom.css`: add `class NodeA accent` (or `info`, `run`, `ok`, `bad`) and the node picks up the light or dark colors automatically.

| Class    | Light fill / stroke   | Dark fill / stroke    | Meaning     |
| -------- | --------------------- | --------------------- | ----------- |
| `accent` | `#d9f99d` / `#4f7d00` | `#365314` / `#a3e635` | HAMi        |
| `info`   | `#dbeafe` / `#1a5fb4` | `#1e3a5f` / `#60a5fa` | Information |
| `run`    | `#fef3c7` / `#b45309` | `#78350f` / `#fbbf24` | Running     |
| `ok`     | `#dcfce7` / `#0b6b3c` | `#14532d` / `#4ade80` | Success     |
| `bad`    | `#fee2e2` / `#b3261e` | `#7f1d1d` / `#f87171` | Error       |

Add a caption with `%% title: <text>` as the first line inside the mermaid fence.

For hand-written SVG:

- Use the colors above, the same font stacks, and the diagram panel tokens in `custom.css` (`--hami-diagram-*`): heading `#15324d`, body `#1a3956`, muted `#5a748f`, connectors `#39c6f4` at low opacity.
- Keep the palette consistent in light and dark mode. The site defaults to dark.
- No animated or decorative generated imagery.
