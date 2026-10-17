import React, { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import clsx from "clsx";
import Link from "@docusaurus/Link";
import useDocusaurusContext from "@docusaurus/useDocusaurusContext";
import { COMPONENTS, FEATURES } from "@site/src/data/featureSupport";
import styles from "./styles.module.css";

const ORDER = ["hami", "dra", "volcano", "kai"];

const TEXT = {
  label: { en: "Works with", zh: "支持情况" },
  guide: { en: "Guide", zh: "使用指南" },
  unsupported: { en: "Not available in this setup.", zh: "该模式下不支持此特性。" },
  status: {
    yes: { en: "Supported", zh: "支持" },
    partial: { en: "With limits", zh: "有限制" },
    mixed: { en: "Partly supported", zh: "部分支持" },
    no: { en: "Not supported", zh: "不支持" },
  },
};

function Glyph({ status }) {
  if (status === "yes") {
    return (
      <svg className={clsx(styles.glyph, styles.yes)} viewBox="0 0 12 12" aria-hidden="true">
        <circle cx="6" cy="6" r="6" fill="currentColor" />
        <path className={styles.check} d="M3.4 6.2l1.7 1.7 3.5-3.6" />
      </svg>
    );
  }
  if (status === "no") {
    return (
      <svg className={clsx(styles.glyph, styles.no)} viewBox="0 0 12 12" aria-hidden="true">
        <circle cx="6" cy="6" r="5.25" fill="none" stroke="currentColor" strokeWidth="1.5" />
        <path d="M3.2 6h5.6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    );
  }
  return (
    <svg className={clsx(styles.glyph, styles.partial)} viewBox="0 0 12 12" aria-hidden="true">
      <circle cx="6" cy="6" r="5.25" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path d="M6 .75a5.25 5.25 0 0 1 0 10.5z" fill="currentColor" />
    </svg>
  );
}

// Lucide arrow-up-right / arrow-right.
function Arrow({ external }) {
  return (
    <svg
      className={clsx(styles.arrow, external && styles.out)}
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      {external ? <path d="M7 7h10v10M7 17 17 7" /> : <path d="M5 12h14m-7-7 7 7-7 7" />}
    </svg>
  );
}

// One status for the tag: the feature's own status, or "mixed" when a page's features differ.
function summarize(statuses) {
  return statuses.every((s) => s === statuses[0]) ? statuses[0] : "mixed";
}

// Turns a cell's use into lines: identifiers (optionally labelled with their role) or prose.
function entries(use, t) {
  if (!use) return [];
  if (typeof use === "string") return use.split(", ").map((text) => ({ text, code: true }));
  if (Array.isArray(use)) {
    return use.map((item) => ({ label: t(item.label), text: item.code, code: true }));
  }
  return [{ text: t(use), code: false }];
}

// One identifier or phrase per line. A status glyph, when shown, sits inline on the first line
// so vertical-align centres it on the text rather than on the box.
function Value({ lines, status, mark, t }) {
  const shown = lines.length ? lines : [{ text: t(TEXT.status.no), code: false, off: true }];
  return (
    <span className={clsx(styles.value, mark && styles.marked)}>
      {shown.map((line, index) => (
        <span
          key={line.text}
          className={clsx(styles.line, line.code && styles.code, line.off && styles.off)}
        >
          {mark && index === 0 && <Glyph status={status} />}
          {line.code ? <code>{line.text}</code> : line.text}
        </span>
      ))}
    </span>
  );
}

function Card({ id, componentKey, features, status, t, cardRef }) {
  const component = COMPONENTS[componentKey];
  const cells = features.map((key) => FEATURES[key][componentKey]);
  const notes = cells.map((cell) => (cell.note ? t(cell.note) : ""));
  const sharedNote = notes.every((note) => note === notes[0]) ? notes[0] : "";

  // Rows of the key/value list: one per labelled identifier on a single-feature page,
  // otherwise one per feature keyed by its short name.
  let rows;
  if (features.length === 1) {
    const lines = entries(cells[0].use, t);
    rows = lines.some((line) => line.label)
      ? lines.map((line) => ({ key: line.label, lines: [line], cell: cells[0] }))
      : lines.length
        ? [{ key: t(FEATURES[features[0]].short), lines, cell: cells[0] }]
        : [];
  } else {
    rows = features.map((key, index) => ({
      key: t(FEATURES[key].short),
      lines: entries(cells[index].use, t),
      cell: cells[index],
      note: sharedNote ? "" : notes[index],
    }));
  }
  const fallback = features.length === 1 && !rows.length && !notes[0];
  // Each feature's own guide, once per destination.
  const guides = cells
    .filter((cell) => cell.guide)
    .map((cell) => ({ href: t(cell.guide.href), label: t(cell.guide.label || TEXT.guide) }))
    .filter((guide, index, all) => all.findIndex((other) => other.href === guide.href) === index);

  return (
    <div id={id} ref={cardRef} className={styles.card} role="group" aria-label={t(component.full)}>
      <div className={styles.head}>
        <span className={styles.name}>{t(component.full)}</span>
        <span className={clsx(styles.status, styles[status])}>
          <Glyph status={status} />
          {t(TEXT.status[status])}
        </span>
      </div>
      {rows.length > 0 && (
        <dl className={styles.list}>
          {rows.map((row) => (
            <React.Fragment key={row.key + row.lines.map((line) => line.text).join()}>
              <dt>{row.key}</dt>
              <dd>
                <Value lines={row.lines} status={row.cell.status} mark={status === "mixed"} t={t} />
                {row.note && <span className={styles.note}>{row.note}</span>}
              </dd>
            </React.Fragment>
          ))}
        </dl>
      )}
      {features.length === 1 && notes[0] && <p className={styles.note}>{notes[0]}</p>}
      {features.length > 1 && sharedNote && <p className={styles.note}>{sharedNote}</p>}
      {fallback && <p className={styles.note}>{t(TEXT.unsupported)}</p>}
      {guides.length > 0 && (
        <div className={styles.foot}>
          {guides.map(({ href, label }) => {
            const external = href.startsWith("http");
            return (
              <Link key={href} className={styles.go} {...(external ? { href } : { to: href })}>
                {label}
                <Arrow external={external} />
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function FeatureSupport({ features }) {
  const { i18n } = useDocusaurusContext();
  const t = (text) => (typeof text === "string" ? text : text[i18n.currentLocale] || text.en);
  const keys = Array.isArray(features) ? features : [features];
  const baseId = `fs${useId().replace(/[^\w-]/g, "")}`;
  const [open, setOpen] = useState(null);
  const [pinned, setPinned] = useState(false);
  const rootRef = useRef(null);
  const cardRef = useRef(null);
  const closeTimer = useRef(0);

  const show = (key) => {
    clearTimeout(closeTimer.current);
    if (key !== open) setPinned(false);
    setOpen(key);
  };
  const hideSoon = () => {
    if (pinned) return;
    clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setOpen(null), 140);
  };

  // Close on outside click or Escape.
  useEffect(() => {
    if (!open) return undefined;
    const onDown = (event) => {
      if (!rootRef.current?.contains(event.target)) {
        setOpen(null);
        setPinned(false);
      }
    };
    const onKey = (event) => {
      if (event.key === "Escape") {
        setOpen(null);
        setPinned(false);
      }
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // Keep the card inside the viewport.
  useLayoutEffect(() => {
    const card = cardRef.current;
    if (!card) return;
    card.style.setProperty("--shift", "0px");
    const rect = card.getBoundingClientRect();
    const right = rect.right - (document.documentElement.clientWidth - 12);
    const left = 12 - rect.left;
    if (right > 0) card.style.setProperty("--shift", `${-right}px`);
    else if (left > 0) card.style.setProperty("--shift", `${left}px`);
  }, [open]);

  useEffect(() => () => clearTimeout(closeTimer.current), []);

  return (
    <div ref={rootRef} className={styles.root}>
      <span className={styles.label}>{t(TEXT.label)}</span>
      {ORDER.map((componentKey) => {
        const status = summarize(keys.map((key) => FEATURES[key][componentKey].status));
        const cardId = `${baseId}-${componentKey}`;
        const isOpen = open === componentKey;
        return (
          <span
            key={componentKey}
            className={styles.anchor}
            onMouseEnter={() => show(componentKey)}
            onMouseLeave={hideSoon}
            onBlur={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget)) hideSoon();
            }}
          >
            <button
              type="button"
              className={clsx(styles.tag, status === "no" && styles.tagOff)}
              aria-expanded={isOpen}
              aria-controls={cardId}
              onFocus={() => show(componentKey)}
              onClick={() => {
                if (isOpen && pinned) {
                  setOpen(null);
                  setPinned(false);
                } else {
                  show(componentKey);
                  setPinned(true);
                }
              }}
            >
              <Glyph status={status} />
              {COMPONENTS[componentKey].name}
              <span className={styles.srOnly}> {t(TEXT.status[status])}</span>
            </button>
            {isOpen && (
              <Card
                id={cardId}
                componentKey={componentKey}
                features={keys}
                status={status}
                t={t}
                cardRef={cardRef}
              />
            )}
          </span>
        );
      })}
    </div>
  );
}
