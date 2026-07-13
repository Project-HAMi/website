import React, { memo, useEffect, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faDiscord,
  faGithub,
  faLinkedin,
  faSlack,
  faWeixin,
  faXTwitter,
} from "@fortawesome/free-brands-svg-icons";
import {
  faBullhorn,
  faGraduationCap,
  faLightbulb,
  faRocket,
  faUsers,
} from "@fortawesome/free-solid-svg-icons";
import { useColorMode, useThemeConfig } from "@docusaurus/theme-common";
import useDocusaurusContext from "@docusaurus/useDocusaurusContext";
import FooterLinks from "@theme/Footer/Links";
import FooterLogo from "@theme/Footer/Logo";
import FooterCopyright from "@theme/Footer/Copyright";
import FooterLayout from "@theme/Footer/Layout";
import useBaseUrl from "@docusaurus/useBaseUrl";
import styles from "./styles.module.css";

function WechatGroupModal({ isOpen, onClose }) {
  const wechatQr = useBaseUrl("img/community/wechat-assistant-qr.jpg");

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  return (
    <div className={styles.modalBackdrop} onClick={onClose} role="presentation">
      <div
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="wechat-group-modal-title"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          className={styles.closeButton}
          aria-label="关闭弹窗"
          onClick={onClose}
        >
          ×
        </button>
        <h3 id="wechat-group-modal-title" className={styles.modalTitle}>
          添加微信小助手，加入 HAMi 微信群
        </h3>
        <img className={styles.qrImage} src={wechatQr} alt="HAMi 微信小助手二维码" />
        <p className={styles.modalDescription}>扫码添加小助手后，会邀请你进入 HAMi 微信群。</p>
      </div>
    </div>
  );
}

function WechatOfficialModal({ isOpen, onClose }) {
  const wechatQr = useBaseUrl("img/community/wechat-official-account-qr.jpg");

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  return (
    <div className={styles.modalBackdrop} onClick={onClose} role="presentation">
      <div
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="wechat-official-modal-title"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          className={styles.closeButton}
          aria-label="关闭弹窗"
          onClick={onClose}
        >
          ×
        </button>
        <h3 id="wechat-official-modal-title" className={styles.modalTitle}>
          关注 HAMi 微信公众号
        </h3>
        <img className={styles.qrImage} src={wechatQr} alt="HAMi 微信公众号二维码" />
        <p className={styles.modalDescription}>扫码关注 HAMi 公众号，获取社区动态。</p>
      </div>
    </div>
  );
}

function Footer() {
  const { footer } = useThemeConfig();
  const { colorMode } = useColorMode();
  const { i18n } = useDocusaurusContext();
  const [isWechatModalOpen, setIsWechatModalOpen] = useState(false);
  const [isWechatOfficialOpen, setIsWechatOfficialOpen] = useState(false);

  if (!footer) {
    return null;
  }

  const { copyright, links, logo, style } = footer;

  useEffect(() => {
    if (i18n.currentLocale !== "zh") {
      return undefined;
    }

    const onFooterLinkClick = (event) => {
      const anchor = event.target.closest("a");
      if (!anchor || !anchor.closest("footer")) {
        return;
      }

      const href = anchor.getAttribute("href") || "";
      if (href.includes("/community?wechat=group")) {
        event.preventDefault();
        event.stopPropagation();
        setIsWechatModalOpen(true);
      } else if (href.includes("/community?wechat=official")) {
        event.preventDefault();
        event.stopPropagation();
        setIsWechatOfficialOpen(true);
      }
    };

    // Use capture phase so we cancel navigation before router link handlers run.
    document.addEventListener("click", onFooterLinkClick, true);
    return () => document.removeEventListener("click", onFooterLinkClick, true);
  }, [i18n.currentLocale]);

  const zhOnlyLabels = new Set(["WeChat Group", "WeChat Official Account"]);
  const adjustedLinks =
    i18n.currentLocale === "zh"
      ? links
      : links?.map((group) => ({
          ...group,
          items: group.items?.filter((item) => !zhOnlyLabels.has(item.label)),
        }));
  const iconMap = {
    Concepts: faLightbulb,
    原理: faLightbulb,
    "Quick Start": faRocket,
    快速开始: faRocket,
    Tutorials: faGraduationCap,
    教程: faGraduationCap,
    "Slack (#hami-dev)": faSlack,
    Discord: faDiscord,
    GitHub: faGithub,
    LinkedIn: faLinkedin,
    X: faXTwitter,
    Adoption: faUsers,
    Releases: faBullhorn,
    发布记录: faBullhorn,
    "WeChat Group": faWeixin,
    微信入群: faWeixin,
    "WeChat Official Account": faWeixin,
    公众号: faWeixin,
  };
  const iconizedLinks = adjustedLinks?.map((group) => ({
    ...group,
    items: group.items?.map((item) => {
      const icon = iconMap[item.label];
      if (!icon) {
        return item;
      }
      return {
        ...item,
        label: (
          <span className={styles.footerItemLabel}>
            <FontAwesomeIcon icon={icon} className={styles.footerItemIcon} />
            <span>{item.label}</span>
          </span>
        ),
      };
    }),
  }));
  const footerLinks =
    iconizedLinks && iconizedLinks.length > 0 ? <FooterLinks links={iconizedLinks} /> : null;
  const isZh = i18n.currentLocale === "zh";
  const cncfLogoLight = useBaseUrl("img/cncf-color.svg");
  const cncfLogoDark = useBaseUrl("img/cncf-white.svg");
  const cncfLogo = colorMode === "dark" ? cncfLogoDark : cncfLogoLight;

  return (
    <>
      <FooterLayout
        style={style}
        links={footerLinks}
        logo={logo && <FooterLogo logo={logo} />}
        copyright={copyright && <FooterCopyright copyright={copyright} />}
      />
      <div className={styles.cncfBar}>
        <a
          className={styles.cncfLink}
          href="https://landscape.cncf.io/?group=projects-and-products&project=incubating&item=orchestration-management--scheduling-orchestration--hami"
          target="_blank"
          rel="noreferrer"
        >
          <img className={styles.cncfLogo} src={cncfLogo} alt="CNCF" />
          <span>{isZh ? "HAMi 是 CNCF 孵化项目" : "HAMi is a CNCF Incubating project"}</span>
        </a>
      </div>
      {i18n.currentLocale === "zh" && (
        <WechatGroupModal isOpen={isWechatModalOpen} onClose={() => setIsWechatModalOpen(false)} />
      )}
      {i18n.currentLocale === "zh" && (
        <WechatOfficialModal
          isOpen={isWechatOfficialOpen}
          onClose={() => setIsWechatOfficialOpen(false)}
        />
      )}
    </>
  );
}

export default memo(Footer);
