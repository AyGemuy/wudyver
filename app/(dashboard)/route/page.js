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
  Modal,
  Form,
  Row,
  Col,
  Badge,
  Tooltip,
  OverlayTrigger,
} from 'react-bootstrap';
import { ChevronDown, ChevronUp, Folder2, FileEarmarkText, Clipboard, CodeSlash } from 'react-bootstrap-icons';

const RoutePage = () => {
  const [data, setData] = useState({});
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [expandedPaths, setExpandedPaths] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState(null);
  const [selectedPath, setSelectedPath] = useState('');
  const [parameters, setParameters] = useState([]);
  const [response, setResponse] = useState(null);
  const [isBuffer, setIsBuffer] = useState(false);
  const baseUrl = `https://${process.env.DOMAIN_URL}/api`;

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await axios.get('/api/openapi');
        const paths = res.data?.paths || {};
        const structuredData = buildHierarchy(paths);
        setData(structuredData['api'] || {});
      } catch (err) {
        console.error('Failed to fetch data', err);
      } finally {
        setLoading(false);
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

  const handleOpenModal = (method, path) => {
    setSelectedMethod(method);
    setSelectedPath(`${baseUrl}${path}`);
    setParameters([]);
    setResponse(null);
    setIsBuffer(false);
    setShowModal(true);
  };

  const handleCloseModal = () => setShowModal(false);

  const addParameter = () => {
    setParameters((prev) => [...prev, { key: '', value: '' }]);
  };

  const handleRunAction = async () => {
    setRunning(true);
    try {
      const params = parameters.reduce((acc, param) => {
        if (param.key && param.value) acc[param.key] = param.value;
        return acc;
      }, {});

      const config = {
        url: selectedPath,
        method: selectedMethod,
        ...(selectedMethod === 'get' && Object.keys(params).length
          ? { params }
          : selectedMethod === 'post' && Object.keys(params).length
          ? { data: params }
          : {}),
        responseType: 'arraybuffer',
      };

      const res = await axios(config);

      const contentType = res.headers['content-type'];
      if (contentType && contentType.startsWith('image/')) {
        const blob = new Blob([res.data], { type: contentType });
        const imageUrl = URL.createObjectURL(blob);
        setResponse(imageUrl);
        setIsBuffer(true);
      } else {
        setResponse(JSON.parse(Buffer.from(res.data).toString('utf-8')));
        setIsBuffer(false);
      }
    } catch (err) {
      console.error('Error during request:', err);
      alert('Request failed. Check console for details.');
    } finally {
      setRunning(false);
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
                  className="w-100"
                >
                  {expandedPaths.includes(fullPath) ? <ChevronUp /> : <ChevronDown />} Open
                </Button>
              ) : (
                Object.keys(value.methods).map((method) => (
                  <OverlayTrigger
                    key={`${fullPath}-${method}`}
                    placement="top"
                    overlay={<Tooltip id={`tooltip-${method}`}>{method.toUpperCase()}</Tooltip>}
                  >
                    <Badge
                      bg="primary"
                      className="me-2"
                      onClick={() => handleOpenModal(method, fullPath)}
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

  const generateCurlCommand = () => {
    const params = parameters.reduce((acc, param) => {
      if (param.key && param.value) acc[param.key] = param.value;
      return acc;
    }, {});

    let curlCommand = `curl -X ${selectedMethod.toUpperCase()} "${selectedPath}"`;

    if (selectedMethod === 'get' && Object.keys(params).length) {
      curlCommand += `?${new URLSearchParams(params).toString()}`;
    } else if (selectedMethod === 'post' && Object.keys(params).length) {
      curlCommand += ` -d '${JSON.stringify(params)}'`;
    }

    return curlCommand;
  };

  const handleCopyResponse = () => {
    if (isBuffer && response) {
      navigator.clipboard.writeText(response).then(() => {
        alert('Gambar URL telah disalin!');
      });
    } else if (response) {
      navigator.clipboard.writeText(JSON.stringify(response, null, 2)).then(() => {
        alert('Respons JSON telah disalin!');
      });
    }
  };

  const handleCopyCurlCommand = () => {
    const curlCommand = generateCurlCommand();
    navigator.clipboard.writeText(curlCommand).then(() => {
      alert('Perintah curl telah disalin!');
    });
  };

  return (
    <Container fluid className="p-5">
      <h1 className="my-4 text-center text-primary">API Route Explorer</h1>
      {loading ? (
        <div className="text-center">
          <Spinner animation="border" role="status" />
          <p>Loading...</p>
        </div>
      ) : (
        <Card className="shadow-sm hover-card mb-4">
          <Card.Header className="bg-primary text-white text-center">
            Available API Routes
          </Card.Header>
          <Card.Body>
            <Table bordered responsive="sm" className="table-striped">
              <thead>
                <tr>
                  <th>Route</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>{renderTableRows(data)}</tbody>
            </Table>
          </Card.Body>
        </Card>
      )}

      <Modal show={showModal} onHide={handleCloseModal} centered size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Run API Action</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>Path</Form.Label>
              <Form.Control value={selectedPath} readOnly />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Method</Form.Label>
              <Form.Control value={selectedMethod?.toUpperCase()} readOnly />
            </Form.Group>
            <Form.Group>
              <Form.Label>Parameters</Form.Label>
              {parameters.map((param, idx) => (
                <Row key={idx} className="mb-2">
                  <Col xs={12} sm={6}>
                    <Form.Control
                      placeholder="Key"
                      value={param.key}
                      onChange={(e) => {
                        const newParams = [...parameters];
                        newParams[idx].key = e.target.value;
                        setParameters(newParams);
                      }}
                    />
                  </Col>
                  <Col xs={12} sm={6}>
                    <Form.Control
                      placeholder="Value"
                      value={param.value}
                      onChange={(e) => {
                        const newParams = [...parameters];
                        newParams[idx].value = e.target.value;
                        setParameters(newParams);
                      }}
                    />
                  </Col>
                  <Col xs="auto">
                    <Button
                      variant="danger"
                      onClick={() => {
                        setParameters((prev) => prev.filter((_, index) => index !== idx));
                      }}
                    >
                      &times;
                    </Button>
                  </Col>
                </Row>
              ))}
              <Button
                variant="success"
                onClick={addParameter}
                className="w-100 mb-3"
              >
                + Add Parameter
              </Button>
            </Form.Group>
          </Form>
          {isBuffer ? (
            <div className="text-center mt-4">
              <Image src={response} alt="API Response" width={300} height={300} />
            </div>
          ) : response ? (
            <pre className="bg-light p-3 mt-4">{JSON.stringify(response, null, 2)}</pre>
          ) : null}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleCloseModal}>
            Close
          </Button>
          <Button variant="primary" onClick={handleRunAction} disabled={running}>
            {running ? <Spinner size="sm" animation="border" className="me-2" /> : null}
            Run
          </Button>
        </Modal.Footer>
      </Modal>

      <div className="d-flex justify-content-start mt-4">
        <Button variant="info" onClick={handleCopyResponse} className="me-2">
          <Clipboard className="me-2" />
          Salin Respons
        </Button>
        <Button variant="dark" onClick={handleCopyCurlCommand}>
          <CodeSlash className="me-2" />
          Salin Curl Command
        </Button>
      </div>
    </Container>
  );
};

export default RoutePage;
