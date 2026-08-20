import React from "react";
import useDocusaurusContext from "@docusaurus/useDocusaurusContext";
import Link from "@docusaurus/Link";
import styles from "./SupportedComponents.module.css";

const TYPE_CLASSES = {
  hami: styles.tagHami,
  volcano: styles.tagVolcano,
  "hami-dra": styles.tagHamiDra,
  cdi: styles.tagCdi,
};

export function Tag({ href, type, children }) {
  const className = `${styles.tag} ${TYPE_CLASSES[type] || styles.tagDefault}`;
  if (href) {
    return (
      <Link to={href} className={className}>
        {children}
      </Link>
    );
  }
  return <span className={className}>{children}</span>;
}

export default function SupportedComponents({ children }) {
  const { i18n } = useDocusaurusContext();
  const label = i18n.currentLocale === "zh" ? "支持组件/模式：" : "Supported Components:";

  return (
    <div className={styles.container}>
      <strong className={styles.label}>{label}</strong>
      <div className={styles.tags}>{children}</div>
    </div>
  );
}
