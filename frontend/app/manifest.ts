import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "FinPilot Bharat",
    short_name: "FinPilot",
    description: "UPI reconciliation, udhaari aur runway — SME CFO",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#047857",
    lang: "en",
    icons: [
      { src: "/window.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
    ],
  };
}
