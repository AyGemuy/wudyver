import Script from 'next/script';
import { Inter } from "next/font/google";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import Providers from "./providers";
import apiConfig from "@/configs/apiConfig";
import Head from "./head";

const inter = Inter({ subsets: ["latin"] });

const domain = `https://${apiConfig.DOMAIN_URL}`;
const faviconPngPath = "/favicon.png";
const faviconSvgPath = "/favicon.svg";
const appleTouchIcon = "/images/favicon/favicon.png";
const socialShareImage = "/images/favicon/favicon.png";

export const metadata = {
  metadataBase: new URL(domain),
  title: {
    default: "DashCode API Dashboard",
    template: "%s | DashCode API Dashboard",
  },
  description: "DashCode API Dashboard: Template admin open-source Next.js 13 dengan fitur API dan komponen server terbaru. Futuristik, cepat, dan responsif.",
  keywords: [
    "DashCode",
    "Web API",
    "Next.js 13",
    "Next.js 14",
    "Dashboard admin",
    "template admin",
    "aplikasi web",
    "open-source",
    "server components",
    "PWA",
    "modern",
    "futuristik",
    "nextjs",
    "next14",
    "pwa",
    "next-pwa",
    "dashcode",
    "admin",
    "dashboard",
  ],
  authors: [
    {
      name: "AyGemuy",
      url: "https://www.github.com/AyGemuy/",
    },
    {
      name: "DashCode Developer",
    }
  ],
  alternates: {
    canonical: domain,
  },
  viewport: "minimum-scale=1, initial-scale=1, width=device-width, shrink-to-fit=no, user-scalable=no, viewport-fit=cover",
  applicationName: "DashCode API Dashboard",
  manifest: "/manifest.json",
  themeColor: "#2196F3",
  icons: {
    icon: [
      { url: faviconPngPath, sizes: "any" },
      { url: faviconSvgPath, type: "image/svg+xml" },
      { url: "/favicon.ico", sizes: "any" },
    ],
    shortcut: "/favicon.ico",
    apple: [{ url: appleTouchIcon, sizes: "180x180" }],
  },
  appleWebApp: {
    capable: true,
    title: "DashCode",
    statusBarStyle: "default",
    startupImage: [],
  },
  msapplication: {
    config: "/browserconfig.xml",
    TileColor: "#2B5797",
  },
  openGraph: {
    type: "website",
    title: "DashCode API Dashboard - Modern Admin Panel",
    description: "Jelajahi DashCode API Dashboard, template admin Next.js 13 open-source dengan performa tinggi dan desain futuristik. Dibangun untuk aplikasi web modern.",
    url: domain,
    siteName: "DashCode",
    images: [
      {
        url: `${domain}${socialShareImage}`,
        width: 1200,
        height: 630,
        alt: "DashCode API Dashboard Social Share Image",
      },
    ],
    locale: "id_ID",
  },
  twitter: {
    card: "summary_large_image",
    site: "@DashCode_dev",
    creator: "@DashCode_dev",
    title: "DashCode API Dashboard - Modern Admin Panel",
    description: "DashCode API Dashboard: Template admin Next.js 13 open-source dengan fitur API dan komponen server terbaru. Futuristik, cepat, dan responsif.",
    images: [`${domain}${socialShareImage}`],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "no-imageindex": true,
      "max-video-preview": -1,
      "max-snippet": -1,
    },
  },
  verification: {
    google: "E5QX7KBlw_hIr1JP7QY6n_A74Uys6lCj-KfGws9UrV4",
  },
  generator: "Next.js 13",
};

export default async function RootLayout({ children }) {
  const session = await getServerSession(authOptions);

  return (
    <html lang="id">
    <Head>
      </Head>
      <body className={`${inter.className} font-inter custom-tippy dashcode-app`}>
        <Script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-1389266588531643"
          crossOrigin="anonymous"
          strategy="afterInteractive"
        />
        <Providers session={session}>
          {children}
        </Providers>
      </body>
    </html>
  );
}