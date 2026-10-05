export default function robots() {
  const baseUrl = "https://ia.kptmangaluru.in";

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/dashboard/",
          "/admin/",
          "/hod/",
          "/principal/",
          "/coe/",
          "/exam-officer/",
          "/api/",
        ],
      },
    ],

    sitemap: `${baseUrl}/sitemap.xml`,
  };
}