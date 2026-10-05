export default function sitemap() {
  const baseUrl = "https://ia.kptmangaluru.in";

  return [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
  ];
}