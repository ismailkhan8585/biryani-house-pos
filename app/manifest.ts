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
        src: "/ilyas-logo.png",
        sizes: "1254x1254",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}
