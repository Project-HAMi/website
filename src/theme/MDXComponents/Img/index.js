import React from "react";

export default function MDXImg(props) {
  const { alt = "", className = "" } = props;
  const trimmedAlt = alt.trim();

  const classTokens = className.split(/\s+/).filter(Boolean);
  const isLogo =
    classTokens.some(
      (token) => token.toLowerCase() === "logo" || token.toLowerCase() === "avatar",
    ) || /\blogo\b/i.test(trimmedAlt);

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
