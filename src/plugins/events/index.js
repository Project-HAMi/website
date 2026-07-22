import ical from 'node-ical';

const STRIP_ATTRS = /\s(on\w+|style|class|id|data-\w+)\s*=\s*"[^"]*"/gi;
const STRIP_TAGS = /<(?!\/?(a|b|i|em|strong|u|ul|ol|li|br|p)\b)[^>]*>/gi;
const URL_RE = /(?<!href="|">)(https?:\/\/[^\s<>"')\]]+)/gi;

function sanitizeHTML(text) {
  if (!text) return '';
  let out = text.replace(/\\n/g, '');
  out = out.replace(/:\w+:/g, '');
  out = out.replace(STRIP_TAGS, '');
  out = out.replace(STRIP_ATTRS, '');
  out = out.replace(URL_RE, '<a href="$1">$1</a>');
  return out;
}

export default function pluginEvents(context, options) {
  const {sources} = options;
  if (!sources || !sources.length) {
    throw new Error('plugin-events: must provide `sources` array with at least one {name, icsUrl} entry');
  }

  return {
    name: 'plugin-events',

    async loadContent() {
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      const rangeEnd = new Date(now);
      rangeEnd.setMonth(rangeEnd.getMonth() + 6);
      const all = [];

      for (const src of sources) {
        try {
          const data = await ical.async.fromURL(src.icsUrl, {});
          const sourceTag = src.name;

          const vevents = Object.values(data).filter((e) => e.type === 'VEVENT');

          const instances = [];
          for (const ev of vevents) {
            const expanded = ical.expandRecurringEvent(ev, {from: now, to: rangeEnd});
            for (const inst of expanded) {
              instances.push({
                summary: inst.event.summary || ev.summary || '',
                start: inst.start?.toISOString() || '',
                end: inst.end?.toISOString() || '',
                location: inst.event.location || ev.location || '',
                description: sanitizeHTML(inst.event.description || ev.description || ''),
                categories: [sourceTag],
              });
            }
          }

          console.log(`plugin-events: "${src.name}" — ${vevents.length} VEVENTs → ${instances.length} instances expanded`);
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

    async contentLoaded({content, actions}) {
      actions.setGlobalData({events: content});
    },
  };
};
