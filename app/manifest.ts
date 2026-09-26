import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Biryani House POS",
    short_name: "BH POS",
    description: "Restaurant Point of Sale System for Biryani House",
    start_url: "/pos",
    display: "standalone",
    orientation: "landscape-primary",
    background_color: "#FFF7ED",
    theme_color: "#F97316",
    icons: [
      {
        src: "/icon-192x192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icon-512x512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
