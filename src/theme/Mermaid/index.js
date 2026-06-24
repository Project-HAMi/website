/**
 * Wrapper around the theme-mermaid component.
 * Diagrams may carry a `%% title: ...` comment as their first line (a
 * convention from the HAMi workshop); mermaid treats it as a comment, so we
 * extract it here and render it as a proper figure caption. The caption is
 * also picked up by the lightbox when the diagram is zoomed.
 */
import React from "react";
import OriginalMermaid from "@theme-original/Mermaid";

const TITLE_PATTERN = /^\s*%%\s*title:\s*(.+)$/m;

export default function Mermaid(props) {
  const match = typeof props.value === "string" ? props.value.match(TITLE_PATTERN) : null;
  const title = match ? match[1].trim() : null;

  if (!title) {
    return <OriginalMermaid {...props} />;
  }

  return (
    <figure className="mermaid-figure">
      <OriginalMermaid {...props} />
      <figcaption>{title}</figcaption>
    </figure>
  );
}
