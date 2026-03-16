import React, {useEffect, useState} from 'react';
import {useLocation} from '@docusaurus/router';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import clsx from 'clsx';
import styles from './styles.module.css';

const SHOW_AFTER = 280;

export default function BackToTopButton() {
  const location = useLocation();
  const {i18n} = useDocusaurusContext();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }

    const onScroll = () => {
      setIsVisible(window.scrollY > SHOW_AFTER);
    };

    onScroll();
    window.addEventListener('scroll', onScroll, {passive: true});
    return () => window.removeEventListener('scroll', onScroll);
  }, [location.pathname]);

  const scrollToTop = () => {
    if (typeof window === 'undefined') {
      return;
    }
    window.scrollTo({top: 0, behavior: 'smooth'});
  };

  const isZh = i18n.currentLocale === 'zh';
  const label = isZh ? '返回顶部' : 'Back to top';

  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={scrollToTop}
      className={clsx(styles.backToTop, isVisible && styles.backToTopVisible)}>
      <span aria-hidden="true" className={styles.arrow}>
        ↑
      </span>
    </button>
  );
}

