'use client';

import React, { useState } from 'react';
import { Button, Container, Form, Alert, Card, Row, Col } from 'react-bootstrap';
import { ArrowsFullscreen } from 'react-bootstrap-icons';

const HtmlPage = () => {
  const [htmlCode, setHtmlCode] = useState('');
  const [error, setError] = useState('');
  const [isFullScreen, setIsFullScreen] = useState(false);

  const handleHtmlChange = (e) => {
    setHtmlCode(e.target.value);
    try {
      const iframe = document.getElementById('previewIframe');
      const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;

      iframeDoc.open();
      iframeDoc.write(`
        <!DOCTYPE html>
        <html lang="en">
          <head>
            <meta charset="UTF-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          </head>
          <body>
            ${e.target.value}
          </body>
        </html>
      `);
      iframeDoc.close();
      setError(''); // Reset error if rendering is successful
    } catch (e) {
      setError('Error rendering preview');
    }
  };

  const handleFullScreenToggle = () => {
    setIsFullScreen((prev) => !prev);
  };

  return (
    <Container className="mt-5 d-flex justify-content-center align-items-center flex-column">
      <h2 className="text-center mb-4">Live HTML Preview</h2>

      <Row className="w-100">
        <Col xs={12} md={8} lg={6}>
          <Form.Group className="mb-3">
            <Form.Label>HTML Code</Form.Label>
            <Form.Control
              as="textarea"
              rows={5}
              value={htmlCode}
              onChange={handleHtmlChange}
              placeholder="<h1>Hello World</h1>"
            />
          </Form.Group>
        </Col>
      </Row>

      {error && <Alert variant="danger" className="mt-3 w-100">{error}</Alert>}

      <Card className="mt-5 w-100 position-relative">
        <Card.Body>
          <Card.Title>Live Preview</Card.Title>
          <iframe
            id="previewIframe"
            style={{
              width: '100%',
              height: isFullScreen ? '100vh' : '400px',
              border: '1px solid #ddd',
              borderRadius: '4px',
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
    </Container>
  );
};

export default HtmlPage;