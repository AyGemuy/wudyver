'use client';

import React, { useState, Fragment } from 'react';
import { Button, Alert, Card } from 'react-bootstrap';
import useMounted from 'hooks/useMounted';

const Page = () => {
  const hasMounted = useMounted();
  const [htmlCode, setHtmlCode] = useState('');
  const [cssCode, setCssCode] = useState('');
  const [jsCode, setJsCode] = useState('');
  const [error, setError] = useState('');

  const handlePreview = () => {
    setError('');
    const iframe = document.getElementById('previewIframe');
    const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;

    try {
      iframeDoc.open();
      iframeDoc.write(`
        <html>
          <head>
            <style>${cssCode}</style>
          </head>
          <body>
            ${htmlCode}
            <script>${jsCode}</script>
          </body>
        </html>
      `);
      iframeDoc.close();
    } catch (e) {
      setError('Error rendering preview');
    }
  };

  return (
    <Fragment>
      {hasMounted &&
    <div className="container mt-5 d-flex justify-content-center align-items-center flex-column">
      <h2 className="text-center mb-4">Live Preview Code Viewer</h2>

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

        <div className="mb-3">
          <label className="form-label">CSS Code</label>
          <textarea
            className="form-control"
            rows="5"
            value={cssCode}
            onChange={(e) => setCssCode(e.target.value)}
            placeholder="h1 { color: red; }"
          />
        </div>

        <div className="mb-3">
          <label className="form-label">JavaScript Code</label>
          <textarea
            className="form-control"
            rows="5"
            value={jsCode}
            onChange={(e) => setJsCode(e.target.value)}
            placeholder="alert('Hello World');"
          />
        </div>

        <Button variant="primary" onClick={handlePreview} className="w-100">
          Preview
        </Button>
      </div>

      {error && <Alert variant="danger" className="mt-3 w-75">{error}</Alert>}

      <Card className="mt-5 w-75">
        <Card.Body>
          <Card.Title>Live Preview</Card.Title>
          <iframe
            id="previewIframe"
            style={{ width: '100%', height: '400px', border: '1px solid #ddd' }}
            title="Live Preview"
          />
        </Card.Body>
      </Card>
    </div>
  }
    </Fragment>
  );
};

export default Page;