"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Button,
  Form,
  Alert,
  Container,
  Row,
  Col,
  Card,
} from "react-bootstrap";
import { FileEarmarkCodeFill, EyeFill, Clipboard } from "react-bootstrap-icons";

export default function Page() {
  const [htmlCode, setHtmlCode] = useState("");
  const [copied, setCopied] = useState(false);
  const iframeRef = useRef(null);

  useEffect(() => {
    if (iframeRef.current) {
      const doc = iframeRef.current.contentDocument;
      if (doc) {
        doc.open();
        doc.write(htmlCode);
        doc.close();
      }
    }
  }, [htmlCode]);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(htmlCode);
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
              <h3 className="text-center fw-bold mb-4">🖥️ HTML Live Preview</h3>

              <Form>
                <Form.Group controlId="htmlCode" className="mb-3">
                  <Form.Label>
                    <FileEarmarkCodeFill className="me-2 text-primary" />
                    HTML Code
                  </Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={6}
                    value={htmlCode}
                    onChange={(e) => setHtmlCode(e.target.value)}
                    placeholder="Masukkan kode HTML di sini..."
                    required
                  />
                </Form.Group>

                <div className="d-flex justify-content-between">
                  <Button variant="outline-secondary" onClick={copyToClipboard}>
                    <Clipboard className="me-2" />
                    {copied ? "Tersalin!" : "Salin ke Clipboard"}
                  </Button>
                </div>
              </Form>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Row className="justify-content-center mt-4">
        <Col lg={8} md={10} xs={12}>
          <h5 className="text-center fw-bold">
            <EyeFill className="me-2" /> Pratinjau HTML
          </h5>
          <iframe
            ref={iframeRef}
            className="border rounded bg-white shadow-sm w-100"
            style={{ minHeight: "300px", border: "1px solid #ddd" }}
          />
        </Col>
      </Row>
    </Container>
  );
}
