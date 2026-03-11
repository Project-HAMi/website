import React from 'react';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import {translate} from '@docusaurus/Translate';
import {mergeSearchStrings, useHistorySelector} from '@docusaurus/theme-common';
import {useAlternatePageUtils} from '@docusaurus/theme-common/internal';
import DropdownNavbarItem from '@theme/NavbarItem/DropdownNavbarItem';
import IconLanguage from '@theme/Icon/Language';
import styles from './styles.module.css';

const localePreferenceKey = 'hami.locale.preference';

function persistLocalePreference(locale) {
  try {
    window.localStorage.setItem(localePreferenceKey, locale);
  } catch (error) {
    // Ignore storage failures such as private browsing restrictions.
  }
}

function useLocaleDropdownUtils() {
  const {
    siteConfig,
    i18n: {localeConfigs},
  } = useDocusaurusContext();
  const alternatePageUtils = useAlternatePageUtils();
  const search = useHistorySelector((history) => history.location.search);
  const hash = useHistorySelector((history) => history.location.hash);

  const getLocaleConfig = (locale) => {
    const localeConfig = localeConfigs[locale];
    if (!localeConfig) {
      throw new Error(`No locale config found for locale=${locale}`);
    }
    return localeConfig;
  };

  const getBaseURLForLocale = (locale) => {
    const localeConfig = getLocaleConfig(locale);
    const isSameDomain = localeConfig.url === siteConfig.url;

    if (isSameDomain) {
      return `pathname://${alternatePageUtils.createUrl({
        locale,
        fullyQualified: false,
      })}`;
    }

    return alternatePageUtils.createUrl({
      locale,
      fullyQualified: true,
    });
  };

  return {
    getURL: (locale, options) => {
      const finalSearch = mergeSearchStrings(
        [search, options.queryString],
        'append',
      );
      return `${getBaseURLForLocale(locale)}${finalSearch}${hash}`;
    },
    getLabel: (locale) => getLocaleConfig(locale).label,
    getLang: (locale) => getLocaleConfig(locale).htmlLang,
  };
}

export default function LocaleDropdownNavbarItem({
  mobile,
  dropdownItemsBefore,
  dropdownItemsAfter,
  queryString,
  ...props
}) {
  const utils = useLocaleDropdownUtils();
  const {
    i18n: {currentLocale, locales},
  } = useDocusaurusContext();

  const localeItems = locales.map((locale) => ({
    label: utils.getLabel(locale),
    lang: utils.getLang(locale),
    to: utils.getURL(locale, {queryString}),
    target: '_self',
    autoAddBaseUrl: false,
    onClick: () => persistLocalePreference(locale),
    className:
      locale === currentLocale
        ? mobile
          ? 'menu__link--active'
          : 'dropdown__link--active'
        : '',
  }));

  const items = [...dropdownItemsBefore, ...localeItems, ...dropdownItemsAfter];
  const dropdownLabel = mobile
    ? translate({
        message: 'Languages',
        id: 'theme.navbar.mobileLanguageDropdown.label',
        description: 'The label for the mobile language switcher dropdown',
      })
    : utils.getLabel(currentLocale);

  return (
    <DropdownNavbarItem
      {...props}
      mobile={mobile}
      label={
        <>
          <IconLanguage className={styles.iconLanguage} />
          {dropdownLabel}
        </>
      }
      items={items}
    />
  );
}
