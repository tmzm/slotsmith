/**
 * Lighthouse CI for the built docs site.
 *
 * Serves `dist/` (run after `pnpm build`) and audits the landing and the data
 * table overview three times each with the default mobile preset. Every
 * category must score at least 0.95, and layout shift must stay at or under
 * 0.01. Reports are written to `.lighthouseci/`, never to public storage.
 *
 * Chrome: `CHROME_PATH` wins when set. Otherwise a local Windows run uses the
 * installed Chrome, and CI uses the runner's Chrome, which Lighthouse finds by
 * itself.
 */
const fs = require("node:fs");

const WINDOWS_CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";

function chromePath() {
  if (process.env.CHROME_PATH) return process.env.CHROME_PATH;
  if (process.platform === "win32" && fs.existsSync(WINDOWS_CHROME)) return WINDOWS_CHROME;
  return undefined;
}

const minScore = ["error", { minScore: 0.95 }];

module.exports = {
  ci: {
    collect: {
      staticDistDir: "./dist",
      url: ["http://localhost/", "http://localhost/components/data-table/"],
      numberOfRuns: 3,
      chromePath: chromePath(),
    },
    assert: {
      assertions: {
        "categories:performance": minScore,
        "categories:accessibility": minScore,
        "categories:best-practices": minScore,
        "categories:seo": minScore,
        "cumulative-layout-shift": ["error", { maxNumericValue: 0.01 }],
      },
    },
    upload: {
      target: "filesystem",
      outputDir: "./.lighthouseci",
    },
  },
};
