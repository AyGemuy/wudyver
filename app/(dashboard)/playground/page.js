'use client';

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Image from 'next/image';
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
        const structuredData = buildHierarchy(paths);
        setData(structuredData['api'] || {});
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

  const removeParam = (index) => {
    const updatedParams = params.filter((_, i) => i !== index);
    setParams(updatedParams);
  };

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
    }
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
                      onClick={() => setUrl(`${baseUrl}${fullPath}`)}
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

  const renderResponse = () => {
    if (!response) return null;
    switch (responseType) {
      case 'json':
        return (
          <pre className="bg-light p-3 rounded overflow-auto">
            {JSON.stringify(response, null, 2)}
          </pre>
        );
      case 'image':
        return <img src={response} alt="Response" className="img-fluid" />;
      default:
        return (
          <pre className="bg-light p-3 rounded overflow-auto">{response}</pre>
        );
    }
  };

  return (
    <Container fluid className="p-4">
      <Row className="g-4">
        <Col xl={6} lg={12}>
          <Card className="h-100">
            <Card.Header>Route Table</Card.Header>
            <Card.Body>
              <div className="table-responsive">
                <Table striped bordered hover>
                  <tbody>{renderTableRows(data)}</tbody>
                </Table>
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col xl={6} lg={12}>
          <Card className="h-100">
            <Card.Header>Playground</Card.Header>
            <Card.Body>
              <Form.Group controlId="url" className="mb-3">
                <Form.Label>API URL</Form.Label>
                <Form.Control
                  type="text"
                  placeholder="Enter API URL"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                />
              </Form.Group>
              <Form.Group controlId="method" className="mb-3">
                <Form.Label>Method</Form.Label>
                <Form.Select value={method} onChange={(e) => setMethod(e.target.value)}>
                  <option value="GET">GET</option>
                  <option value="POST">POST</option>
                </Form.Select>
              </Form.Group>
              <Form.Group>
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
              </Form.Group>
              <Button variant="primary" onClick={handleRequest} disabled={loading || !url}>
                {loading ? <Spinner animation="border" size="sm" /> : 'Send Request'}
              </Button>
              {response && <div className="mt-4">{renderResponse()}</div>}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Modal for API Call */}
      <Modal show={showModal} onHide={() => setShowModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>API Call</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Group controlId="modalUrl" className="mb-3">
            <Form.Label>API URL</Form.Label>
            <Form.Control
              type="text"
              placeholder="Enter API URL"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
          </Form.Group>
          {/* Add other modal fields as needed */}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowModal(false)}>
            Close
          </Button>
          <Button variant="primary" onClick={handleRequest}>
            Send Request
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default PlaygroundRoutePage;
