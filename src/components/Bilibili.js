import React from "react";

export default function Bilibili({ bvid, page = 1, title }) {
  const src = `https://player.bilibili.com/player.html?bvid=${bvid}&page=${page}&high_quality=1&danmaku=0`;
  return (
    <div
      style={{
        position: "relative",
        paddingBottom: "56.25%",
        height: 0,
        overflow: "hidden",
        borderRadius: "12px",
      }}
    >
      <iframe
        src={src}
        title={title || "Bilibili video"}
        scrolling="no"
        border="0"
        frameBorder="no"
        framespacing="0"
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          border: 0,
        }}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
      />
    </div>
  );
}
