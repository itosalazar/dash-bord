import type { MetadataRoute } from "next";

/** dash-bord is a personal desk display — nothing here should be indexed. */
export default function robots(): MetadataRoute.Robots {
  return { rules: [{ userAgent: "*", disallow: "/" }] };
}
