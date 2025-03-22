// Import file style dan komponen yang diperlukan
import 'styles/theme.scss';
import Script from 'next/script';
import WebVitals from '/components/web/web-vitals';

// Konfigurasi viewport untuk tema warna tab web
export const viewport = {
  themeColor: '#003366',  // Mengubah warna tema tab web menjadi biru tua
}

// Metadata untuk informasi halaman web
export const metadata = {
    title: "Malik's Web API Dashboard",  // Judul halaman
    description:
        'Dashboard API Malik adalah template dashboard admin open-source yang dibangun dengan Next.js. Gunakan template ini untuk membuat aplikasi web modern dengan fitur terbaru Next.js 13.',
    keywords:
        'Malik, Web API, Next.js 13, Dashboard admin, template admin, aplikasi web, open-source, server components',
    author: 'Malik Developer',
    robots: 'index, follow',
    canonical: 'https://api.malik-jmk.web.id',  // URL asli halaman untuk SEO
    icons: {
        icon: '/favicon.png',  // Ikon favicon
        shortcut: '/favicon.png',
        apple: '/favicon.png',
    },
    openGraph: {
        title: "Malik's Web API Dashboard",  // Title untuk Open Graph
        description:
            'Dashboard API Malik adalah template dashboard admin open-source yang dibangun dengan Next.js. Gunakan template ini untuk membuat aplikasi web modern dengan fitur terbaru Next.js 13.',
        url: 'https://api.malik-jmk.web.id',
        siteName: 'Malik Dashboard',
        images: [
            {
                url: 'https://api.malik-jmk.web.id/images/favicon/favicon.png',
                width: 800,
                height: 600,
                alt: 'Malik API Dashboard',
            },
            {
                url: 'https://api.malik-jmk.web.id/images/favicon/favicon.png',
                width: 1800,
                height: 1600,
                alt: 'Malik API Dashboard Large',
            },
        ],
        locale: 'id_ID',
        type: 'website',
    },
    twitter: {
        card: 'summary_large_image',
        site: '@malik_dev',
        title: "Malik's Web API Dashboard",  // Judul untuk Twitter card
        description:
            'Dashboard API Malik adalah template dashboard admin open-source yang dibangun dengan Next.js. Gunakan template ini untuk membuat aplikasi web modern dengan fitur terbaru Next.js 13.',
        images: ['https://api.malik-jmk.web.id/images/favicon/favicon.png'],
    },
    additionalLinkTags: [
        {
            rel: 'icon',
            href: '/favicon.ico',  // Menyediakan favicon untuk browser
        },
        {
            rel: 'apple-touch-icon',
            href: '/favicon.png',
            sizes: '180x180',
        },
        {
            rel: 'manifest',
            href: '/site.webmanifest',  // Manifest untuk PWA
        },
    ],
    additionalMetaTags: [
        {
            name: 'viewport',
            content: 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no',  // Membatasi zoom dan memastikan layar tetap
        },
        {
            name: 'application-name',
            content: "Malik's Web API Dashboard",  // Nama aplikasi
        },
        {
            name: 'generator',
            content: 'Next.js 13',  // Generator yang digunakan
        },
    ],
};

// Layout utama untuk halaman
export default function RootLayout({ children }) {
    return (
        <html lang="en">
            <body className="bg-light">
                <WebVitals />  {/* Komponen untuk web vitals */}
                {children}  {/* Konten anak */}
                <Script
                    src="https://ddosnotification.github.io/snow-theme/snow.js"
                    strategy="beforeInteractive"  // Mengimpor skrip untuk efek salju sebelum interaksi
                />
                <Script id="snow-theme-config" strategy="lazyOnload">
                    {`
                        SnowTheme.config.snowflakes = ['❄', '●', '*', '+'];
                        SnowTheme.config.minSize = 1;
                        SnowTheme.config.maxSize = 2;
                        SnowTheme.config.minDuration = 10;
                        SnowTheme.config.maxDuration = 20;
                        SnowTheme.config.wind = 10;
                    `}
                </Script>
                <Script src="https://static.elfsight.com/platform/platform.js" async />  {/* Platform Elfsight untuk widget */}
                
            </body>
        </html>
    );
}
