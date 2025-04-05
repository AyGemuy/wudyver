"use client";

import React, { useState, useEffect, Fragment } from "react";
import {
  Button,
  Form,
  Card,
  Alert,
  Spinner,
  Container,
} from "react-bootstrap";
import {
  FileText,
  ArrowRight,
  Clipboard as ClipboardIcon,
  EyeFill,
} from "react-bootstrap-icons";

const QuotesPage = () => {
  const [types] = useState(["dare", "truth", "bucin", "gombalan", "renungan"]);
  const [selectedType, setSelectedType] = useState("");
  const [quote, setQuote] = useState(null);
  const [message, setMessage] = useState("");
  const [isFetching, setIsFetching] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [isEnlarged, setIsEnlarged] = useState(false); // State untuk efek preview

  useEffect(() => {
    setIsClient(true);
  }, []);

  const handleFetchQuote = async () => {
    if (!selectedType) {
      setMessage("Silakan pilih tipe dulu!");
      return;
    }

    setIsFetching(true);
    setMessage("");
    setQuote(null);

    try {
      const res = await fetch(`/api/quotes/by?type=${selectedType}`);

      if (!res.ok) throw new Error("Gagal mengambil kutipan");

      const result = await res.json();
      setQuote(result.quote);
    } catch (error) {
      setMessage("Gagal mengambil kutipan, coba lagi.");
    } finally {
      setIsFetching(false);
    }
  };

  const handleCopyToClipboard = () => {
    if (quote) navigator.clipboard.writeText(quote);
  };

  return (
    <Fragment>
      {isClient && (
        <Container className="mt-5 d-flex flex-column align-items-center">
          <h2 className="text-center fw-bold">Dapatkan Kutipan</h2>
          <div className="w-100 mt-4">
            {/* Pilihan Tipe Kutipan */}
            <Form.Group className="mb-3">
              <Form.Label className="fw-semibold">Pilih Tipe</Form.Label>
              <Form.Select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
              >
                <option value="">-- Pilih --</option>
                {types.map((type, idx) => (
                  <option key={idx} value={type}>
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </option>
                ))}
              </Form.Select>
            </Form.Group>

            {/* Tombol Ambil Kutipan */}
            <Button
              variant="primary"
              onClick={handleFetchQuote}
              disabled={isFetching}
              className="w-100"
            >
              {isFetching ? <Spinner animation="border" size="sm" /> : "Dapatkan Kutipan"}
            </Button>
          </div>

          {/* Pesan Error */}
          {message && <Alert variant="danger" className="mt-3 w-100">{message}</Alert>}

          {/* Card untuk Menampilkan Kutipan */}
          {quote && (
            <Card className={`mt-4 w-100 shadow-sm border-0 p-3 ${isEnlarged ? "p-4" : ""}`} style={{ borderRadius: "10px", transition: "all 0.3s" }}>
              <Card.Body>
                <Card.Title className="d-flex align-items-center fw-bold">
                  <FileText className="me-2 text-primary" size={20} />
                  Kutipan
                </Card.Title>
                <Card.Text className={`fs-5 fst-italic text-muted ${isEnlarged ? "fs-4" : ""}`}>
                  &quot;{quote}&quot;
                </Card.Text>

                {/* Tombol Aksi */}
                <div className="d-flex flex-wrap gap-2 mt-3">
                  <Button variant="outline-success" onClick={handleCopyToClipboard}>
                    <ClipboardIcon size={18} className="me-2" />
                    Salin
                  </Button>
                  <Button
                    variant="outline-primary"
                    onClick={() => setIsEnlarged(!isEnlarged)}
                  >
                    <EyeFill size={18} className="me-2" />
                    {isEnlarged ? "Kecilkan" : "Perbesar"}
                  </Button>
                  <Button variant="outline-secondary" onClick={handleFetchQuote}>
                    <ArrowRight size={18} className="me-2" />
                    Berikutnya
                  </Button>
                </div>
              </Card.Body>
            </Card>
          )}
        </Container>
      )}
    </Fragment>
  );
};

export default QuotesPage;
