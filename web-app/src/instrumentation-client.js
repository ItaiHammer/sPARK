import posthog from "posthog-js";

const token = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN;
const host = process.env.NEXT_PUBLIC_POSTHOG_HOST;

if (token && host) {
  posthog.init(token, {
    api_host: host,
    defaults: "2026-08-30",
    capture_pageview: "history_change",
    autocapture: false,
    rageclick: false,
    capture_dead_clicks: false,
    capture_heatmaps: false,
    capture_performance: false,
    capture_exceptions: false,
    disable_session_recording: true,
    disable_surveys: true,
    disable_scroll_properties: true,
    person_profiles: "never",
    persistence: "localStorage",
    mask_personal_data_properties: true,
    before_send(event) {
      if (!event) return null;

      const properties = { ...event.properties, $geoip_disable: true };
      for (const key of ["$current_url", "$initial_current_url", "$session_entry_url"]) {
        if (typeof properties[key] === "string") {
          properties[key] = properties[key].split(/[?#]/, 1)[0];
        }
      }
      for (const key of ["$referrer", "$initial_referrer", "$session_entry_referrer"]) {
        if (URL.canParse(properties[key])) {
          properties[key] = new URL(properties[key]).origin;
        }
      }
      return { ...event, properties };
    },
  });
}
