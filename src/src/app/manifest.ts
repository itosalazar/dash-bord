import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "dash-bord",
    short_name: "dash-bord",
    description: "A private landscape desk dashboard for an iPhone on a charging stand.",
    start_url: "/?source=pwa",
    scope: "/",
    display: "standalone",
    // A hint only — the layout adapts and shows a rotate prompt in portrait.
    orientation: "any",
    background_color: "#3b4048",
    theme_color: "#3b4048",
    categories: ["productivity", "utilities"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
