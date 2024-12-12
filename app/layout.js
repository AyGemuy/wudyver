// Import theme style SCSS file
import Link from 'next/link';
import 'styles/theme.scss';
import { WebVitals } from './_components/web-vitals';

// Set up metadata for the page using Next.js conventions
export const metadata = {
  title: 'Dash UI - Wudysoft Admin Dashboard Template',
  description: 'Dash UI - Next JS admin dashboard template is free and available on GitHub. Create your stunning web apps with our Free Next JS template. An open-source admin dashboard built using the new router, server components, and everything new in Wudysoft.',
  keywords: 'Dash UI, Wudysoft, Admin dashboard, admin template, web apps, bootstrap 5, admin theme',
  openGraph: {
    url: 'https://malik-jmk.us.kg',
    siteName: 'Wudysoft',
    images: [
      {
        url: 'https://malik-jmk.us.kg/favicon.png', // Absolute URL
        width: 800,
        height: 600,
        alt: 'Dash UI Thumbnail',
      },
      {
        url: 'https://malik-jmk.us.kg/favicon.png', // Absolute URL
        width: 1800,
        height: 1600,
        alt: 'Wudysoft Admin Dashboard',
      },
    ],
    videos: [
      {
        url: 'https://malik-jmk.us.kg/', // Absolute URL
        width: 800,
        height: 600,
      },
    ],
    audio: [
      {
        url: 'https://malik-jmk.us.kg/', // Absolute URL
      },
    ],
    locale: 'id_ID',
    type: 'website',
  },
  robots: {
    index: false,
    follow: true,
    nocache: true,
    googleBot: {
      index: true,
      follow: false,
      noimageindex: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  icons: {
    icon: '/favicon.png',
    shortcut: '/favicon.png',
    apple: '/favicon.png',
    other: {
      rel: 'apple-touch-icon-precomposed',
      url: '/apple-touch-icon-precomposed.png',
    },
  },
  twitter: {
    card: 'app',
    title: 'Wudysoft',
    description: 'The React Framework for the Web',
    siteId: '1467726470533754880',
    creator: '@nextjs',
    creatorId: '1467726470533754880',
    images: {
      url: 'https://malik-jmk.us.kg/favicon.png',
      alt: 'Wudysoft Logo',
    },
    app: {
      name: 'twitter_app',
      id: {
        iphone: 'twitter_app://iphone',
        ipad: 'twitter_app://ipad',
        googleplay: 'twitter_app://googleplay',
      },
      url: {
        iphone: 'https://iphone_url',
        ipad: 'https://ipad_url',
      },
    },
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        {/* You can use Next.js built-in Head component for meta tags and title */}
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>{metadata.title}</title>
        <meta name="description" content={metadata.description} />
        <meta name="keywords" content={metadata.keywords} />
        {/* Open Graph */}
        <meta property="og:url" content={metadata.openGraph.url} />
        <meta property="og:site_name" content={metadata.openGraph.siteName} />
        {metadata.openGraph.images.map((image, idx) => (
          <meta key={idx} property="og:image" content={image.url} />
        ))}
        <meta property="og:locale" content={metadata.openGraph.locale} />
        <meta property="og:type" content={metadata.openGraph.type} />
        {/* Twitter */}
        <meta name="twitter:card" content={metadata.twitter.card} />
        <meta name="twitter:title" content={metadata.twitter.title} />
        <meta name="twitter:description" content={metadata.twitter.description} />
        <meta name="twitter:creator" content={metadata.twitter.creator} />
        <meta name="twitter:site" content={metadata.twitter.siteId} />
        <meta name="twitter:image" content={metadata.twitter.images.url} />
        <meta name="twitter:image:alt" content={metadata.twitter.images.alt} />
        {/* Add the external script */}
        <script type="text/javascript">
          {`
            (function(I, L, T, i, c, k, s) {
              if(I.iticks) return;
              I.iticks = {host:c, settings:s, clientId:k, cdn:L, queue:[]};
              var h = T.head || T.documentElement;
              var e = T.createElement(i);
              var l = I.location;
              e.async = true;
              e.src = (L||c)+'/client/inject-v2.min.js';
              h.insertBefore(e, h.firstChild);
              I.iticks.call = function(a, b) {I.iticks.queue.push([a, b]);};
            })(window, 'https://cdn-v1.intelliticks.com/prod/common', document, 'script', 'https://app.intelliticks.com', 'JgjkAJJjsW84HBiyo_c', {});
          `}
        </script>
      </head>
      <body className='bg-light'>
        <WebVitals />
        {children}

        <Link href="/docs" target="_blank" className="btn btn-dark btn-float-button m-5 fs-4">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25"
            strokeLinecap="round" strokeLinejoin="round" className="icon icon-tabler icons-tabler-outline icon-tabler-shopping-cart-share">
            <path stroke="none" d="M0 0h24v24H0z" fill="none" />
            <path d="M4 19a2 2 0 1 0 4 0a2 2 0 0 0 -4 0" />
            <path d="M12.5 17h-6.5v-14h-2" />
            <path d="M6 5l14 1l-1 7h-13" />
            <path d="M16 22l5 -5" />
            <path d="M21 21.5v-4.5h-4.5" />
          </svg>{' '} Docs
        </Link>
      </body>
    </html>
  );
}
