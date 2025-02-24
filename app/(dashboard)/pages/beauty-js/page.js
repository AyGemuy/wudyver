'use client';
import { useState } from 'react';
import { Card, Button, Form, Alert, Container, Row, Col, Spinner } from 'react-bootstrap';
import { Download } from 'react-bootstrap-icons';

const BeautyPage = () => {
  const [url, setUrl] = useState('');
  const [message, setMessage] = useState('');
  const [variant, setVariant] = useState('info');
  const [loading, setLoading] = useState(false); // State untuk loading

  const handleBeautify = async () => {
    setLoading(true); // Set loading ke true
    try {
      const apiUrl = `/api/tools/beauty-js?url=${encodeURIComponent(url)}`;
      const res = await fetch(apiUrl);

      if (!res.ok) {
        throw new Error(`Gagal: ${res.statusText}`);
      }

      const blob = await res.blob();
      const link = document.createElement('a');
      link.href = window.URL.createObjectURL(blob);
      link.download = 'Beautified.zip';
      link.click();

      setVariant('success');
      setMessage('✅ Download berhasil!');
    } catch (err) {
      setVariant('danger');
      setMessage(`❌ Error: ${err.message}`);
    } finally {
      setLoading(false); // Set loading ke false setelah proses selesai
    }
  };

  return (
    <Container className="d-flex justify-content-center align-items-center vh-100">
      <Row className="w-100">
        <Col xs={12} md={8} lg={6} className="mx-auto">
          <Card className="shadow-lg border-0 rounded-4 p-4">
            <Card.Body>
              <Card.Title className="text-center fw-bold fs-4 mb-3">
                🔹 Beautify ZIP File
              </Card.Title>
              <Form>
                <Form.Group className="mb-3">
                  <Form.Label className="fw-semibold">Masukkan URL ZIP</Form.Label>
                  <Form.Control
                    type="text"
                    placeholder="https://example.com/file.zip"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    className="p-2"
                  />
                </Form.Group>
                <Button
                  variant="primary"
                  onClick={handleBeautify}
                  className="w-100 py-2 d-flex align-items-center justify-content-center"
                  disabled={loading} // Nonaktifkan tombol saat loading
                >
                  {loading ? (
                    <>
                      <Spinner animation="border" size="sm" className="me-2" />
                      Memproses...
                    </>
                  ) : (
                    <>
                      <Download className="me-2" size={20} />
                      Beautify & Download
                    </>
                  )}
                </Button>
              </Form>
              {message && <Alert className="mt-3 text-center" variant={variant}>{message}</Alert>}
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default BeautyPage;