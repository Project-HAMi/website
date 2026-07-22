import ical from "node-ical";
import { sanitizeCalendarDescription } from "../../utils/ical.js";

export default function pluginEvents(context, options) {
  const { sources } = options;
  if (!sources || !sources.length) {
    throw new Error(
      "plugin-events: must provide `sources` array with at least one {name, icsUrl} entry",
    );
  }

  return {
    name: "plugin-events",

    async loadContent() {
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      const rangeEnd = new Date(now);
      rangeEnd.setMonth(rangeEnd.getMonth() + 6);
      const all = [];

      for (const src of sources) {
        try {
          const data = await ical.async.fromURL(src.icsUrl, { timeout: 10000 });
          const sourceTag = src.name;

          const vevents = Object.values(data).filter((e) => e.type === "VEVENT");

          const instances = [];
          for (const ev of vevents) {
            const expanded = ical.expandRecurringEvent(ev, { from: now, to: rangeEnd });
            for (const inst of expanded) {
              instances.push({
                summary: inst.event.summary || ev.summary || "",
                start: inst.start?.toISOString() || "",
                end: inst.end?.toISOString() || "",
                location: inst.event.location || ev.location || "",
                description: sanitizeCalendarDescription(
                  inst.event.description || ev.description || "",
                ),
                categories: [sourceTag],
              });
            }
          }

          console.log(
            `plugin-events: "${src.name}": ${vevents.length} VEVENTs, ${instances.length} instances expanded`,
          );
          all.push(...instances);
        } catch (err) {
          console.warn(
            `plugin-events: failed to parse "${src.name}" (${src.icsUrl}), skipping:`,
            err.message,
          );
        }
      }

      return all.sort((a, b) => a.start.localeCompare(b.start));
    },

    async contentLoaded({ content, actions }) {
      actions.setGlobalData({ events: content });
    },
  };
}
