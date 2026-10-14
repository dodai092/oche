import { notFound } from "next/navigation";
import { OcheApp, type Screen } from "@/components/oche-app";
const screens = [
  "new",
  "match",
  "players",
  "statistics",
  "history",
  "settings",
];
export const dynamicParams = false;
export function generateStaticParams() {
  return screens.map((screen) => ({ screen }));
}
export default async function Page({
  params,
}: {
  params: Promise<{ screen: string }>;
}) {
  const { screen } = await params;
  if (!screens.includes(screen)) notFound();
  return <OcheApp screen={screen as Screen} />;
}
