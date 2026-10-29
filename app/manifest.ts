import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Fiesta Gas PGI",
    short_name: "Fiesta Gas",
    description: "LPG monitoring, SMS reminders and refill delivery by Fiesta Gas PGI.",
    id: "/",
    start_url: "/?source=pwa",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f5f8ff",
    theme_color: "#0b5fff",
    lang: "en-PH",
    categories: ["business", "utilities"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Request refill", url: "/portal/request", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Messages", url: "/portal/messages", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Admin dashboard", url: "/admin", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
    ],
  };
}
