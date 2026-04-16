import AnnouncementBar from '@theme-original/AnnouncementBar';
import { useThemeConfig } from '@docusaurus/theme-common';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import enAnnouncementBar from '../../../i18n/en/docusaurus-theme-classic/announcementBar.json';
import zhAnnouncementBar from '../../../i18n/zh/docusaurus-theme-classic/announcementBar.json';

const announcementMessagesByLocale = {
  en: enAnnouncementBar,
  zh: zhAnnouncementBar,
};

export default function AnnouncementBarWrapper(props) {
  const { announcementBar } = useThemeConfig();
  const { i18n } = useDocusaurusContext();

  if (!announcementBar) {
    return null;
  }

  const { content } = announcementBar;
  const localeMessages = announcementMessagesByLocale[i18n.currentLocale] ?? {};
  const localizedContent = localeMessages[content] ?? '';

  if (!localizedContent) {
    return null;
  }

  return <AnnouncementBar {...props} />;
}
