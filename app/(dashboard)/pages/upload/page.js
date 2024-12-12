'use client';

import { useState } from 'react';
import { Row, Col, Card, Form, Button, Alert } from 'react-bootstrap';

const UploadPage = () => {
  const [file, setFile] = useState(null);
  const [option, setOption] = useState('all');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

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
      setError('Please select a file to upload');
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(`/api/tools/upload?option=${option}`, {
        method: 'POST',
        body: file,
      });

      const data = await res.json();

      if (res.ok) {
        setMessage(data.result || 'Upload successful');
      } else {
        setError(data.error || 'An error occurred during upload');
      }
    } catch (err) {
      setError(`Upload failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Row className="align-items-center justify-content-center g-0 min-vh-100">
      <Col xxl={4} lg={6} md={8} xs={12} className="py-8 py-xl-0">
        <Card className="smooth-shadow-md">
          <Card.Body className="p-6">
            <h4 className="mb-4">Upload your file</h4>
            <Form onSubmit={handleSubmit}>
              <Form.Group className="mb-3" controlId="file">
                <Form.Label>Select File</Form.Label>
                <Form.Control type="file" onChange={handleFileChange} required />
              </Form.Group>
              <Form.Group className="mb-3" controlId="option">
                <Form.Label>Select Provider</Form.Label>
                <Form.Control
                  as="select"
                  value={option}
                  onChange={handleOptionChange}
                  required
                >
                  <option value="all">All Providers</option>
                  {/* Dynamically generating 35 provider options */}
                  {[...Array(35).keys()].map((i) => (
                    <option key={i} value={i + 1}>
                      Provider {i + 1}
                    </option>
                  ))}
                </Form.Control>
              </Form.Group>
              <div className="d-grid">
                <Button variant="primary" type="submit" disabled={loading}>
                  {loading ? 'Uploading...' : 'Upload'}
                </Button>
              </div>
              {error && <Alert variant="danger" className="mt-2">{error}</Alert>}
              {message && <Alert variant="success" className="mt-2">{message}</Alert>}
            </Form>
          </Card.Body>
        </Card>
      </Col>
    </Row>
  );
};

export default UploadPage;
