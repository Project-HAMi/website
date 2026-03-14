import React, {useEffect} from 'react';
import clsx from 'clsx';
import {useLocation} from '@docusaurus/router';
import {
  useThemeConfig,
  ErrorCauseBoundary,
  ThemeClassNames,
  useWindowSize,
} from '@docusaurus/theme-common';
import {
  splitNavbarItems,
  useNavbarMobileSidebar,
} from '@docusaurus/theme-common/internal';
import NavbarItem from '@theme/NavbarItem';
import NavbarColorModeToggle from '@theme/Navbar/ColorModeToggle';
import SearchBar from '@theme/SearchBar';
import NavbarMobileSidebarToggle from '@theme/Navbar/MobileSidebar/Toggle';
import NavbarLogo from '@theme/Navbar/Logo';
import NavbarSearch from '@theme/Navbar/Search';
import GhButton from '../../../components/gitHubButton';
import styles from './styles.module.css';

function useNavbarItems() {
  return useThemeConfig().navbar.items;
}

function isDocsRoute(pathname) {
  return /^\/(?:zh\/)?docs(?:\/|$)/.test(pathname);
}

function NavbarItems({items}) {
  return (
    <>
      {items.map((item, i) => (
        <ErrorCauseBoundary
          key={i}
          onError={(error) =>
            new Error(
              `A theme navbar item failed to render.
Please double-check the following navbar item (themeConfig.navbar.items) of your Docusaurus config:
${JSON.stringify(item, null, 2)}`,
              {cause: error},
            )
          }>
          <NavbarItem {...item} />
        </ErrorCauseBoundary>
      ))}
    </>
  );
}

function NavbarContentLayout({left, right}) {
  return (
    <div className="navbar__inner">
      <div
        className={clsx(
          ThemeClassNames.layout.navbar.containerLeft,
          'navbar__items',
        )}>
        {left}
      </div>
      <div
        className={clsx(
          ThemeClassNames.layout.navbar.containerRight,
          'navbar__items navbar__items--right',
        )}>
        {right}
      </div>
    </div>
  );
}

export default function NavbarContent() {
  const mobileSidebar = useNavbarMobileSidebar();
  const windowSize = useWindowSize();
  const location = useLocation();
  const items = useNavbarItems();
  const [leftItems, rightItems] = splitNavbarItems(items);
  const searchBarItem = items.find((item) => item.type === 'search');
  const showDesktopStarButton = windowSize === 'desktop';
  const showVersionDropdown = isDocsRoute(location.pathname);
  const filteredRightItems = showVersionDropdown
    ? rightItems
    : rightItems.filter((item) => item.type !== 'docsVersionDropdown');

  useEffect(() => {
    if (windowSize !== 'desktop') {
      return undefined;
    }

    const nav = document.querySelector('.theme-layout-navbar.navbar.navbar--fixed-top');
    if (!nav) {
      return undefined;
    }

    const links = Array.from(
      nav.querySelectorAll('.navbar__item.navbar__link'),
    );
    if (!links.length) {
      return undefined;
    }

    let hoverLink = null;
    const SCROLL_THRESHOLD = 10;

    const getActiveLink = () =>
      nav.querySelector('.navbar__item.navbar__link--active');

    const placeIndicator = (link) => {
      if (!link) {
        nav.style.setProperty('--hami-nav-indicator-opacity', '0');
        return;
      }
      const navRect = nav.getBoundingClientRect();
      const linkRect = link.getBoundingClientRect();
      const left = linkRect.left - navRect.left;
      const width = linkRect.width;
      nav.style.setProperty('--hami-nav-indicator-left', `${left}px`);
      nav.style.setProperty('--hami-nav-indicator-width', `${width}px`);
      nav.style.setProperty('--hami-nav-indicator-opacity', '1');
    };

    const animateScaleIn = () => {
      nav.classList.remove('hami-nav-grow');
      void nav.offsetWidth;
      nav.classList.add('hami-nav-grow');
    };

    const setHovering = (isHovering) => {
      if (isHovering) {
        nav.classList.add('hami-nav-hover');
      } else {
        nav.classList.remove('hami-nav-hover');
        nav.classList.remove('hami-nav-grow');
      }
    };

    const updateIndicator = () => {
      placeIndicator(hoverLink ?? getActiveLink());
    };

    const onEnter = (event) => {
      hoverLink = event.currentTarget;
      updateIndicator();
      setHovering(true);
      animateScaleIn();
    };

    const onLeave = () => {
      hoverLink = null;
      updateIndicator();
      setHovering(false);
    };

    const syncScrolledState = () => {
      if (window.scrollY > SCROLL_THRESHOLD) {
        nav.classList.add('hami-nav-scrolled');
      } else {
        nav.classList.remove('hami-nav-scrolled');
      }
    };

    links.forEach((link) => {
      link.addEventListener('mouseenter', onEnter);
      link.addEventListener('mouseleave', onLeave);
      link.addEventListener('focus', onEnter);
      link.addEventListener('blur', onLeave);
    });

    window.addEventListener('resize', updateIndicator);
    window.addEventListener('scroll', syncScrolledState, {passive: true});
    updateIndicator();
    syncScrolledState();

    return () => {
      links.forEach((link) => {
        link.removeEventListener('mouseenter', onEnter);
        link.removeEventListener('mouseleave', onLeave);
        link.removeEventListener('focus', onEnter);
        link.removeEventListener('blur', onLeave);
      });
      window.removeEventListener('resize', updateIndicator);
      window.removeEventListener('scroll', syncScrolledState);
      nav.classList.remove('hami-nav-grow');
      nav.classList.remove('hami-nav-hover');
      nav.classList.remove('hami-nav-scrolled');
    };
  }, [location.pathname, windowSize]);

  return (
    <NavbarContentLayout
      left={
        <>
          {!mobileSidebar.disabled && <NavbarMobileSidebarToggle />}
          <NavbarLogo />
          <NavbarItems items={leftItems} />
        </>
      }
      right={
        <>
          <NavbarItems items={filteredRightItems} />
          {showDesktopStarButton && (
            <div className={styles.starButtonWrap}>
              <GhButton className={styles.starButton} />
            </div>
          )}
          <NavbarColorModeToggle className={styles.colorModeToggle} />
          {!searchBarItem && (
            <NavbarSearch>
              <SearchBar />
            </NavbarSearch>
          )}
        </>
      }
    />
  );
}
