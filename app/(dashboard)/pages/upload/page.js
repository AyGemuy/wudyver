"use client";

import { useState, useEffect } from "react";
import { Row, Col, Card, Form, Button, Alert, Spinner } from "react-bootstrap";
import axios from "axios";

const UploadPage = () => {
  const [file, setFile] = useState(null);
  const [provider, setProvider] = useState("Catbox");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [hosts, setHosts] = useState([]);

  useEffect(() => {
    const fetchHosts = async () => {
      try {
        const { data } = await axios.get("/api/tools/upload");
        setHosts(data.hosts || []);
      } catch {
        setError("Gagal mengambil daftar penyedia.");
      }
    };
    fetchHosts();
  }, []);

  const handleFileChange = (e) => setFile(e.target.files[0]);
  const handleProviderChange = (e) => setProvider(e.target.value);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    if (!file) {
      setError("Silakan pilih file untuk diunggah.");
      setLoading(false);
      return;
    }

    try {
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer).toString("base64");

      const { data } = await axios.post(`/api/tools/upload?host=${provider}`, { file: buffer }, {
        headers: { "Content-Type": "application/json" }
      });

      setMessage(data.result || "Unggahan berhasil.");
    } catch (err) {
      setError(err.response?.data?.error || "Terjadi kesalahan saat mengunggah.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Row className="d-flex align-items-center justify-content-center min-vh-100">
      <Col lg={6}>
        <Card className="shadow p-4">
          <Card.Body>
            <h4 className="mb-4 text-center">Unggah File Anda</h4>
            {error && <Alert variant="danger">{error}</Alert>}
            {message && <Alert variant="success">{message}</Alert>}
            <Form onSubmit={handleSubmit}>
              <Form.Control type="file" onChange={handleFileChange} required />
              <Form.Select value={provider} onChange={handleProviderChange}>
                {hosts.map((host) => <option key={host} value={host}>{host}</option>)}
              </Form.Select>
              <Button variant="primary" type="submit" disabled={loading}>
                {loading ? <Spinner animation="border" size="sm" /> : "Unggah"}
              </Button>
            </Form>
          </Card.Body>
        </Card>
      </Col>
    </Row>
  );
};

export default UploadPage;
