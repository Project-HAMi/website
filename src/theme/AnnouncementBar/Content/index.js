import React from 'react';
import clsx from 'clsx';
import {useThemeConfig} from '@docusaurus/theme-common';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import enAnnouncementBar from '../../../../i18n/en/docusaurus-theme-classic/announcementBar.json';
import zhAnnouncementBar from '../../../../i18n/zh/docusaurus-theme-classic/announcementBar.json';
import styles from './styles.module.css';

const announcementMessagesByLocale = {
  en: enAnnouncementBar,
  zh: zhAnnouncementBar,
};

export default function AnnouncementBarContent(props) {
  const {announcementBar} = useThemeConfig();
  const {i18n} = useDocusaurusContext();
  const {content} = announcementBar;
  const localeMessages = announcementMessagesByLocale[i18n.currentLocale] ?? {};
  const fallbackMessages = announcementMessagesByLocale.en ?? {};
  const localizedContent =
    localeMessages[content] ?? fallbackMessages[content] ?? content;

  return (
    <div
      {...props}
      className={clsx(styles.content, props.className)}
      // Developer provided the HTML, so assume it's safe.
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{__html: localizedContent}}
    />
  );
}
