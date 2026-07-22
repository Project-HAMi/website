import Layout from "@theme/Layout";
import useDocusaurusContext from "@docusaurus/useDocusaurusContext";
import EventLanding from "@site/src/components/EventLanding";
import events from "@site/src/data/events";

const event = events.find((e) => e.slug === "kubecon-japan");

export default function KubeConJapan() {
  const { i18n } = useDocusaurusContext();
  const isZh = i18n.currentLocale === "zh";

  return (
    <Layout
      title={isZh ? event.title.zh : event.title.en}
      description={isZh ? event.description.zh : event.description.en}
    >
      <EventLanding event={event} />
    </Layout>
  );
}
