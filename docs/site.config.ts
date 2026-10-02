/** Site-wide constants. Nothing else in the docs hard-codes the domain or repo. */
export const SITE = {
  url: "https://slotsmith.dev",
  repo: "https://github.com/tmzm/slotsmith",
  branch: "master",
  npm: "slotsmith",
  docsDir: "docs",
  /** Google Tag Manager container, loaded on every page by `Head` and `Base`. */
  gtm: "GTM-NV899NTZ",
  /** Google Search Console ownership token (the `google-site-verification` meta tag). */
  googleSiteVerification: "_Mdhtsf0NnFUn8BdIrOTCtdqHOV7Hu7mZXGaBQuGeb8",
} as const;
