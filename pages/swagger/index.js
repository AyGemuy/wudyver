import { useEffect } from "react";

export default function Swagger() {
  useEffect(() => {
    const docs = async () => {
      const linkStyle = document.createElement("link");
      linkStyle.rel = "stylesheet";
      linkStyle.href = "https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.15.5/swagger-ui.css";
      document.head.appendChild(linkStyle);

      const customStyle = document.createElement("style");
      const response = await fetch("/style.css");
      const css = await response.text();
      customStyle.innerHTML = css;
      document.head.appendChild(customStyle);

      const scriptBundle = document.createElement("script");
      scriptBundle.src = "https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.15.5/swagger-ui-bundle.js";
      const scriptPreset = document.createElement("script");
      scriptPreset.src = "https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.15.5/swagger-ui-standalone-preset.js";
      document.body.appendChild(scriptBundle);
      document.body.appendChild(scriptPreset);

      scriptBundle.onload = () => {
        if (window.SwaggerUIBundle && window.SwaggerUIStandalonePreset) {
          window.SwaggerUIBundle({
            url: "/api/openapi",
            dom_id: '#swagger-ui',
        deepLinking: true,
        presets: [
          window.SwaggerUIBundle.presets.apis,
          window.SwaggerUIStandalonePreset
        ],
        plugins: [
          window.SwaggerUIBundle.plugins.DownloadUrl
        ],
        layout: 'StandaloneLayout',
        displayRequestDuration: true,
        docExpansion: 'none',
        validatorUrl: null,
        tryItOutEnabled: false
          });
        }
      };
    };

    docs();

    return () => {};
  }, []);

  return <div id="swagger-ui"></div>;
}
