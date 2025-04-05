'use client';

import { useState } from 'react';
import axios from 'axios';
import { Container, Form, Button, Card, Row, Col, Modal, Alert } from 'react-bootstrap';
import { Save, Trash, List, FileText, X } from 'react-bootstrap-icons';

export default function PastePage() {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [key, setKey] = useState('');
  const [syntax, setSyntax] = useState('text');
  const [expireIn, setExpireIn] = useState('');
  const [message, setMessage] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [pasteList, setPasteList] = useState([]);

  const apiRequest = async (params) => {
    try {
      const response = await axios.post('/api/tools/paste/v1', params, {
        headers: { 'Content-Type': 'application/json' },
      });
      return response.data;
    } catch (error) {
      setMessage(`❌ Error: ${error.response?.data?.error || error.message}`);
      return null;
    }
  };

  const handleCreatePaste = async () => {
    if (!title || !content) return setMessage('❌ Title and content are required');
    
    const data = await apiRequest({
      action: 'create',
      title,
      content,
      syntax,
      expireIn: expireIn ? Number(expireIn) : null
    });

    if (data) {
      setMessage(`✅ Paste created! Key: ${data.key}, Expires: ${data.expiresAt || 'Never'}`);
      handleClearForm();
      handleListPastes();
    }
  };

  const handleGetPaste = async () => {
    if (!key) return setMessage('❌ Paste key is required');
    
    const data = await apiRequest({ action: 'get', key });

    if (data) {
      setTitle(data.title);
      setContent(data.content);
      setSyntax(data.syntax);
      setMessage(`✅ Paste fetched successfully! Expires: ${data.expiresAt || 'Never'}`);
      setShowModal(true);
    } else {
      setMessage('❌ Paste not found');
    }
  };

  const handleListPastes = async () => {
    const data = await apiRequest({ action: 'list' });
    if (Array.isArray(data)) {
      setPasteList(data);
      setMessage('✅ Pastes listed successfully!');
    } else {
      setMessage('❌ Failed to fetch pastes');
    }
  };

  const handleDeletePaste = async () => {
    if (!key) return setMessage('❌ Paste key is required');
    
    const data = await apiRequest({ action: 'delete', key });

    if (data) {
      setMessage(`✅ Paste with key ${key} has been deleted.`);
      setKey('');
      handleListPastes();
    }
  };

  const handleClearForm = () => {
    setTitle('');
    setContent('');
    setKey('');
    setSyntax('text');
    setExpireIn('');
    setMessage('');
  };

  return (
    <Container className="min-vh-100 d-flex flex-column align-items-center justify-content-center text-dark bg-white p-4">
      <h2 className="mb-4 text-center fw-bold">⚡ Paste Manager</h2>

      <Row className="w-100" style={{ maxWidth: '800px' }}>
        {/* Create Paste */}
        <Col md={6}>
          <Card className="bg-light text-dark mb-3">
            <Card.Body>
              <Card.Title>Create a New Paste</Card.Title>
              <Form.Control 
                type="text" placeholder="Title" className="mb-2" 
                value={title} onChange={(e) => setTitle(e.target.value)} 
              />
              <Form.Control 
                as="textarea" rows={3} placeholder="Content" className="mb-2" 
                value={content} onChange={(e) => setContent(e.target.value)} 
              />
              <Row>
                <Col>
                  <Form.Select value={syntax} onChange={(e) => setSyntax(e.target.value)} className="mb-2">
                    <option value="text">Text</option>
                    <option value="javascript">JavaScript</option>
                    <option value="python">Python</option>
                  </Form.Select>
                </Col>
                <Col>
                  <Form.Control 
                    type="number" placeholder="Expire (sec)" className="mb-2"
                    value={expireIn} onChange={(e) => setExpireIn(e.target.value)} 
                  />
                </Col>
              </Row>
              <Button variant="primary" className="w-100 d-flex align-items-center justify-content-center" onClick={handleCreatePaste}>
                <Save className="me-2" /> Save Paste
              </Button>
            </Card.Body>
          </Card>
        </Col>

        {/* Manage Pastes */}
        <Col md={6}>
          <Card className="bg-light text-dark">
            <Card.Body>
              <Card.Title>Manage Pastes</Card.Title>
              <Form.Control 
                type="text" placeholder="Paste Key" className="mb-2"
                value={key} onChange={(e) => setKey(e.target.value)} 
              />
              <Row className="mb-2">
                <Col>
                  <Button variant="success" className="w-100 d-flex align-items-center justify-content-center" onClick={handleGetPaste}>
                    <FileText className="me-2" /> Fetch
                  </Button>
                </Col>
                <Col>
                  <Button variant="danger" className="w-100 d-flex align-items-center justify-content-center" onClick={handleDeletePaste}>
                    <Trash className="me-2" /> Delete
                  </Button>
                </Col>
              </Row>
              <Button variant="warning" className="w-100 d-flex align-items-center justify-content-center" onClick={handleListPastes}>
                <List className="me-2" /> List Pastes
              </Button>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Message */}
      {message && (
        <Alert variant="primary" className="mt-3 w-100 text-center" style={{ maxWidth: '800px' }}>
          {message}
        </Alert>
      )}

      {/* List of Pastes */}
      {pasteList.length > 0 && (
        <Card className="mt-3 w-100" style={{ maxWidth: '800px' }}>
          <Card.Body>
            <Card.Title>📄 Saved Pastes</Card.Title>
            <ul className="list-unstyled">
              {pasteList.map((paste) => (
                <li key={paste.key} className="border-bottom py-2">
                  <strong>{paste.title}</strong> ({paste.syntax})  
                  <br />
                  Key: {paste.key || 'nothing'}
                  <br />
                  Expires: {paste.expiresAt || 'Never'}
                </li>
              ))}
            </ul>
          </Card.Body>
        </Card>
      )}

      {/* Modal for showing fetched paste */}
      <Modal show={showModal} onHide={() => setShowModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>{title}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <pre className="bg-light text-dark p-3 rounded">{content}</pre>
          <p><strong>Syntax:</strong> {syntax}</p>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowModal(false)}>
            <X className="me-2" /> Close
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
}
