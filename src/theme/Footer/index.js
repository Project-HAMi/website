import React, { memo, useEffect, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faDiscord, faGithub, faSlack, faWeixin } from '@fortawesome/free-brands-svg-icons';
import { faBullhorn, faDownload, faRocket, faUsers } from '@fortawesome/free-solid-svg-icons';
import { useColorMode, useThemeConfig } from '@docusaurus/theme-common';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import FooterLinks from '@theme/Footer/Links';
import FooterLogo from '@theme/Footer/Logo';
import FooterCopyright from '@theme/Footer/Copyright';
import FooterLayout from '@theme/Footer/Layout';
import useBaseUrl from '@docusaurus/useBaseUrl';
import styles from './styles.module.css';

function WechatGroupModal({ isOpen, onClose }) {
  const wechatQr = useBaseUrl('img/community/wechat-assistant-qr.jpg');

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', onKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className={styles.modalBackdrop}
      onClick={onClose}
      role="presentation">
      <div
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="wechat-group-modal-title"
        onClick={(event) => event.stopPropagation()}>
        <button
          type="button"
          className={styles.closeButton}
          aria-label="关闭弹窗"
          onClick={onClose}>
          ×
        </button>
        <h3 id="wechat-group-modal-title" className={styles.modalTitle}>
          添加微信小助手，加入 HAMi 微信群
        </h3>
        <img
          className={styles.qrImage}
          src={wechatQr}
          alt="HAMi 微信小助手二维码"
        />
        <p className={styles.modalDescription}>
          扫码添加小助手后，会邀请你进入 HAMi 微信群。
        </p>
      </div>
    </div>
  );
}

function Footer() {
  const { footer } = useThemeConfig();
  const { colorMode } = useColorMode();
  const { i18n } = useDocusaurusContext();
  const [isWechatModalOpen, setIsWechatModalOpen] = useState(false);

  if (!footer) {
    return null;
  }

  const { copyright, links, logo, style } = footer;

  useEffect(() => {
    if (i18n.currentLocale !== 'zh') {
      return undefined;
    }

    const onFooterLinkClick = (event) => {
      const anchor = event.target.closest('a');
      if (!anchor || !anchor.closest('footer')) {
        return;
      }

      const href = anchor.getAttribute('href') || '';
      if (href.includes('/community?wechat=group')) {
        event.preventDefault();
        event.stopPropagation();
        setIsWechatModalOpen(true);
      }
    };

    // Use capture phase so we cancel navigation before router link handlers run.
    document.addEventListener('click', onFooterLinkClick, true);
    return () => document.removeEventListener('click', onFooterLinkClick, true);
  }, [i18n.currentLocale]);

  const adjustedLinks =
    i18n.currentLocale === 'zh'
      ? links
      : links?.map((group) => ({
          ...group,
          items: group.items?.filter((item) => item.label !== 'WeChat Group'),
        }));
  const iconMap = {
    Install: faDownload,
    安装: faDownload,
    'Quick Start': faRocket,
    快速开始: faRocket,
    'Slack ': faSlack,
    Discord: faDiscord,
    GitHub: faGithub,
    Adoption: faUsers,
    Releases: faBullhorn,
    发布记录: faBullhorn,
    'WeChat Group': faWeixin,
    微信入群: faWeixin,
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
  const isZh = i18n.currentLocale === 'zh';
  const cncfLogoLight = useBaseUrl('img/cncf-color.svg');
  const cncfLogoDark = useBaseUrl('img/cncf-white.svg');
  const cncfLogo = colorMode === 'dark' ? cncfLogoDark : cncfLogoLight;

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
          href="https://www.cncf.io/sandbox-projects/"
          target="_blank"
          rel="noreferrer">
          <img className={styles.cncfLogo} src={cncfLogo} alt="CNCF" />
          <span>{isZh ? 'HAMi 是 CNCF Sandbox 项目' : 'HAMi is a CNCF Sandbox project'}</span>
        </a>
      </div>
      {i18n.currentLocale === 'zh' && (
        <WechatGroupModal
          isOpen={isWechatModalOpen}
          onClose={() => setIsWechatModalOpen(false)}
        />
      )}
    </>
  );
}

export default memo(Footer);
