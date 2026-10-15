import type { Metadata, Viewport } from "next";
import Script from "next/script";
import "./globals.css";
export const metadata: Metadata = {
  title: "Oche | Every dart counts",
  description:
    "Your local darts room. Score x01 matches, track your progress, and find your finish.",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "Oche" },
  icons: {
    icon: `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/icon.svg`,
    apple: `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/apple-touch-icon.png` },
};
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#101311",
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <Script
          id="oche-theme"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html:
              "try{var t=localStorage.getItem('oche-theme');if(t==='light'||t==='dark')document.documentElement.dataset.theme=t}catch(e){}",
          }}
        />
        {children}
      </body>
    </html>
  );
}
