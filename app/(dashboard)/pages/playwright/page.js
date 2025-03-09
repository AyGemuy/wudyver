'use client';

import React, { useState } from 'react';
import { Button, Form, Alert, Spinner, Modal, Container, Row, Col, Card } from 'react-bootstrap';
import { Light as SyntaxHighlighter } from 'react-syntax-highlighter';
import { docco } from 'react-syntax-highlighter/dist/esm/styles/hljs';
import { Clipboard } from 'react-bootstrap-icons';

export default function PlaywrightPage() {
  const [sourceCode, setSourceCode] = useState('');
  const [timeoutMs, setTimeoutMs] = useState(5000);
  const [loading, setLoading] = useState(false);
  const [output, setOutput] = useState('');
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!sourceCode) {
      setError('Harap masukkan source code.');
      return;
    }

    setLoading(true);
    setError(null);
    setOutput('');

    const postData = {
      code: sourceCode,
      timeout: timeoutMs,
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
        setShowModal(true);
      } else {
        setError('Tidak ada output yang diterima.');
      }
    } catch (err) {
      setError('Terjadi kesalahan saat memproses.');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(output);
      alert('Hasil berhasil disalin ke clipboard!');
    } catch (err) {
      alert('Gagal menyalin ke clipboard.');
    }
  };

  const closeModal = () => setShowModal(false);

  return (
    <Container className="mt-5">
      <Row className="justify-content-center">
        <Col lg={8} md={10} xs={12}>
          <Card className="shadow-lg p-4 border-0">
            <Card.Body>
              <h3 className="text-center mb-4">Playwright Code Executor</h3>
              <Form onSubmit={handleSubmit}>
                <Form.Group controlId="sourceCode" className="mb-3">
                  <Form.Label>Source Code</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={6}
                    value={sourceCode}
                    onChange={(e) => setSourceCode(e.target.value)}
                    placeholder="Masukkan source code Anda di sini"
                    required
                  />
                </Form.Group>

                <Form.Group controlId="timeout" className="mb-3">
                  <Form.Label>Timeout (ms)</Form.Label>
                  <Form.Control
                    type="number"
                    value={timeoutMs}
                    onChange={(e) => setTimeoutMs(Number(e.target.value))}
                    min={1000}
                    required
                  />
                </Form.Group>

                <div className="d-grid">
                  <Button variant="primary" type="submit" disabled={loading}>
                    {loading ? (
                      <>
                        <Spinner animation="border" size="sm" className="me-2" /> Memproses...
                      </>
                    ) : (
                      'Jalankan'
                    )}
                  </Button>
                </div>
              </Form>

              {error && (
                <Alert variant="danger" className="mt-4 text-center">
                  {error}
                </Alert>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Modal show={showModal} onHide={closeModal} centered>
        <Modal.Header closeButton>
          <Modal.Title>Hasil Eksekusi</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <SyntaxHighlighter language="plaintext" style={docco}>
            {output}
          </SyntaxHighlighter>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="outline-secondary" size="sm" onClick={copyToClipboard}>
            <Clipboard className="me-2" /> Salin ke Clipboard
          </Button>
          <Button variant="secondary" onClick={closeModal}>
            Tutup
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
}
