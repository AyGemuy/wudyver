// pages/random-hentai.js
'use client';

import React, { useState, useEffect } from 'react';
import { Card, Button, Spinner, Alert } from 'react-bootstrap';

export default function HentaiPage() {
  const [randomItem, setRandomItem] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch data random hentai saat komponen dimuat
  useEffect(() => {
    const fetchRandomHentai = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch('/api/nsfw/image/hentai');
        const data = await response.json();
        const random = data[Math.floor(Math.random() * data.length)];
        setRandomItem(random);
      } catch (err) {
        setError('Terjadi kesalahan saat mengambil data hentai.');
      } finally {
        setLoading(false);
      }
    };

    fetchRandomHentai();
  }, []);

  if (loading) {
    return (
      <div className="container mt-4">
        <Spinner animation="border" variant="primary" />
        <span className="ml-2">Memuat...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mt-4">
        <Alert variant="danger">{error}</Alert>
      </div>
    );
  }

  if (!randomItem) {
    return null; // Jika data belum ada, jangan tampilkan apa-apa
  }

  const { title, link, category, share_count, views_count, video_1, video_2 } = randomItem;

  return (
    <div className="container mt-4">
      <h2>{title}</h2>
      <Card className="mt-4">
        <Card.Header>Informasi</Card.Header>
        <Card.Body>
          <p><strong>Kategori:</strong> {category}</p>
          <p><strong>Link:</strong> <a href={link} target="_blank" rel="noopener noreferrer">{link}</a></p>
          <p><strong>Share Count:</strong> {share_count}</p>
          <p><strong>Views Count:</strong> {views_count}</p>

          <h5>Video:</h5>
          <video controls width="100%">
            <source src={video_1} type="video/mp4" />
            Your browser does not support the video tag.
          </video>

          <Button variant="link" className="mt-3" href={link} target="_blank">
            Lihat di SFM Compile
          </Button>
        </Card.Body>
      </Card>
    </div>
  );
}
