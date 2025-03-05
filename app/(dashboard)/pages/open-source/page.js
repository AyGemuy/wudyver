'use client';

import React, { useState, useEffect } from 'react';
import { Button, Container, Form, Alert, Card, Row, Col, Modal, Spinner, InputGroup } from 'react-bootstrap';
import { Clipboard, Search } from 'react-bootstrap-icons';

const SourcePage = () => {
  const [search, setSearch] = useState("");
  const [routes, setRoutes] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [rawContent, setRawContent] = useState(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const fetchRoutes = async () => {
    try {
      const res = await fetch("/api/routes");
      if (!res.ok) throw new Error('Network response was not ok');
      const data = await res.json();
      
      // Menambahkan tags berdasarkan path
      const routesWithTags = data.map(route => {
        const pathSegments = route.path.split('/').filter(Boolean); // Menghapus segmen kosong
        const tags = pathSegments.slice(2); // Mengambil segmen setelah '/api/'
        return { ...route, tags }; // Menambahkan tags ke objek route
      });

      setRoutes(routesWithTags);
      setFiltered(routesWithTags); // Set filtered to initial routes
    } catch (error) {
      console.error("Error fetching routes:", error);
    }
  };

  // Memanggil fetchRoutes saat komponen di-render
  useEffect(() => {
    fetchRoutes();
  }, []);

  const handleSearch = (e) => {
    const value = e.target.value;
    setSearch(value);
    setFiltered(
      routes.filter(route =>
        route.tags.some(tag => tag.toLowerCase().includes(value.toLowerCase()))
      )
    );
  };

  const getRawUrl = (path) => {
    return `https://raw.githubusercontent.com/AyGemuy/wudyver/refs/heads/master/pages/api/${path.replace("/api/", "")}.js`;
  };

  const fetchRawFile = async (url) => {
    setLoading(true);
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error('Network response was not ok');
      const data = await res.text();
      setRawContent(data);
      setShowModal(true);
    } catch (err) {
      setRawContent("Gagal mengambil file.");
      setShowModal(true);
    }
    setLoading(false);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(rawContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Container className="mt-4">
      <div className="text-center mb-4">
        <h2>GitHub Raw Link Generator</h2>
        <InputGroup className="mb-3 w-100 mx-auto">
          <Form.Control
            type="text"
            placeholder="Cari berdasarkan tag..."
            value={search}
            onChange={handleSearch}
          />
          <Button variant="outline-secondary" onClick={() => handleSearch({ target: { value: search } })}>
            <Search />
          </Button>
        </InputGroup>
      </div>

      {filtered.length === 0 ? (
        <Alert variant="info" className="text-center">Tidak ada hasil ditemukan.</Alert>
      ) : (
        <Row xs={1} sm={2} md={3} lg={4} className="g-4">
          {filtered.map((route, index) => (
            <Col key={index}>
              <Card className="h-100">
                <Card.Body>
                  <Card.Title>{route.name}</Card.Title>
                  <Card.Text>
                    Tags: {route.tags.join(", ")}
                  </Card.Text>
                  <Button variant="primary" onClick={() => fetchRawFile(getRawUrl(route.path))}>
                    Lihat Code
                  </Button>
                </Card.Body>
              </Card>
            </Col>
          ))}
        </Row>
      )}

      <Modal show={showModal} onHide={() => setShowModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Isi File</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {loading ? (
            <Spinner animation="border" />
          ) : (
            <>
              <pre className="bg-light p-3" style={{ whiteSpace: "pre-wrap" }}>{rawContent}</pre>
              <Button variant="success" onClick={copyToClipboard} className="mt-3">
                <Clipboard className="me-2" />
                {copied ? "Tersalin!" : "Salin ke Clipboard"}
              </Button>
            </>
          )}
        </Modal.Body>
      </Modal>
    </Container>
  );
};

export default SourcePage;