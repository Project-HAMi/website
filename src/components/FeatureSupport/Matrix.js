import React, { useEffect, useId, useLayoutEffect } from "react";
import clsx from "clsx";
import Link from "@docusaurus/Link";
import useDocusaurusContext from "@docusaurus/useDocusaurusContext";
import { COMPONENTS, FEATURES, GROUPS } from "@site/src/data/featureSupport";
import { Card, Glyph, TEXT, useHoverCard, useVersionedHref } from "./index";
import styles from "./styles.module.css";

const ORDER = ["hami", "dra", "volcano", "kai"];
const GAP = 8;
const EDGE = 12;

const MATRIX_TEXT = {
  feature: { en: "Feature", zh: "功能" },
  caption: {
    en: "NVIDIA GPU features supported by each setup",
    zh: "各方案支持的 NVIDIA GPU 功能",
  },
};

// The table scrolls sideways on narrow screens, which would clip an absolutely positioned card,
// so the card is fixed to the viewport and placed under its cell, or above it when there is
// no room below.
function placeCard(card, anchor) {
  const a = anchor.getBoundingClientRect();
  const width = card.offsetWidth;
  const height = card.offsetHeight;
  const vw = document.documentElement.clientWidth;
  const vh = document.documentElement.clientHeight;
  const left = Math.min(Math.max(a.left - 19, EDGE), vw - width - EDGE);
  const above = a.bottom + GAP + height > vh - EDGE && a.top - GAP - height >= EDGE;
  card.style.setProperty("--left", `${left}px`);
  card.style.setProperty("--top", `${above ? a.top - GAP - height : a.bottom + GAP}px`);
  card.classList.toggle(styles.cardAbove, above);
}

export default function FeatureMatrix() {
  const { i18n } = useDocusaurusContext();
  const t = (text) => (typeof text === "string" ? text : text[i18n.currentLocale] || text.en);
  const versioned = useVersionedHref();
  const baseId = `fm${useId().replace(/[^\w-]/g, "")}`;
  const { open, show, hideSoon, toggle, rootRef, cardRef } = useHoverCard();

  const anchorFor = (key) => rootRef.current?.querySelector(`[data-cell="${key}"]`);

  useLayoutEffect(() => {
    const anchor = open && anchorFor(open);
    if (cardRef.current && anchor) placeCard(cardRef.current, anchor);
  }, [open]);

  // Follow the cell while the page or the table scrolls.
  useEffect(() => {
    if (!open) return undefined;
    const update = () => {
      const anchor = anchorFor(open);
      if (cardRef.current && anchor) placeCard(cardRef.current, anchor);
    };
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [open]);

  return (
    <div ref={rootRef} className={styles.matrix}>
      <table className={styles.mxTable}>
        <caption className={styles.srOnly}>{t(MATRIX_TEXT.caption)}</caption>
        <thead>
          <tr>
            <th scope="col">{t(MATRIX_TEXT.feature)}</th>
            {ORDER.map((key) => (
              <th key={key} scope="col">
                {COMPONENTS[key].name}
              </th>
            ))}
          </tr>
        </thead>
        {GROUPS.map((group) => (
          <tbody key={group.title.en}>
            <tr className={styles.mxGroup}>
              <th scope="colgroup" colSpan={ORDER.length + 1}>
                {t(group.title)}
              </th>
            </tr>
            {group.features.map((featureKey) => {
              const feature = FEATURES[featureKey];
              return (
                <tr key={featureKey}>
                  <th scope="row" className={styles.mxFeature}>
                    {feature.page ? (
                      <Link to={versioned(`/docs/${feature.page}`)}>{t(feature.title)}</Link>
                    ) : (
                      t(feature.title)
                    )}
                  </th>
                  {ORDER.map((componentKey) => {
                    const key = `${featureKey}-${componentKey}`;
                    const cardId = `${baseId}-${key}`;
                    const isOpen = open === key;
                    const { status } = feature[componentKey];
                    return (
                      <td key={componentKey}>
                        <span
                          className={styles.anchor}
                          data-cell={key}
                          onMouseEnter={() => show(key)}
                          onMouseLeave={hideSoon}
                          onBlur={(event) => {
                            if (!event.currentTarget.contains(event.relatedTarget)) hideSoon();
                          }}
                        >
                          <button
                            type="button"
                            className={clsx(styles.tag, status === "no" && styles.tagOff)}
                            aria-expanded={isOpen}
                            aria-controls={isOpen ? cardId : undefined}
                            onFocus={() => show(key)}
                            onClick={() => toggle(key)}
                          >
                            <Glyph status={status} />
                            {t(TEXT.status[status])}
                          </button>
                          {isOpen && (
                            <Card
                              id={cardId}
                              componentKey={componentKey}
                              features={[featureKey]}
                              status={status}
                              t={t}
                              cardRef={cardRef}
                              className={styles.cardFixed}
                            />
                          )}
                        </span>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        ))}
      </table>
    </div>
  );
}
