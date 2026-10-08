import type { MetadataRoute } from "next";

// Personal finance app: nothing to index besides the sign-in pages.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: ["/login", "/register"], disallow: ["/"] }],
  };
}
