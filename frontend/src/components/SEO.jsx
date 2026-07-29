import { Helmet } from "react-helmet-async";

const SITE_NAME = "ProfileOptimizer";
const DEFAULT_OG_IMAGE = "/og-image.png";

export default function SEO({
  title,
  description,
  canonical,
  ogTitle,
  ogDescription,
  ogImage,
}) {
  const fullTitle = title ? `${title} — ${SITE_NAME}` : SITE_NAME;
  const metaDescription = description || "Scan your resume against 27 ATS checkpoints. Get a detailed score, keyword analysis, and actionable suggestions to beat applicant tracking systems.";
  const canonicalUrl = canonical || "https://profileoptimizer.com/";
  const ogImg = ogImage || DEFAULT_OG_IMAGE;
  const ogT = ogTitle || fullTitle;
  const ogD = ogDescription || metaDescription;

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={metaDescription} />
      <link rel="canonical" href={canonicalUrl} />
      <meta property="og:type" content="website" />
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:title" content={ogT} />
      <meta property="og:description" content={ogD} />
      <meta property="og:image" content={ogImg} />
      <meta property="og:url" content={canonicalUrl} />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={ogT} />
      <meta name="twitter:description" content={ogD} />
      <meta name="twitter:image" content={ogImg} />
    </Helmet>
  );
}
