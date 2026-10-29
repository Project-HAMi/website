import React, { memo, useEffect, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faDiscord,
  faGithub,
  faLinkedin,
  faSlack,
  faWeixin,
  faXTwitter,
  faYoutube,
} from "@fortawesome/free-brands-svg-icons";
import {
  faBullhorn,
  faClipboardList,
  faGraduationCap,
  faLightbulb,
  faMicrochip,
  faRocket,
  faUsers,
} from "@fortawesome/free-solid-svg-icons";
import XiaohongshuIcon from "./XiaohongshuIcon";
import { useColorMode, useThemeConfig } from "@docusaurus/theme-common";
import useDocusaurusContext from "@docusaurus/useDocusaurusContext";
import FooterLinks from "@theme/Footer/Links";
import FooterLogo from "@theme/Footer/Logo";
import FooterCopyright from "@theme/Footer/Copyright";
import FooterLayout from "@theme/Footer/Layout";
import useBaseUrl from "@docusaurus/useBaseUrl";
import styles from "./styles.module.css";

function WechatModal({ isOpen, onClose, qrSrc, titleId, title, alt, description }) {
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
        aria-labelledby={titleId}
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
        <h3 id={titleId} className={styles.modalTitle}>
          {title}
        </h3>
        <img className={styles.qrImage} src={qrSrc} alt={alt} />
        <p className={styles.modalDescription}>{description}</p>
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
  const cncfLogoLight = useBaseUrl("img/cncf-color.svg");
  const cncfLogoDark = useBaseUrl("img/cncf-white.svg");
  const wechatGroupQr = useBaseUrl("img/community/wechat-assistant-qr.jpg");
  const wechatOfficialQr = useBaseUrl("img/community/wechat-official-account-qr.jpg");
  const cncfLogo = colorMode === "dark" ? cncfLogoDark : cncfLogoLight;
  const isZh = i18n.currentLocale === "zh";

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

  if (!footer) {
    return null;
  }

  const { copyright, links, logo, style } = footer;
  const zhOnlyLabels = new Set(["WeChat Group", "WeChat Official Account", "Xiaohongshu"]);
  // English-only footer links (the zh audience gets Bilibili instead of YouTube).
  const enOnlyLabels = new Set(["YouTube"]);
  const adjustedLinks = links?.map((group) => ({
    ...group,
    items: group.items?.filter(
      (item) =>
        (i18n.currentLocale === "zh" || !zhOnlyLabels.has(item.label)) &&
        (i18n.currentLocale !== "zh" || !enOnlyLabels.has(item.label)),
    ),
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
    "Community Survey": faClipboardList,
    社区问卷: faClipboardList,
    "Supported Devices": faMicrochip,
    支持设备列表: faMicrochip,
    YouTube: faYoutube,
  };
  // FontAwesome free has no Xiaohongshu glyph; use the brand mark directly.
  const xhsLabels = new Set(["Xiaohongshu", "小红书"]);
  // The survey form is region-specific: Feishu for zh, Google Forms for everyone else.
  const SURVEY_URL_EN = "https://forms.gle/CTXZmG1WUgE9vPBm8";
  const SURVEY_URL_ZH = "https://dynamia-ai.feishu.cn/share/base/form/shrcnI1cfFqgx3jWQ76U3HUhwhQ";
  const iconizedLinks = adjustedLinks?.map((group) => ({
    ...group,
    items: group.items?.map((rawItem) => {
      const item =
        isZh && rawItem.href === SURVEY_URL_EN ? { ...rawItem, href: SURVEY_URL_ZH } : rawItem;
      const icon = iconMap[item.label];
      const itemIcon = xhsLabels.has(item.label) ? (
        <XiaohongshuIcon className={styles.footerItemIcon} />
      ) : icon ? (
        <FontAwesomeIcon icon={icon} className={styles.footerItemIcon} />
      ) : null;
      if (!itemIcon) {
        return item;
      }
      return {
        ...item,
        label: (
          <span className={styles.footerItemLabel}>
            {itemIcon}
            <span>{item.label}</span>
          </span>
        ),
      };
    }),
  }));
  const footerLinks =
    iconizedLinks && iconizedLinks.length > 0 ? <FooterLinks links={iconizedLinks} /> : null;

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
      {isZh && (
        <WechatModal
          isOpen={isWechatModalOpen}
          onClose={() => setIsWechatModalOpen(false)}
          qrSrc={wechatGroupQr}
          titleId="wechat-group-modal-title"
          title="添加微信小助手，加入 HAMi 微信群"
          alt="HAMi 微信小助手二维码"
          description="扫码添加小助手后，会邀请你进入 HAMi 微信群。"
        />
      )}
      {isZh && (
        <WechatModal
          isOpen={isWechatOfficialOpen}
          onClose={() => setIsWechatOfficialOpen(false)}
          qrSrc={wechatOfficialQr}
          titleId="wechat-official-modal-title"
          title="关注 HAMi 微信公众号"
          alt="HAMi 微信公众号二维码"
          description="扫码关注 HAMi 公众号，获取社区动态。"
        />
      )}
    </>
  );
}

export default memo(Footer);
