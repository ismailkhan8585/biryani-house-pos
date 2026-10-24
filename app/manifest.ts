import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/pos",
    name: "Ilyas Biryani POS",
    short_name: "Ilyas POS",
    description: "Billing, orders and branch management for Ilyas Chicken Biryani",
    scope: "/",
    start_url: "/pos",
    display: "standalone",
    orientation: "any",
    background_color: "#FFF7ED",
    theme_color: "#F97316",
    icons: [
      {
        src: "/icons/pos-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      { src: "/icons/pos-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
    ],
  };
}
