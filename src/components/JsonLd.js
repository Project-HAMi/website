import React from "react";
import Head from "@docusaurus/Head";
import { serializeJsonLd } from "../utils/jsonLd";

export default function JsonLd({ data }) {
  if (!data) {
    return null;
  }

  return (
    <Head>
      <script type="application/ld+json">
        {typeof data === "string" ? data : serializeJsonLd(data)}
      </script>
    </Head>
  );
}
