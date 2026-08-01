import React from "react";

export default function MDXImg(props) {
  const { alt = "", className = "" } = props;
  const trimmedAlt = alt.trim();

  const isLogo =
    className.includes("logo") ||
    className.includes("avatar") ||
    trimmedAlt.toLowerCase().includes("logo");

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
