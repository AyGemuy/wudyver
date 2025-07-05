'use client';

import { useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import DisableDevtool from 'disable-devtool';

const DevtoolDetector = () => {
  const router = useRouter();

  const redirectToAntiDevTools = useCallback(() => {
    if (typeof window !== 'undefined' && window.location.pathname !== '/anti-devtools') {
      console.warn('!!! SYSTEM ALERT !!!');
      console.log('UNAUTHORIZED ACCESS: Developer Tools Detected.');
      console.info('Initiating security protocol: CONNECTION TERMINATED.');
      console.warn('Please disable Developer Tools to continue.');
      console.log('Failure to comply may result in further restrictions.');
      debugger; 
      router.push('/anti-devtools');
    }
  }, [router]);

  useEffect(() => {
    DisableDevtool({
      ondevtoolopen: redirectToAntiDevTools
    });

    const checkWindowSize = () => {
      const threshold = 160;
      if (
        typeof window !== 'undefined' &&
        (window.outerWidth - window.innerWidth > threshold ||
        window.outerHeight - window.innerHeight > threshold)
      ) {
        redirectToAntiDevTools();
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('resize', checkWindowSize);
      checkWindowSize(); 
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('resize', checkWindowSize);
      }
    };
  }, [redirectToAntiDevTools]);

  return null;
};

export default DevtoolDetector;