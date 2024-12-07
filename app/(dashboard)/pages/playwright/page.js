'use client';

import React, { useState } from 'react';
import { Button, Form, Alert, Spinner, Card, Tooltip, OverlayTrigger, Modal } from 'react-bootstrap';
import { Light as SyntaxHighlighter } from 'react-syntax-highlighter';
import { docco } from 'react-syntax-highlighter/dist/esm/styles/hljs';
import { Copy } from 'react-bootstrap-icons';
import { CopyToClipboard } from 'react-copy-to-clipboard';

export default function PlaywrightPage() {
  const [sourceCode, setSourceCode] = useState('');
  const [language, setLanguage] = useState('');
  const [loading, setLoading] = useState(false);
  const [output, setOutput] = useState('');
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!sourceCode || !language) {
      setError('Harap masukkan source code dan bahasa pemrograman.');
      return;
    }

    setLoading(true);
    setError(null);
    setOutput('');

    const postData = {
      code: sourceCode,
      language: language,
    };

    try {
      const response = await fetch('/api/tools/playwright', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(postData),
      });

      const data = await response.json();

      if (data.output) {
        setOutput(data.output);
        setShowModal(true); // Tampilkan modal hasil
      } else {
        setError('Tidak ada output yang diterima.');
      }
    } catch (err) {
      setError('Terjadi kesalahan saat memproses.');
    } finally {
      setLoading(false);
    }
  };

  const closeModal = () => setShowModal(false);

  return (
    <div className="container mt-4">
      <h2>Playwright Tool</h2>

      <Form onSubmit={handleSubmit}>
        <Form.Group controlId="sourceCode">
          <Form.Label>Source Code</Form.Label>
          <Form.Control
            as="textarea"
            rows={5}
            value={sourceCode}
            onChange={(e) => setSourceCode(e.target.value)}
            placeholder="Masukkan source code Anda di sini"
            required
          />
        </Form.Group>

        <Form.Group controlId="language">
          <Form.Label>Programming Language</Form.Label>
          <Form.Control
            type="text"
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            placeholder="Masukkan bahasa pemrograman (misalnya, python, java)"
            required
          />
        </Form.Group>

        <Button variant="primary" type="submit" className="mt-3" disabled={loading}>
          {loading ? (
            <>
              <Spinner animation="border" size="sm" className="me-2" /> Memproses...
            </>
          ) : (
            'Compile'
          )}
        </Button>
      </Form>

      {error && (
        <Alert variant="danger" className="mt-4">
          {error}
        </Alert>
      )}

      <Modal show={showModal} onHide={closeModal}>
        <Modal.Header closeButton>
          <Modal.Title>Hasil Eksekusi</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <SyntaxHighlighter language={language} style={docco}>
            {output}
          </SyntaxHighlighter>
        </Modal.Body>
        <Modal.Footer>
          <CopyToClipboard text={output}>
            <Button variant="outline-secondary" size="sm">
              <Copy className="me-2" /> Salin ke Clipboard
            </Button>
          </CopyToClipboard>
          <Button variant="secondary" onClick={closeModal}>
            Tutup
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}
