import AnnouncementBar from '@theme-original/AnnouncementBar';
import { useThemeConfig } from '@docusaurus/theme-common';

export default function AnnouncementBarWrapper(props) {
  const { announcementBar } = useThemeConfig();

  if (!announcementBar) {
    return null;
  }

  return <AnnouncementBar {...props} />;
}
