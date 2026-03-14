import React from 'react';
import {useLocation} from '@docusaurus/router';
import {useThemeConfig} from '@docusaurus/theme-common';
import {useNavbarMobileSidebar} from '@docusaurus/theme-common/internal';
import NavbarItem from '@theme/NavbarItem';

function useNavbarItems() {
  return useThemeConfig().navbar.items;
}

function isDocsRoute(pathname) {
  return /^\/(?:zh\/)?docs(?:\/|$)/.test(pathname);
}

export default function NavbarMobilePrimaryMenu() {
  const mobileSidebar = useNavbarMobileSidebar();
  const location = useLocation();
  const items = useNavbarItems();
  const showVersionDropdown = isDocsRoute(location.pathname);
  const filteredItems = showVersionDropdown
    ? items
    : items.filter((item) => item.type !== 'docsVersionDropdown');

  return (
    <ul className="menu__list">
      {filteredItems.map((item, i) => (
        <NavbarItem
          mobile
          {...item}
          onClick={() => mobileSidebar.toggle()}
          key={i}
        />
      ))}
    </ul>
  );
}
