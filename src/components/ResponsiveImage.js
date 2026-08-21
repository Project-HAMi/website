import React from "react";
import useBaseUrl from "@docusaurus/useBaseUrl";
import responsiveImages from "../data/responsive-images.json";

function getVariantPath(src, width, extension) {
  const sourceExtension = src.slice(src.lastIndexOf("."));
  const sourcePath = src.startsWith("/img/") ? src.slice("/img/".length) : src.replace(/^\//, "");
  const basePath = sourcePath.slice(0, -sourceExtension.length);

  return `/img/responsive/${basePath}-${width}.${extension}`;
}

export default function ResponsiveImage({
  src,
  alt,
  sizes,
  loading = "lazy",
  className,
  ...props
}) {
  const baseUrl = useBaseUrl("/");
  const prefix = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
  const withBaseUrl = (path) => (path.startsWith("/") ? `${prefix}${path}` : path);
  const image = responsiveImages[src];
  const sourceUrl = withBaseUrl(src);

  if (!image) {
    return (
      <img
        src={sourceUrl}
        alt={alt}
        loading={loading}
        decoding="async"
        className={className}
        {...props}
      />
    );
  }

  const extension = src.slice(src.lastIndexOf(".") + 1).toLowerCase();
  const fallbackSrcSet = image.widths
    .map((width) => {
      const candidate =
        width === image.width ? sourceUrl : withBaseUrl(getVariantPath(src, width, extension));
      return `${candidate} ${width}w`;
    })
    .join(", ");
  const webpSrcSet = image.widths
    .map((width) => `${withBaseUrl(getVariantPath(src, width, "webp"))} ${width}w`)
    .join(", ");

  return (
    <picture>
      <source type="image/webp" srcSet={webpSrcSet} sizes={sizes} />
      <img
        src={withBaseUrl(getVariantPath(src, image.widths[0], extension))}
        srcSet={fallbackSrcSet}
        sizes={sizes}
        width={image.width}
        height={image.height}
        alt={alt}
        loading={loading}
        decoding="async"
        data-lightbox-src={sourceUrl}
        className={className}
        {...props}
      />
    </picture>
  );
}
