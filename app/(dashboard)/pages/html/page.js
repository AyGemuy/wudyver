'use client';

import React, { useState, useEffect, Fragment } from 'react';
import { Alert, Card, Button } from 'react-bootstrap';
import { ArrowsFullscreen } from 'react-bootstrap-icons';
import useMounted from 'hooks/useMounted';

const HtmlPage = () => {
  const hasMounted = useMounted();
  const [htmlCode, setHtmlCode] = useState('');
  const [error, setError] = useState('');
  const [isFullScreen, setIsFullScreen] = useState(false);

  useEffect(() => {
    const iframe = document.getElementById('previewIframe');
    const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;

    try {
      iframeDoc.open();
      iframeDoc.write(`
        <!DOCTYPE html>
        <html lang="en">
          <head>
            <meta charset="UTF-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          </head>
          <body>
            ${htmlCode}
          </body>
        </html>
      `);
      iframeDoc.close();
    } catch (e) {
      setError('Error rendering preview');
    }
  }, [htmlCode]);

  const handleFullScreenToggle = () => {
    setIsFullScreen(!isFullScreen);
  };

  return (
    <Fragment>
      {hasMounted && (
        <div className="container mt-5 d-flex justify-content-center align-items-center flex-column">
          <h2 className="text-center mb-4">Live HTML Preview</h2>

          <div className="w-75">
            <div className="mb-3">
              <label className="form-label">HTML Code</label>
              <textarea
                className="form-control"
                rows="5"
                value={htmlCode}
                onChange={(e) => setHtmlCode(e.target.value)}
                placeholder="<h1>Hello World</h1>"
              />
            </div>
          </div>

          {error && <Alert variant="danger" className="mt-3 w-75">{error}</Alert>}

          <Card className="mt-5 w-75">
            <Card.Body>
              <Card.Title>Live Preview</Card.Title>
              <iframe
                id="previewIframe"
                style={{
                  width: '100%',
                  height: isFullScreen ? '100vh' : '400px',
                  border: '1px solid #ddd',
                }}
                title="Live Preview"
              />
              <Button
                variant="link"
                className="position-absolute top-0 end-0 m-3"
                onClick={handleFullScreenToggle}
              >
                <ArrowsFullscreen size={24} />
              </Button>
            </Card.Body>
          </Card>
        </div>
      )}
    </Fragment>
  );
};

export default HtmlPage;
