'use client';
import { useState } from 'react';
import { Container, Card, Button, Form, Alert, Spinner } from 'react-bootstrap';
import { Download } from 'react-bootstrap-icons';

const BeautyPage = () => {
  const [url, setUrl] = useState('');
  const [message, setMessage] = useState('');
  const [variant, setVariant] = useState('info');
  const [loading, setLoading] = useState(false);

  const handleBeautify = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/tools/beauty-js?url=${encodeURIComponent(url)}`);
      if (!res.ok) throw new Error(`Gagal: ${res.statusText}`);

      const blob = await res.blob();
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = 'Beautified.zip';
      link.click();

      setVariant('success');
      setMessage('Download berhasil!');
    } catch (err) {
      setVariant('danger');
      setMessage(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container className="text-center mt-5">
      <Card className="shadow-lg border-0 p-4">
        <Card.Body>
          <h3 className="mb-4 text-primary">Beautify ZIP File</h3>
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
            <Button variant="primary" onClick={handleBeautify} className="w-100 d-flex align-items-center justify-content-center" disabled={loading}>
              {loading ? (
                <>
                  <Spinner animation="border" size="sm" className="me-2" /> Memproses...
                </>
              ) : (
                <>
                  <Download className="me-2" size={20} /> Beautify & Download
                </>
              )}
            </Button>
          </Form>
          {message && <Alert className="mt-3 text-center" variant={variant}>{message}</Alert>}
        </Card.Body>
      </Card>
    </Container>
  );
};

export default BeautyPage;
