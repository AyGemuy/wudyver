'use client';

import React, { useState } from 'react';
import { Button, Container, Row, Col, Card, ListGroup, Form } from 'react-bootstrap';
import axios from 'axios';

const SavetikPage = () => {
  const [url, setUrl] = useState('');
  const [videoData, setVideoData] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleDownload = async () => {
    if (!url) return;
    setLoading(true);

    try {
      const response = await axios.get(`/api/download/tiktok/savetik?url=${url}`);
      setVideoData(response.data[0]);
    } catch (error) {
      console.error("Error fetching video data:", error);
      setVideoData(null);
    }

    setLoading(false);
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
            {loading ? 'Memuat...' : 'Download'}
          </Button>
        </Col>
      </Row>

      {videoData && (
        <Row className="mt-4 justify-content-center">
          <Col md={8} lg={6}>
            <Card className="shadow-lg" style={{ borderRadius: '10px' }}>
              <Card.Img variant="top" src={videoData.thumbnail} style={{ borderTopLeftRadius: '10px', borderTopRightRadius: '10px' }} />
              <Card.Body>
                <Card.Title className="text-center" style={{ fontWeight: 'bold' }}>{videoData.title}</Card.Title>
                <ListGroup variant="flush">
                  {videoData.downloadLinks.map((link, index) => (
                    <ListGroup.Item key={index} style={{ border: 'none' }}>
                      <a href={link.link} target="_blank" rel="noopener noreferrer" style={{ color: '#007bff', textDecoration: 'none', fontWeight: 'bold' }}>
                        {link.text}
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
