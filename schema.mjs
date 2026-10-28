// Schema.org structured data (JSON-LD), generated per page at build time.
//
// Why these types and not "NGO"/"NonprofitOrganization":
// this is an independent awareness project, not a registered non-profit.
// Marking it up as one would be inaccurate (and against Google's structured-data
// guidelines). If you ever register a charity/NGO, change "Organization" below to "NGO".

export function schemaFor(page, cfg, ctx) {
  if (!page.schema) return null;
  const site = cfg.siteUrl;
  const home = `${site}/`;
  const ids = {
    org: `${site}/#organization`,
    website: `${site}/#website`,
    webpage: `${site}/#webpage`,
    dataset: `${site}/#dataset`,
  };
  const image = `${site}${cfg.ogImage}`;

  const graph = [
    {
      "@type": "Organization",
      "@id": ids.org,
      name: cfg.siteName,
      url: home,
      logo: { "@type": "ImageObject", url: `${site}/assets/icon-512.png`, width: 512, height: 512 },
      description:
        "An independent awareness project about tiger conservation in India. Not affiliated with any government body or conservation organisation.",
    },
    {
      "@type": "WebSite",
      "@id": ids.website,
      url: home,
      name: cfg.siteName,
      description: page.description,
      inLanguage: cfg.lang,
      publisher: { "@id": ids.org },
    },
    {
      "@type": "WebPage",
      "@id": ids.webpage,
      url: home,
      name: page.title,
      description: page.description,
      inLanguage: cfg.lang,
      isPartOf: { "@id": ids.website },
      about: { "@type": "Thing", name: "Bengal tiger", sameAs: "https://en.wikipedia.org/wiki/Bengal_tiger" },
      primaryImageOfPage: { "@type": "ImageObject", url: image, width: 1200, height: 630 },
      dateModified: ctx.lastmod,
    },
    {
      "@type": "Dataset",
      "@id": ids.dataset,
      name: "Estimated wild tigers in India, 2006 to 2022",
      description:
        "Official All India Tiger Estimation totals (1,411 in 2006 to 3,682 in 2022) and 2018 vs 2022 estimates for the four leading tiger states, compiled from Government of India publications.",
      url: `${home}#trend`,
      inLanguage: cfg.lang,
      temporalCoverage: "2006/2022",
      spatialCoverage: { "@type": "Place", name: "India" },
      variableMeasured: "Estimated number of wild tigers",
      measurementTechnique: "All India Tiger Estimation (camera traps and field surveys)",
      creator: { "@id": ids.org },
      isBasedOn:
        "https://static.pib.gov.in/WriteReadData/specificdocs/documents/2024/nov/doc20241125451801.pdf",
    },
  ];

  return { "@context": "https://schema.org", "@graph": graph };
}
