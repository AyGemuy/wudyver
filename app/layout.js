// import theme style scss file
import Link from 'next/link';
import 'styles/theme.scss';
import { WebVitals } from './_components/web-vitals'
 
export const metadata = {
    title: 'Dash UI - Wudysoft Admin Dashboard Template',
    description: 'Dash UI - Next JS admin dashboard template is free and available on GitHub. Create your stunning web apps with our Free Next js template. An open-source admin dashboard built using the new router, server components, and everything new in Wudysoft.',
    keywords: 'Dash UI, Wudysoft, Admin dashboard, admin template, web apps, bootstrap 5, admin theme',
    openGraph: {
    url: 'https://malik-jmk.us.kg',
    siteName: 'Wudysoft',
    images: [
      {
        url: 'https://malik-jmk.us.kg/favicon.png', // Must be an absolute URL
        width: 800,
        height: 600,
      },
      {
        url: 'https://malik-jmk.us.kg/favicon.png', // Must be an absolute URL
        width: 1800,
        height: 1600,
        alt: 'My custom alt',
      },
    ],
    videos: [
      {
        url: 'https://malik-jmk.us.kg/', // Must be an absolute URL
        width: 800,
        height: 600,
      },
    ],
    audio: [
      {
        url: 'https://malik-jmk.us.kg/', // Must be an absolute URL
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
}

export default function RootLayout({ children }) {
    return (
        <html lang="en">
            <body className='bg-light'>
            <WebVitals />
                {children}

                <Link href="/docs/swagger" target="_blank" className="btn btn-dark btn-float-button m-5 fs-4">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25"
                        strokeLinecap="round" strokeLinejoin="round" className="icon icon-tabler icons-tabler-outline icon-tabler-shopping-cart-share"><path stroke="none" d="M0 0h24v24H0z" fill="none" /><path d="M4 19a2 2 0 1 0 4 0a2 2 0 0 0 -4 0" /><path d="M12.5 17h-6.5v-14h-2" /><path d="M6 5l14 1l-1 7h-13" /><path d="M16 22l5 -5" /><path d="M21 21.5v-4.5h-4.5" /></svg>{' '} Docs
                </Link>
            </body>
        </html>
    )
}
