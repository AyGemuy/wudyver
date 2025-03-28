"use client";

import React, { useState } from "react";
import {
  Button,
  Form,
  Alert,
  Spinner,
  Modal,
  Container,
  Row,
  Col,
  Card,
  InputGroup,
} from "react-bootstrap";
import { Light as SyntaxHighlighter } from "react-syntax-highlighter";
import { atomOneLight } from "react-syntax-highlighter/dist/esm/styles/hljs";
import {
  Clipboard,
  PlayCircleFill,
  ClockFill,
  FileEarmarkCodeFill,
} from "react-bootstrap-icons";

export default function PlaywrightPage() {
  const [sourceCode, setSourceCode] = useState("");
  const [timeoutMs, setTimeoutMs] = useState(5000);
  const [loading, setLoading] = useState(false);
  const [output, setOutput] = useState("");
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!sourceCode) {
      setError("⚠️ Harap masukkan source code.");
      return;
    }

    setLoading(true);
    setError(null);
    setOutput("");

    try {
      const response = await fetch("/api/tools/playwright", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: sourceCode, timeout: timeoutMs }),
      });

      const data = await response.json();
      if (data.output) {
        setOutput(data.output);
        setShowModal(true);
      } else {
        setError("⚠️ Tidak ada output yang diterima.");
      }
    } catch (err) {
      setError("❌ Terjadi kesalahan saat memproses.");
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(output);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      alert("❌ Gagal menyalin ke clipboard.");
    }
  };

  return (
    <Container className="mt-5">
      <Row className="justify-content-center">
        <Col lg={8} md={10} xs={12}>
          <Card className="shadow-lg border-0 p-4">
            <Card.Body>
              <h3 className="text-center fw-bold mb-4">
                🚀 Playwright Code Executor
              </h3>

              <Form onSubmit={handleSubmit}>
                <Form.Group controlId="sourceCode" className="mb-3">
                  <Form.Label>
                    <FileEarmarkCodeFill className="me-2 text-primary" />
                    Source Code
                  </Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={6}
                    value={sourceCode}
                    onChange={(e) => setSourceCode(e.target.value)}
                    placeholder="Masukkan kode Playwright Anda di sini..."
                    required
                  />
                </Form.Group>

                <Form.Group controlId="timeout" className="mb-3">
                  <Form.Label>
                    <ClockFill className="me-2 text-warning" />
                    Timeout (ms)
                  </Form.Label>
                  <InputGroup>
                    <Form.Control
                      type="number"
                      value={timeoutMs}
                      onChange={(e) => setTimeoutMs(Number(e.target.value))}
                      min={1000}
                      required
                    />
                    <InputGroup.Text>ms</InputGroup.Text>
                  </InputGroup>
                </Form.Group>

                <div className="d-grid">
                  <Button variant="success" type="submit" disabled={loading}>
                    {loading ? (
                      <>
                        <Spinner animation="border" size="sm" className="me-2" />{" "}
                        Memproses...
                      </>
                    ) : (
                      <>
                        <PlayCircleFill className="me-2" />
                        Jalankan
                      </>
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

      <Modal show={showModal} onHide={() => setShowModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>📜 Hasil Eksekusi</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <SyntaxHighlighter language="plaintext" style={atomOneLight}>
            {output}
          </SyntaxHighlighter>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="outline-secondary" onClick={copyToClipboard}>
            <Clipboard className="me-2" />
            {copied ? "Tersalin!" : "Salin ke Clipboard"}
          </Button>
          <Button variant="dark" onClick={() => setShowModal(false)}>
            Tutup
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
}
