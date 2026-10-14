import type { MetadataRoute } from "next";

export const dynamic = "force-static";

export default function manifest(): MetadataRoute.Manifest {
  const base = (process.env.NEXT_PUBLIC_BASE_PATH ?? "").replace(/\/$/, "");
  return {
    id: `${base}/`,
    name: "Oche",
    short_name: "Oche",
    description:
      "Your darts room. Score matches on this device, online or offline.",
    start_url: `${base}/`,
    scope: `${base}/`,
    display: "standalone",
    background_color: "#151a12",
    theme_color: "#151a12",
    icons: [192, 512].map((size) => ({
      src: `${base}/offline-icon-${size}.png`,
      sizes: `${size}x${size}`,
      type: "image/png",
    })),
  };
}
