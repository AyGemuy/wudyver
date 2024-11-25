import { useEffect } from 'react';

export default function Stoplight() {
  useEffect(() => {
    const specUrl = '/api/openapi';
    const baseUrl = '/';

    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.src = 'https://unpkg.com/@stoplight/elements/web-components.min.js';

    const style = document.createElement('link');
    style.rel = 'stylesheet';
    style.href = 'https://unpkg.com/@stoplight/elements/styles.min.css';

    const elements = document.createElement('elements-api');
    elements.setAttribute('apiDescriptionUrl', specUrl);
    elements.setAttribute('logo', 'https://raw.githubusercontent.com/vortico/flama/master/public/icon-32.png');
    elements.setAttribute('basePath', baseUrl);

    // Append the script, style, and elements component to the document
    document.head.appendChild(script);
    document.head.appendChild(style);
    document.getElementById('app')?.appendChild(elements);

    // Clean up when the component is unmounted
    return () => {
      document.getElementById('app')?.removeChild(elements);
      document.head.removeChild(style);
      document.head.removeChild(script);
    };
  }, []);

  return <div id="app"></div>;
}
