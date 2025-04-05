"use client";

import React, { useState, useEffect } from "react";
import {
  Card,
  Button,
  Spinner,
  Alert,
  Container,
  Row,
  Col,
} from "react-bootstrap";
import { PlayFill, ArrowRepeat, ExclamationTriangleFill } from "react-bootstrap-icons";

export default function HentaiPage() {
  const [randomItem, setRandomItem] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchRandomHentai = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/nsfw/image/hentai");
      const data = await response.json();
      const random = data[Math.floor(Math.random() * data.length)];
      setRandomItem(random);
    } catch (err) {
      setError("Terjadi kesalahan saat mengambil data hentai.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRandomHentai();
  }, []);

  return (
    <Container className="mt-5 text-center">
      <h2 className="mb-4 text-light">
        🎌 NSFW Hentai Random Generator 🚀
      </h2>

      {loading && (
        <div className="d-flex justify-content-center align-items-center">
          <Spinner animation="border" variant="light" className="me-2" />
          <span className="text-light">Memuat konten...</span>
        </div>
      )}

      {error && (
        <Alert variant="danger" className="d-flex align-items-center">
          <ExclamationTriangleFill className="me-2" /> {error}
        </Alert>
      )}

      {randomItem && !loading && !error && (
        <Row className="justify-content-center">
          <Col md={8}>
            <Card className="bg-dark text-light shadow-lg border border-primary">
              <Card.Header className="d-flex justify-content-between align-items-center">
                <strong>{randomItem.title}</strong>
                <Button
                  variant="outline-light"
                  size="sm"
                  onClick={fetchRandomHentai}
                  title="Muat Ulang"
                >
                  <ArrowRepeat />
                </Button>
              </Card.Header>
              <Card.Body>
                <p>
                  <strong>Kategori:</strong> {randomItem.category}
                </p>
                <p>
                  <strong>Link:</strong>{" "}
                  <a
                    href={randomItem.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary"
                  >
                    {randomItem.link}
                  </a>
                </p>
                <p>
                  <strong>Share Count:</strong> {randomItem.share_count}
                </p>
                <p>
                  <strong>Views:</strong> {randomItem.views_count}
                </p>

                <h5 className="mt-4">
                  🎥 Video Preview
                </h5>
                <div className="video-container mt-2">
                  <video controls width="100%" className="rounded shadow">
                    <source src={randomItem.video_1} type="video/mp4" />
                    Your browser does not support the video tag.
                  </video>
                </div>

                <Button
                  variant="primary"
                  href={randomItem.link}
                  target="_blank"
                  className="mt-4 w-100 d-flex align-items-center justify-content-center"
                >
                  <PlayFill className="me-2" /> Lihat di SFM Compile
                </Button>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      )}
    </Container>
  );
}
