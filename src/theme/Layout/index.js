import React from "react";
import Layout from "@theme-original/Layout";
import ImageLightbox from "../Lightbox";

export default function LayoutWrapper(props) {
  return (
    <>
      <Layout {...props} />
      <ImageLightbox />
    </>
  );
}
