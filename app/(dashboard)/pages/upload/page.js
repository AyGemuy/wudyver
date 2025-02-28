'use client';

import { useState, useEffect } from 'react';
import { Row, Col, Card, Form, Button, Alert, Spinner } from 'react-bootstrap';
import axios from 'axios';
import { FormData } from 'formdata-node';

const UploadPage = () => {
  const [file, setFile] = useState(null);
  const [option, setOption] = useState('all');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [hosts, setHosts] = useState([]);

  useEffect(() => {
    const fetchHosts = async () => {
      try {
        const { data } = await axios.get('/api/tools/upload');
        setHosts(data.allHost || []);
      } catch (err) {
        setError('Gagal mengambil daftar host');
      }
    };
    fetchHosts();
  }, []);

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const handleOptionChange = (e) => {
    setOption(e.target.value);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    if (!file) {
      setError('Silakan pilih file untuk diunggah');
      setLoading(false);
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    try {
      const { data } = await axios.post(`/api/tools/upload?host=${option}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setMessage(data.result || 'Unggahan berhasil');
    } catch (err) {
      setError(err.response?.data?.error || 'Terjadi kesalahan saat mengunggah');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Row className="d-flex align-items-center justify-content-center min-vh-100">
      <Col lg={6} md={8} xs={12}>
        <Card className="shadow p-4">
          <Card.Body>
            <h4 className="mb-4 text-center">Unggah File Anda</h4>
            {error && <Alert variant="danger">{error}</Alert>}
            {message && <Alert variant="success">{message}</Alert>}
            <Form onSubmit={handleSubmit}>
              <Form.Group className="mb-3">
                <Form.Label>Pilih File</Form.Label>
                <Form.Control type="file" onChange={handleFileChange} required />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>Pilih Penyedia</Form.Label>
                <Form.Select value={option} onChange={handleOptionChange} required>
                  <option value="all">Semua Penyedia</option>
                  {hosts.map((host, index) => (
                    <option key={index} value={host}>{host}</option>
                  ))}
                </Form.Select>
              </Form.Group>
              <div className="d-grid">
                <Button variant="primary" type="submit" disabled={loading}>
                  {loading ? <Spinner animation="border" size="sm" /> : 'Unggah'}
                </Button>
              </div>
            </Form>
          </Card.Body>
        </Card>
      </Col>
    </Row>
  );
};

export default UploadPage;
