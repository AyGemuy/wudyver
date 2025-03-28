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
  FileEarmarkCodeFill,
} from "react-bootstrap-icons";
import axios from "axios";

export default function CodeConvertPage() {
  const [sourceCode, setSourceCode] = useState("");
  const [lang, setLang] = useState("JavaScript");
  const [to, setTo] = useState(""); // Target language (optional)
  const [version, setVersion] = useState("v1"); // Default version is v1
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

    const requestPayload = {
      lang,
      code: sourceCode,
      version,
    };

    if (to) {
      requestPayload.to = to; // Only include 'to' if it's set
    }

    try {
      const response = await axios.post(`/api/tools/code-convert/${version}`, requestPayload);

      const data = response.data;
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
                🚀 Code Converter
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
                    placeholder="Masukkan kode Anda di sini..."
                    required
                  />
                </Form.Group>

                <Form.Group controlId="lang" className="mb-3">
                  <Form.Label>Pilih Bahasa Sumber</Form.Label>
                  <Form.Control
                    as="select"
                    value={lang}
                    onChange={(e) => setLang(e.target.value)}
                    required
                  >
                    <option value="JavaScript">JavaScript</option>
                    <option value="Python">Python</option>
                    <option value="Java">Java</option>
                    <option value="Go">Go</option>
                  </Form.Control>
                </Form.Group>

                <Form.Group controlId="to" className="mb-3">
                  <Form.Label>Pilih Bahasa Tujuan (Opsional)</Form.Label>
                  <Form.Control
                    as="select"
                    value={to}
                    onChange={(e) => setTo(e.target.value)}
                  >
                    <option value="">Tidak Ada</option>
                    <option value="JavaScript">JavaScript</option>
                    <option value="Python">Python</option>
                    <option value="Java">Java</option>
                    <option value="Go">Go</option>
                  </Form.Control>
                </Form.Group>

                <Form.Group controlId="version" className="mb-3">
                  <Form.Label>Pilih Versi API</Form.Label>
                  <Form.Control
                    as="select"
                    value={version}
                    onChange={(e) => setVersion(e.target.value)}
                  >
                    <option value="v1">v1</option>
                    <option value="v2">v2</option>
                  </Form.Control>
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
                        Konversi Kode
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
          <Modal.Title>📜 Hasil Konversi</Modal.Title>
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
