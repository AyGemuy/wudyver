// pages/cekartinama.js
'use client';

import { useState } from 'react';
import { Container, Row, Col, Button, Form, Spinner, Alert, Card } from 'react-bootstrap';
import { Search } from 'react-bootstrap-icons';

export default function CekartinamaPage() {
  const [nama, setNama] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState('');
  const [error, setError] = useState('');

  const handleSearch = async () => {
    setLoading(true);
    setError('');
    setResult('');
    
    try {
      const res = await fetch(`/api/other/artinama?nama=${encodeURIComponent(nama)}`);
      const data = await res.json();

      if (res.ok) {
        setResult(data.result);
      } else {
        setError(data.error || 'Something went wrong');
      }
    } catch (err) {
      setError('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container className="mt-5">
      <Row className="text-center">
        <Col md={{ span: 6, offset: 3 }}>
          <h1>Cek Arti Nama</h1>
          <Form.Control
            type="text"
            placeholder="Masukkan nama"
            value={nama}
            onChange={(e) => setNama(e.target.value)}
            className="mb-3"
          />
          <Button variant="primary" onClick={handleSearch} disabled={loading} style={{ width: '100%', padding: '10px' }}>
            {loading ? (
              <>
                <Spinner animation="border" size="sm" />{' '}
                Sedang memuat...
              </>
            ) : (
              <>
                <Search size={18} /> Cari Arti
              </>
            )}
          </Button>
        </Col>
      </Row>

      <Row className="mt-4">
        <Col md={{ span: 6, offset: 3 }}>
          {error && (
            <Alert variant="danger">
              <strong>Error:</strong> {error}
            </Alert>
          )}
          {result && (
            <Card className="mt-3">
              <Card.Body>
                <Card.Title>Arti Nama</Card.Title>
                <Card.Text>{result}</Card.Text>
              </Card.Body>
            </Card>
          )}
        </Col>
      </Row>
    </Container>
  );
}
