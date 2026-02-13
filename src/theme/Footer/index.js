import React, { memo, useEffect, useState } from 'react';
import { useThemeConfig } from '@docusaurus/theme-common';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import FooterLinks from '@theme/Footer/Links';
import FooterLogo from '@theme/Footer/Logo';
import FooterCopyright from '@theme/Footer/Copyright';
import FooterLayout from '@theme/Footer/Layout';
import styles from './styles.module.css';

function WechatGroupModal({ isOpen, onClose }) {
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
          src="/img/community/wechat-assistant-qr.jpg"
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
  const footerLinks =
    adjustedLinks && adjustedLinks.length > 0 ? <FooterLinks links={adjustedLinks} /> : null;

  return (
    <>
      <FooterLayout
        style={style}
        links={footerLinks}
        logo={logo && <FooterLogo logo={logo} />}
        copyright={copyright && <FooterCopyright copyright={copyright} />}
      />
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
