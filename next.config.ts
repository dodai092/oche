import type { NextConfig } from "next";
const config: NextConfig = {
  devIndicators: false,
  output: process.env.GITHUB_PAGES === "true" ? "export" : undefined,
  basePath: process.env.NEXT_PUBLIC_BASE_PATH ?? "",
  trailingSlash: true,
};
export default config;
