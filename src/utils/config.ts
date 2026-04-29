interface Config {
  apiOrigin: string;
  hotjarTrackID?: number;
  googleAnalyticsID?: string;
  googleTagManagerID?: string;
}

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
    apiOrigin: configJson.apiOrigin || "http://localhost:9090",
    hotjarTrackID: configJson?.hotjarTrackID || undefined,
    googleAnalyticsID: configJson?.googleAnalyticsID || undefined,
    googleTagManagerID: configJson?.googleTagManagerID || undefined,
  };
};

export default loadConfig;
