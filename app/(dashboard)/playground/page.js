'use client';

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Container,
  Card,
  Table,
  Button,
  Spinner,
  Form,
  Row,
  Col,
  Badge,
  Modal,
  Tooltip,
  OverlayTrigger,
} from 'react-bootstrap';
import {
  ChevronDown,
  ChevronUp,
  Folder2,
  FileEarmarkText,
  PlusCircle,
  Trash,
} from 'react-bootstrap-icons';

const PlaygroundRoutePage = () => {
  const [url, setUrl] = useState('');
  const [method, setMethod] = useState('GET');
  const [params, setParams] = useState([]);
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState(null);
  const [responseType, setResponseType] = useState('');
  const [expandedPaths, setExpandedPaths] = useState([]);
  const [data, setData] = useState({});
  const [showModal, setShowModal] = useState(false);
  const baseUrl = `https://${process.env.DOMAIN_URL}/api`;

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await axios.get('/api/openapi');
        const paths = res.data?.paths || {};
        setData(buildHierarchy(paths)['api'] || {});
      } catch (err) {
        console.error('Failed to fetch data', err);
      }
    };
    fetchData();
  }, []);

  const buildHierarchy = (paths) => {
    const tree = {};
    Object.keys(paths).forEach((path) => {
      const parts = path.split('/').filter(Boolean);
      let current = tree;
      parts.forEach((part, idx) => {
        if (!current[part]) {
          current[part] = idx === parts.length - 1 ? { methods: paths[path] } : {};
        }
        current = current[part];
      });
    });
    return tree;
  };

  const toggleExpand = (path) => {
    setExpandedPaths((prev) =>
      prev.includes(path) ? prev.filter((p) => p !== path) : [...prev, path]
    );
  };

  const addParam = () => setParams([...params, { key: '', value: '' }]);

  const updateParam = (index, key, value) => {
    const updatedParams = [...params];
    updatedParams[index][key] = value;
    setParams(updatedParams);
  };

  const removeParam = (index) => setParams(params.filter((_, i) => i !== index));

  const handleRequest = async () => {
    setLoading(true);
    setResponse(null);
    try {
      if (!url) throw new Error('API URL is required');
      const config = {
        url,
        method,
        ...(method === 'GET'
          ? { params: Object.fromEntries(params.map((p) => [p.key, p.value])) }
          : { data: Object.fromEntries(params.map((p) => [p.key, p.value])) }),
        responseType: 'arraybuffer',
      };

      const res = await axios(config);
      const contentType = res.headers['content-type'];

      if (contentType.includes('application/json')) {
        setResponse(JSON.parse(Buffer.from(res.data).toString('utf-8')));
        setResponseType('json');
      } else if (contentType.startsWith('image/')) {
        setResponse(URL.createObjectURL(new Blob([res.data], { type: contentType })));
        setResponseType('image');
      } else {
        setResponse(Buffer.from(res.data).toString('utf-8'));
        setResponseType('text');
      }
    } catch (err) {
      console.error('Request error:', err);
      alert(`Request failed: ${err.message}`);
    } finally {
      setLoading(false);
      setShowModal(false);
    }
  };

  const handleBadgeClick = (endpoint) => {
    setUrl(`${baseUrl}${endpoint}`);
    setShowModal(true);
  };

  const renderTableRows = (node, currentPath = '') => {
    return Object.entries(node).map(([key, value]) => {
      const fullPath = `${currentPath}/${key}`;
      const isFolder = !value.methods;

      return (
        <React.Fragment key={fullPath}>
          <tr>
            <td style={{ paddingLeft: `${fullPath.split('/').length * 10}px` }}>
              {isFolder ? (
                <Folder2 className="me-2 text-warning" />
              ) : (
                <FileEarmarkText className="me-2 text-success" />
              )}
              {key}
            </td>
            <td>
              {isFolder ? (
                <Button
                  variant="info"
                  size="sm"
                  onClick={() => toggleExpand(fullPath)}
                >
                  {expandedPaths.includes(fullPath) ? <ChevronUp /> : <ChevronDown />} Open
                </Button>
              ) : (
                Object.keys(value.methods).map((method) => (
                  <OverlayTrigger
                    key={`${fullPath}-${method}`}
                    overlay={<Tooltip>{method.toUpperCase()}</Tooltip>}
                  >
                    <Badge
                      bg="primary"
                      className="me-2"
                      onClick={() => handleBadgeClick(fullPath)}
                      style={{ cursor: 'pointer' }}
                    >
                      {method.toUpperCase()}
                    </Badge>
                  </OverlayTrigger>
                ))
              )}
            </td>
          </tr>
          {expandedPaths.includes(fullPath) && isFolder && (
            <tr>
              <td colSpan="2">{renderTableRows(value, fullPath)}</td>
            </tr>
          )}
        </React.Fragment>
      );
    });
  };

  return (
    <Container fluid className="p-4">
      <Row className="g-4">
        <Col xl={6} lg={12}>
          <Card>
            <Card.Header>Route Table</Card.Header>
            <Card.Body>
              <Table striped bordered hover>
                <tbody>{renderTableRows(data)}</tbody>
              </Table>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Modal untuk memasukkan params request */}
      <Modal show={showModal} onHide={() => setShowModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>API Request</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Group className="mb-3">
            <Form.Label>API URL</Form.Label>
            <Form.Control type="text" value={url} disabled />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>Method</Form.Label>
            <Form.Select value={method} onChange={(e) => setMethod(e.target.value)}>
              <option value="GET">GET</option>
              <option value="POST">POST</option>
            </Form.Select>
          </Form.Group>
          <Form.Label>Parameters</Form.Label>
          {params.map((param, idx) => (
            <Row key={idx} className="mb-2">
              <Col xs={5}>
                <Form.Control
                  placeholder="Key"
                  value={param.key}
                  onChange={(e) => updateParam(idx, 'key', e.target.value)}
                />
              </Col>
              <Col xs={5}>
                <Form.Control
                  placeholder="Value"
                  value={param.value}
                  onChange={(e) => updateParam(idx, 'value', e.target.value)}
                />
              </Col>
              <Col xs={2} className="text-center">
                <Button variant="danger" onClick={() => removeParam(idx)}>
                  <Trash />
                </Button>
              </Col>
            </Row>
          ))}
          <Button variant="success" onClick={addParam}>
            <PlusCircle /> Add Parameter
          </Button>

          {/* Show response below the modal content */}
          {response && (
            <div className="mt-3">
              <h5>Response</h5>
              <pre>{responseType === 'json' ? JSON.stringify(response, null, 2) : response}</pre>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowModal(false)}>Close</Button>
          <Button variant="primary" onClick={handleRequest} disabled={loading}>
            {loading ? <Spinner animation="border" size="sm" /> : 'Send Request'}
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default PlaygroundRoutePage;
