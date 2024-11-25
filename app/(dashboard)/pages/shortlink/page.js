'use client';

import React, { useState } from 'react';
import { Button, Form, Alert, Spinner, Card } from 'react-bootstrap';
import { Link45deg, ArrowRightCircle } from 'react-bootstrap-icons'; // Updated icons

export default function ShortlinkPage() {
  const [url, setUrl] = useState('');
  const [provider, setProvider] = useState(1); // Default provider is 1
  const [shortlink, setShortlink] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!url) {
      setError('URL tidak boleh kosong');
      return;
    }

    if (provider < 1 || provider > 22) {
      setError('Pilih provider dengan angka antara 1 dan 22');
      return;
    }

    setError('');
    setLoading(true);
    setShortlink('');

    try {
      const res = await fetch(`/api/tools/shortlink?url=${encodeURIComponent(url)}&provider=${provider}`, {
        method: 'GET',
      });

      if (!res.ok) throw new Error('Gagal membuat shortlink');

      const result = await res.json();
      setShortlink(result.result); // Store the generated shortlink
    } catch (err) {
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
      <h2 className="text-center mb-4">Buat Shortlink</h2>

      <div className="d-flex justify-content-center">
        <Card className="p-4 shadow-lg w-75" style={{ borderRadius: '10px', backgroundColor: '#f9f9f9' }}>
          <Form onSubmit={handleSubmit}>
            <Form.Group controlId="url" className="mb-3">
              <Form.Label>URL yang ingin dipendekkan</Form.Label>
              <Form.Control
                type="url"
                placeholder="Masukkan URL"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                required
                style={{ borderRadius: '8px' }}
              />
            </Form.Group>

            <Form.Group controlId="provider" className="mb-3">
              <Form.Label>Pilih Provider (Angka 1 hingga 22)</Form.Label>
              <Form.Select
                value={provider}
                onChange={(e) => setProvider(Number(e.target.value))}
                style={{ borderRadius: '8px' }}
              >
                {[...Array(22)].map((_, index) => (
                  <option key={index} value={index + 1}>
                    Provider {index + 1}
                  </option>
                ))}
              </Form.Select>
              <Form.Text className="text-muted">
                Pilih angka antara 1 hingga 22 untuk memilih provider.
              </Form.Text>
            </Form.Group>

            <Button 
              variant="primary" 
              type="submit" 
              disabled={loading} 
              className="w-100" 
              style={{ borderRadius: '8px', padding: '10px', backgroundColor: '#007bff' }}
            >
              {loading ? <Spinner animation="border" size="sm" /> : <><Link45deg /> Buat Shortlink</>}
            </Button>
            {shortlink && (
              <Button 
                variant="secondary" 
                onClick={handleReset} 
                className="w-100 mt-3" 
                style={{ borderRadius: '8px', padding: '10px' }}
              >
                <ArrowRightCircle /> Reset
              </Button>
            )}
          </Form>
        </Card>
      </div>

      {error && <Alert variant="danger" className="mt-3 text-center">{error}</Alert>}

      {shortlink && (
        <Card className="mt-4 shadow-lg">
          <Card.Body className="text-center">
            <h5 className="mb-3">Shortlink Anda:</h5>
            <p>
              <a href={shortlink} target="_blank" rel="noopener noreferrer" style={{ fontSize: '18px', color: '#007bff' }}>
                <Link45deg /> {shortlink}
              </a>
            </p>
          </Card.Body>
        </Card>
      )}
    </div>
  );
}
