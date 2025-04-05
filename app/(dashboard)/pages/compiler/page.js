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
import { Clipboard, PlayCircleFill, FileEarmarkCodeFill } from "react-bootstrap-icons";

export default function CompilerPage() {
  const [sourceCode, setSourceCode] = useState("");
  const [language, setLanguage] = useState("javascript");
  const [loading, setLoading] = useState(false);
  const [output, setOutput] = useState("");
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!sourceCode) {
      setError("⚠️ Harap masukkan kode sumber.");
      return;
    }

    setLoading(true);
    setError(null);
    setOutput("");

    try {
      const response = await fetch("/api/tools/runcode/v1", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: sourceCode, lang: language }),
      });

      const data = await response.json();
      data.Result ? setOutput(data.Result) : setError(data.Errors || "⚠️ Tidak ada output yang diterima.");
      setShowModal(!!data.Result);
    } catch {
      setError("❌ Terjadi kesalahan saat menjalankan kode.");
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(output);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      alert("❌ Gagal menyalin ke clipboard.");
    }
  };

  return (
    <Container className="mt-5">
      <Row className="justify-content-center">
        <Col lg={8} md={10} xs={12}>
          <Card className="shadow-lg border-0 p-4">
            <Card.Body>
              <h3 className="text-center fw-bold mb-4">🚀 Online Code Compiler</h3>

              <Form onSubmit={handleSubmit}>
                <Form.Group controlId="language" className="mb-3">
                  <Form.Label>Bahasa Pemrograman</Form.Label>
                  <Form.Select value={language} onChange={(e) => setLanguage(e.target.value)}>
                    <option value="javascript">JavaScript</option>
                    <option value="python">Python</option>
                    <option value="java">Java</option>
                    <option value="c">C</option>
                    <option value="cpp">C++</option>
                  </Form.Select>
                </Form.Group>

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
                    placeholder="Masukkan kode sumber Anda di sini..."
                    required
                  />
                </Form.Group>

                <div className="d-grid">
                  <Button variant="success" type="submit" disabled={loading}>
                    {loading ? (
                      <>
                        <Spinner animation="border" size="sm" className="me-2" /> Memproses...
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
