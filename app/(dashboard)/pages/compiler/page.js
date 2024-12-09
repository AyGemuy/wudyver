'use client';

import React, { useState } from 'react';
import { Button, Form, Alert, Spinner, Card, Tooltip, OverlayTrigger } from 'react-bootstrap';
import { Light as SyntaxHighlighter } from 'react-syntax-highlighter';
import { docco } from 'react-syntax-highlighter/dist/esm/styles/hljs';
import { Copy } from 'react-bootstrap-icons';
import { CopyToClipboard } from 'react-copy-to-clipboard';

export default function CompilerPage() {
  const [sourceCode, setSourceCode] = useState('');
  const [language, setLanguage] = useState('');
  const [loading, setLoading] = useState(false);
  const [output, setOutput] = useState('');
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setOutput('');

    const postData = {
      source: sourceCode,
      lang: language,
    };

    try {
      const response = await fetch('/api/tools/compiler', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(postData),
      });

      const data = await response.json();

      if (data.output) {
        setOutput(data.output);
      } else {
        setError('No output received.');
      }
    } catch (err) {
      setError('Error occurred while processing.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mt-4">
      <h2>Compiler Tool</h2>

      <Form onSubmit={handleSubmit}>
        <Form.Group controlId="sourceCode">
          <Form.Label>Source Code</Form.Label>
          <Form.Control
            as="textarea"
            rows={5}
            value={sourceCode}
            onChange={(e) => setSourceCode(e.target.value)}
            placeholder="Enter your source code"
          />
        </Form.Group>

        <Form.Group controlId="language">
          <Form.Label>Programming Language</Form.Label>
          <Form.Control
            type="text"
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            placeholder="Enter language (e.g., python, java)"
          />
        </Form.Group>

        <Button variant="primary" type="submit" className="mt-3" disabled={loading}>
          {loading ? <Spinner animation="border" size="sm" /> : 'Compile'}
        </Button>
      </Form>

      {error && (
        <Alert variant="danger" className="mt-4">
          {error}
        </Alert>
      )}

      {output && (
        <Card className="mt-4">
          <Card.Header>Output</Card.Header>
          <Card.Body>
            <div className="d-flex justify-content-between align-items-center">
              <SyntaxHighlighter language={language} style={docco}>
                {output}
              </SyntaxHighlighter>
              <OverlayTrigger
                placement="top"
                overlay={<Tooltip>Copy to Clipboard</Tooltip>}
              >
                <CopyToClipboard text={output}>
                  <Button variant="outline-secondary" size="sm">
                    <Copy />
                  </Button>
                </CopyToClipboard>
              </OverlayTrigger>
            </div>
          </Card.Body>
        </Card>
      )}
    </div>
  );
}
