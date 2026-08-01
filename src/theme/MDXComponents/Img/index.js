import React from "react";

export default function MDXImg(props) {
  const { alt = "", className = "" } = props;
  const trimmedAlt = alt.trim();

  const isLogoClass = /\b(logo|avatar)\b/i.test(className);
  const isLogoAlt = /\blogo\b/i.test(trimmedAlt);
  const isLogo = isLogoClass || isLogoAlt;

  if (!trimmedAlt || isLogo) {
    return <img {...props} />;
  }

  return (
    <figure className="hami-doc-figure">
      <img {...props} />
      <figcaption>{trimmedAlt}</figcaption>
    </figure>
  );
}
