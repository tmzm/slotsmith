/** Site-wide constants. Nothing else in the docs hard-codes the domain or repo. */
export const SITE = {
  url: "https://slotsmith.dev",
  repo: "https://github.com/tmzm/slotsmith",
  branch: "master",
  npm: "slotsmith",
  docsDir: "docs",
  /**
   * The author, named in every page's structured data. `id` is the `Person`
   * node the portfolio publishes, so both sites describe one entity.
   */
  author: {
    id: "https://tareqmozayek.com/#person",
    name: "Tareq Al-Mozayek",
    nameAr: "طارق المزيك",
    jobTitle: "Full-Stack Engineer",
    url: "https://tareqmozayek.com",
    github: "https://github.com/tmzm",
    linkedin: "https://www.linkedin.com/in/tareq-al-mozayek-3ab2603a9/",
  },
  /** Google Tag Manager container, loaded on every page by `Head` and `Base`. */
  gtm: "GTM-NV899NTZ",
  /** Google Search Console ownership token (the `google-site-verification` meta tag). */
  googleSiteVerification: "_Mdhtsf0NnFUn8BdIrOTCtdqHOV7Hu7mZXGaBQuGeb8",
} as const;
