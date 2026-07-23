import Layout from "@theme/Layout";
import useDocusaurusContext from "@docusaurus/useDocusaurusContext";
import EventLanding from "@site/src/components/EventLanding";
import events from "@site/src/data/events";

const event = events.find((e) => e.slug === "kubecon-japan");

export default function KubeConJapan() {
  const { i18n } = useDocusaurusContext();
  const isZh = i18n.currentLocale.startsWith("zh");

  if (!event) {
    return (
      <Layout title={isZh ? "未找到活动" : "Event not found"}>
        <main className="container margin-vert--xl">
          <h1>{isZh ? "未找到活动" : "Event not found"}</h1>
        </main>
      </Layout>
    );
  }

  return (
    <Layout
      title={isZh ? event.title.zh : event.title.en}
      description={isZh ? event.description.zh : event.description.en}
    >
      <EventLanding event={event} />
    </Layout>
  );
}
