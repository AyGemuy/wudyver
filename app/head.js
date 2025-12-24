import Script from 'next/script';
import apiConfig from "@/configs/apiConfig";

export default function Head() {
  const domain = `https://${apiConfig.DOMAIN_URL}`;

  const faviconIcoPath = "/favicon.ico";
  const faviconPngPath = "/favicon.png";
  const faviconSvgPath = "/favicon.svg";

  const pwaIcon192 = "/images/favicon/favicon.png";
  const pwaIcon512 = "/images/favicon/favicon.png";
  const appleTouchIcon = "/images/favicon/favicon.png";

  const socialShareImage = "/images/favicon/favicon.png";

  return (
    <>
      <Script
        async
        src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-1389266588531643"
        crossOrigin="anonymous"
        strategy="afterInteractive"
      />

      <title>DashCode API Dashboard</title>

      <link rel="icon" href={faviconPngPath} />
      <link rel="shortcut icon" href={faviconIcoPath} />
      <link rel="manifest" href="/manifest.json" />

      <meta name="application-name" content="DashCode API Dashboard" />
      <meta name="apple-mobile-web-app-capable" content="yes" />
      <meta name="apple-mobile-web-app-status-bar-style" content="default" />
      <meta name="apple-mobile-web-app-title" content="DashCode" />
      <meta
        name="description"
        content="DashCode API Dashboard: Template admin open-source Next.js 13 dengan fitur API dan komponen server terbaru. Futuristik, cepat, dan responsif."
      />
      <meta name="format-detection" content="telephone=no" />
      <meta name="mobile-web-app-capable" content="yes" />
      <meta name="msapplication-config" content="/browserconfig.xml" />
      <meta name="msapplication-TileColor" content="#2B5797" />
      <meta name="msapplication-tap-highlight" content="no" />
      <meta name="theme-color" content="#2196F3" />

      <meta
        name="viewport"
        content="minimum-scale=1, initial-scale=1, width=device-width, shrink-to-fit=no, user-scalable=no, viewport-fit=cover"
      />

      <link rel="apple-touch-icon" href={appleTouchIcon} sizes="180x180" />

      <link rel="mask-icon" href={faviconSvgPath} color="#2196F3" />

      <link rel="canonical" href={domain} />

      <meta property="og:type" content="website" />
      <meta property="og:title" content="DashCode API Dashboard - Modern Admin Panel" />
      <meta
        property="og:description"
        content="Jelajahi DashCode API Dashboard, template admin Next.js 13 open-source dengan performa tinggi dan desain futuristik. Dibangun untuk aplikasi web modern."
      />
      <meta property="og:url" content={domain} />
      <meta property="og:site_name" content="DashCode" />
      <meta property="og:image" content={`${domain}${socialShareImage}`} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:locale" content="id_ID" />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:site" content="@DashCode_dev" />
      <meta name="twitter:title" content="DashCode API Dashboard - Modern Admin Panel" />
      <meta
        name="twitter:description"
        content="DashCode API Dashboard: Template admin Next.js 13 open-source dengan fitur API dan komponen server terbaru. Futuristik, cepat, dan responsif."
      />
      <meta name="twitter:image" content={`${domain}${socialShareImage}`} />
      <meta name="twitter:creator" content="@DashCode_dev" />

      <meta name="keywords" content="DashCode, Web API, Next.js 13, Dashboard admin, template admin, aplikasi web, open-source, server components, PWA, modern, futuristik" />
      <meta name="author" content="DashCode Developer" />
      <meta name="robots" content="index, follow" />
      <meta name="generator" content="Next.js 13" />
      <meta name="google-site-verification" content="E5QX7KBlw_hIr1JP7QY6n_A74Uys6lCj-KfGws9UrV4" />

      <link rel="stylesheet" href="https://fonts.googleapis.com/css?family=Roboto:300,400,500" />
    </>
  );
}