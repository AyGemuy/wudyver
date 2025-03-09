'use client';

import { useState } from 'react';
import { Container, Row, Col, Button, Form, Card, Alert, Spinner } from 'react-bootstrap';
import { Clipboard } from 'react-bootstrap-icons'; // Import ikon salin

const PageArtinama = () => {
  const [nama, setNama] = useState('');
  const [artiNama, setArtiNama] = useState('');
  const [catatan, setCatatan] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false); // State untuk status salin

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setCopied(false);

    try {
      const res = await fetch(`/api/other/artinama?nama=${nama}`);
      const data = await res.json();

      if (data.success && data.result.status) {
        setArtiNama(data.result.message.arti);
        setCatatan(data.result.message.catatan || ''); // Gunakan fallback untuk catatan jika tidak tersedia
      } else {
        setError('Nama tidak ditemukan atau terjadi kesalahan');
      }
    } catch (err) {
      setError('Terjadi kesalahan dalam mengambil data');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(artiNama).then(() => {
      setCopied(true); // Tampilkan status salin berhasil
      setTimeout(() => setCopied(false), 2000); // Reset status setelah 2 detik
    });
  };

  return (
    <Container className="mt-5">
      <Row className="justify-content-center">
        <Col md={6}>
          <h1 className="text-center mb-4">Cek Arti Nama</h1>
          <Form onSubmit={handleSubmit} className="shadow-lg p-4 rounded bg-light">
            <Form.Group controlId="formNama">
              <Form.Label>Masukkan Nama</Form.Label>
              <Form.Control
                type="text"
                placeholder="Contoh: aldi"
                value={nama}
                onChange={(e) => setNama(e.target.value)}
                required
                className="mb-3"
              />
            </Form.Group>
            <Button
              variant="primary"
              type="submit"
              disabled={loading}
              className="w-100"
            >
              {loading ? (
                <>
                  <Spinner animation="border" size="sm" /> Memuat...
                </>
              ) : (
                'Cari Arti'
              )}
            </Button>
          </Form>

          {error && <Alert variant="danger" className="mt-3">{error}</Alert>}

          {artiNama && !loading && (
            <Card className="mt-4 shadow-lg">
              <Card.Body>
                <Card.Title className="text-center">Arti Nama</Card.Title>
                <Card.Text className="text-muted">{artiNama}</Card.Text>

                {catatan && (
                  <Card.Text className="text-muted mt-3">
                    <strong>Catatan:</strong> {catatan}
                  </Card.Text>
                )}

                <Button
                  variant="outline-secondary"
                  className="mt-3 d-flex align-items-center"
                  onClick={handleCopy}
                >
                  <Clipboard size={20} className="mr-2" />
                  {copied ? 'Tersalin!' : 'Salin'}
                </Button>
              </Card.Body>
            </Card>
          )}
        </Col>
      </Row>
    </Container>
  );
};

export default PageArtinama;
