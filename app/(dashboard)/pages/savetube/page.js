'use client';

import { useState } from 'react';
import axios from 'axios';
import { Button, Form, Alert, Spinner, Container, Row, Col, Card } from 'react-bootstrap';
import { Search, CloudDownload } from 'react-bootstrap-icons';

const SavetubePage = () => {
  const [url, setUrl] = useState('');
  const [cdn, setCdn] = useState('53');
  const [type, setType] = useState('video');
  const [quality, setQuality] = useState('720');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setResult(null);

    try {
      const response = await axios.post('/api/download/savetube', { url, cdn, type, quality });
      setResult(response.data);
    } catch (err) {
      setError('Failed to fetch video details');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container className="my-5">
      <h1 className="text-center mb-4 text-primary">Savetube - Download</h1>

      <Card className="shadow-lg p-4 mb-5 rounded">
        <Card.Body>
          <Form onSubmit={handleSubmit} className="mb-4">
            <Form.Group controlId="url">
              <Form.Label className="font-weight-bold">Enter YouTube URL</Form.Label>
              <Form.Control
                type="text"
                placeholder="https://www.youtube.com/watch?v=xxxx"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                required
                className="mb-3"
              />
            </Form.Group>

            <Row>
              <Col md={4}>
                <Form.Group controlId="cdn">
                  <Form.Label className="font-weight-bold">CDN Number</Form.Label>
                  <Form.Control
                    type="number"
                    value={cdn}
                    onChange={(e) => setCdn(e.target.value)}
                    min="51"
                    max="61"
                    required
                    className="mb-3"
                  />
                </Form.Group>
              </Col>

              <Col md={4}>
                <Form.Group controlId="type">
                  <Form.Label className="font-weight-bold">Download Type</Form.Label>
                  <Form.Control
                    as="select"
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                    required
                    className="mb-3"
                  >
                    <option value="video">Video</option>
                    <option value="audio">Audio</option>
                  </Form.Control>
                </Form.Group>
              </Col>

              <Col md={4}>
                <Form.Group controlId="quality">
                  <Form.Label className="font-weight-bold">Quality</Form.Label>
                  <Form.Control
                    as="select"
                    value={quality}
                    onChange={(e) => setQuality(e.target.value)}
                    required
                    className="mb-3"
                  >
                    <option value="720">720p</option>
                    <option value="1080">1080p</option>
                    <option value="480">480p</option>
                    <option value="360">360p</option>
                  </Form.Control>
                </Form.Group>
              </Col>
            </Row>

            <Button variant="primary" type="submit" className="w-100" disabled={loading}>
              {loading ? (
                <>
                  <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" />{' '}
                  Loading...
                </>
              ) : (
                <>
                  <Search size={16} /> Fetch Video
                </>
              )}
            </Button>
          </Form>
        </Card.Body>
      </Card>

      {error && <Alert variant="danger" className="text-center">{error}</Alert>}

      {result && (
        <Card className="shadow-lg p-4 rounded">
          <Card.Body>
            <Row>
              <Col md={4}>
                <Card.Img variant="top" src={result.thumbnail} />
              </Col>
              <Col md={8}>
                <Card.Title className="font-weight-bold">{result.title}</Card.Title>
                <Card.Text>
                  <strong>Duration:</strong> {result.duration}
                </Card.Text>
                <Button variant="success" href={result.downloadUrl} target="_blank" className="d-flex align-items-center">
                  <CloudDownload size={18} className="mr-2" />
                  Download Video
                </Button>
              </Col>
            </Row>
          </Card.Body>
        </Card>
      )}
    </Container>
  );
}

export default SavetubePage;
