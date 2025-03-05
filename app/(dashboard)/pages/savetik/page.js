'use client';

import React, { useState } from 'react';
import { Button, Container, Row, Col, Card, ListGroup, Form, Alert, Spinner } from 'react-bootstrap';
import axios from 'axios';

const SavetikPage = () => {
  const [url, setUrl] = useState('');
  const [videoData, setVideoData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleDownload = async () => {
    if (!url.trim()) {
      setError('URL tidak boleh kosong!');
      return;
    }

    setLoading(true);
    setError('');
    setVideoData(null);

    try {
      const response = await axios.get(`/api/download/tiktok/v6?url=${url.trim()}`);
      if (response.data?.length > 0) {
        setVideoData(response.data[0]);
      } else {
        throw new Error('Video tidak ditemukan atau URL tidak valid.');
      }
    } catch (err) {
      setError(err.message || 'Terjadi kesalahan saat memproses permintaan.');
      setVideoData(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container className="mt-5">
      <h1 className="text-center mb-4" style={{ color: '#007bff' }}>TikTok Video Downloader</h1>

      <Row className="justify-content-center mb-4">
        <Col md={8} lg={6}>
          <Form.Control
            type="text"
            placeholder="Masukkan URL TikTok"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            style={{ borderRadius: '8px', padding: '10px' }}
          />
        </Col>
        <Col md={4}>
          <Button
            onClick={handleDownload}
            disabled={loading}
            variant="primary"
            className="w-100 mt-3 mt-md-0"
            style={{ borderRadius: '8px', padding: '12px 20px', fontWeight: 'bold' }}
          >
            {loading ? <Spinner animation="border" size="sm" /> : 'Download'}
          </Button>
        </Col>
      </Row>

      {error && (
        <Row className="justify-content-center">
          <Col md={8} lg={6}>
            <Alert variant="danger" className="text-center">{error}</Alert>
          </Col>
        </Row>
      )}

      {videoData && (
        <Row className="mt-4 justify-content-center">
          <Col md={8} lg={6}>
            <Card className="shadow-lg" style={{ borderRadius: '12px', overflow: 'hidden' }}>
              <Card.Img
                variant="top"
                src={videoData.thumbnail}
                alt="Thumbnail"
                style={{ borderTopLeftRadius: '12px', borderTopRightRadius: '12px' }}
              />
              <Card.Body>
                <Card.Title className="text-center" style={{ fontWeight: 'bold' }}>
                  {videoData.title || 'Video TikTok'}
                </Card.Title>
                <ListGroup variant="flush">
                  {videoData.downloadLinks?.map((link, index) => (
                    <ListGroup.Item key={index} style={{ border: 'none' }}>
                      <a
                        href={link.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: '#007bff', textDecoration: 'none', fontWeight: 'bold' }}
                      >
                        {link.text || `Link ${index + 1}`}
                      </a>
                    </ListGroup.Item>
                  ))}
                </ListGroup>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      )}
    </Container>
  );
};

export default SavetikPage;
