import apiConfig from "@/configs/apiConfig";

export default function Head() {
  const domain = `https://${apiConfig.DOMAIN_URL}`; // Menggunakan apiConfig.DOMAIN_URL
  const faviconPath = "/favicon.png"; // Pastikan path ini benar

  return (
    <>
      <title>DashCode API Dashboard</title>

      {/* Favicons */}
      <link rel="icon" href={faviconPath} />
      <link rel="shortcut icon" href={faviconPath} />
      <link rel="apple-touch-icon" href={faviconPath} sizes="180x180" />
      <link rel="manifest" href="/site.webmanifest" />

      {/* Canonical URL */}
      <link rel="canonical" href={domain} />

      {/* SEO Meta Tags */}
      <meta
        name="description"
        content="DashCode API Dashboard adalah template dashboard admin open-source yang dibangun dengan Next.js. Gunakan template ini untuk membuat aplikasi web modern dengan fitur terbaru Next.js 13."
      />
      <meta
        name="keywords"
        content="DashCode, Web API, Next.js 13, Dashboard admin, template admin, aplikasi web, open-source, server components"
      />
      <meta name="author" content="DashCode Developer" />
      <meta name="robots" content="index, follow" />
      <meta
        name="viewport"
        content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no"
      />
      <meta name="application-name" content="DashCode API Dashboard" />
      <meta name="generator" content="Next.js 13" />

      {/* Open Graph Meta */}
      <meta property="og:title" content="DashCode API Dashboard" />
      <meta
        property="og:description"
        content="DashCode API Dashboard adalah template dashboard admin open-source yang dibangun dengan Next.js. Gunakan template ini untuk membuat aplikasi web modern dengan fitur terbaru Next.js 13."
      />
      <meta property="og:url" content={domain} />
      <meta property="og:site_name" content="DashCode" />
      <meta property="og:locale" content="id_ID" />
      <meta property="og:type" content="website" />
      <meta property="og:image" content={`${domain}${faviconPath}`} />
      <meta property="og:image:width" content="800" />
      <meta property="og:image:height" content="600" />
      <meta property="og:image:alt" content="DashCode API Dashboard" />
      {/* Anda bisa menambahkan properti og:image lain jika diperlukan, */}
      {/* namun pastikan tujuannya jelas (misalnya untuk ukuran berbeda) */}

      {/* Twitter Card Meta */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:site" content="@dashcode_dev" />
      <meta name="twitter:title" content="DashCode API Dashboard" />
      <meta
        name="twitter:description"
        content="DashCode API Dashboard adalah template dashboard admin open-source yang dibangun dengan Next.js. Gunakan template ini untuk membuat aplikasi web modern dengan fitur terbaru Next.js 13."
      />
      <meta
        name="twitter:image"
        content={`${domain}${faviconPath}`}
      />
      <meta name="google-site-verification" content="E5QX7KBlw_hIr1JP7QY6n_A74Uys6lCj-KfGws9UrV4" />
    </>
  );
}