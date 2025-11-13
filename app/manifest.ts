import { COMPANY_NAME, COMPANY_SHORT_NAME } from "@/lib/config";
import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${COMPANY_NAME}`,
    short_name: `${COMPANY_SHORT_NAME}`,
    description:  `Inventory management system for ${COMPANY_NAME}`,
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#2EC6FE",
    theme_color: "#9d57ff",
    dir: "auto",
    lang: "en-US",
    icons: [
      {
        src: "/icon512_rounded.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any"
      },
      {
        src: "/icon512_maskable.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable"
      }
    ],
  };
}
