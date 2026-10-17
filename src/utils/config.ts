interface Config {
  apiOrigin: string;
  hotjarTrackID?: number;
  googleAnalyticsID?: string;
  googleTagManagerID?: string;
  sentryDsn?: string;
  /** Where the "Documentation" links point: the site built from the repo's docs/ folder. */
  docsUrl: string;
  /** The main (production) host of ATLA ZTA; the client install commands point at it. */
  publicUrl: string;
}

const DEFAULT_PUBLIC_URL = "https://zta.atla.com";

// Matches `url` in docs/docusaurus.config.js; override it with docsUrl in the config.
const DEFAULT_DOCS_URL = "https://docs.atla.example";

const loadConfig = (): Config => {
  let configJson: any;

  if (process.env.APP_ENV === "test") {
    configJson = require("@/config/test");
  } else if (process.env.NODE_ENV === "development") {
    configJson = require("@/config/local");
  } else {
    configJson = require("@/config/production");
  }

  return {
    // "" is a deliberate value (same-origin, e.g. behind a reverse proxy) -
    // only fall back to the dev default when the field is missing entirely.
    apiOrigin: configJson.apiOrigin ?? "http://localhost:9090",
    hotjarTrackID: configJson?.hotjarTrackID || undefined,
    googleAnalyticsID: configJson?.googleAnalyticsID || undefined,
    googleTagManagerID: configJson?.googleTagManagerID || undefined,
    sentryDsn: configJson?.sentryDsn || undefined,
    docsUrl: configJson?.docsUrl || DEFAULT_DOCS_URL,
    publicUrl: configJson?.publicUrl || DEFAULT_PUBLIC_URL,
  };
};

export default loadConfig;
