'use client';

import React, { useState } from 'react';
import { Button, Form, Alert, Spinner, Card } from 'react-bootstrap';
import { Link45deg, ArrowClockwise } from 'react-bootstrap-icons';

export default function ShortlinkPage() {
  const [url, setUrl] = useState('');
  const [provider, setProvider] = useState(1);
  const [shortlink, setShortlink] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!url) return setError('URL tidak boleh kosong');
    try {
      const parsedUrl = new URL(url);
      if (!['http:', 'https:'].includes(parsedUrl.protocol)) throw new Error();
    } catch {
      return setError('URL tidak valid. Gunakan format http:// atau https://');
    }

    if (provider < 1 || provider > 22) return setError('Provider harus bernilai antara 1 hingga 22');

    setError('');
    setLoading(true);
    setShortlink('');

    try {
      const res = await fetch(
        `/api/tools/shortlink?url=${encodeURIComponent(url)}&provider=${provider}`,
        { method: 'GET' }
      );
      if (!res.ok) throw new Error();
      const result = await res.json();
      setShortlink(result.result);
    } catch {
      setError('Terjadi kesalahan saat membuat shortlink');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setUrl('');
    setProvider(1);
    setShortlink('');
    setError('');
  };

  return (
    <div className="container mt-5">
      <h2 className="text-center mb-4 text-primary fw-bold">Buat Shortlink</h2>

      <Card className="p-4 shadow-lg mx-auto" style={{ maxWidth: '500px', borderRadius: '12px' }}>
        <Form onSubmit={handleSubmit}>
          <Form.Group controlId="url" className="mb-3">
            <Form.Label>URL</Form.Label>
            <Form.Control
              type="url"
              placeholder="Masukkan URL"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              required
              aria-label="Input URL"
              style={{ borderRadius: '8px' }}
            />
          </Form.Group>

          <Form.Group controlId="provider" className="mb-3">
            <Form.Label>Provider</Form.Label>
            <Form.Control
              type="number"
              placeholder="Masukkan angka antara 1 hingga 22"
              value={provider}
              onChange={(e) => setProvider(Number(e.target.value))}
              min={1}
              max={22}
              required
              aria-label="Input Provider"
              style={{ borderRadius: '8px' }}
            />
            <Form.Text className="text-muted">
              Provider harus bernilai antara 1 hingga 22.
            </Form.Text>
          </Form.Group>

          <Button
            type="submit"
            variant="primary"
            disabled={loading}
            className="w-100 d-flex align-items-center justify-content-center"
            style={{ borderRadius: '8px', gap: '8px' }}
          >
            {loading ? (
              <Spinner animation="border" size="sm" />
            ) : (
              <>
                <Link45deg size={18} /> Buat Shortlink
              </>
            )}
          </Button>
        </Form>

        {shortlink && (
          <Button
            variant="secondary"
            onClick={handleReset}
            className="w-100 mt-3 d-flex align-items-center justify-content-center"
            style={{ borderRadius: '8px', gap: '8px' }}
          >
            <ArrowClockwise size={18} /> Reset
          </Button>
        )}
      </Card>

      {error && <Alert variant="danger" className="mt-3 text-center">{error}</Alert>}

      {shortlink && (
        <Card className="mt-4 shadow-lg">
          <Card.Body className="text-center">
            <h5>Shortlink Anda:</h5>
            <a
              href={shortlink}
              target="_blank"
              rel="noopener noreferrer"
              style={{ fontSize: '18px', color: '#007bff', textDecoration: 'none' }}
              aria-label="Shortlink yang dibuat"
            >
              <Link45deg size={18} /> {shortlink}
            </a>
          </Card.Body>
        </Card>
      )}
    </div>
  );
}
