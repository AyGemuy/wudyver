'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Container, Col, Row, Card, Modal, Button, Table, Spinner, Form } from 'react-bootstrap';
import { ChevronDoubleLeft, ChevronDoubleRight, Clipboard } from 'react-bootstrap-icons';

const ResponseModal = ({ show, response, onClose }) => {
  const handleCopyResponse = () => {
    navigator.clipboard.writeText(JSON.stringify(response, null, 2)).then(() => {
      alert('Response copied to clipboard!');
    }).catch(err => {
      alert('Failed to copy response!');
    });
  };

  return (
    <Modal show={show} onHide={onClose} aria-labelledby="contained-modal-title-vcenter" centered>
      <Modal.Header closeButton>
        <Modal.Title>Response</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <pre>{JSON.stringify(response, null, 2)}</pre>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="outline-primary" onClick={handleCopyResponse}>
          <Clipboard size={16} /> Copy Response
        </Button>
        <Button variant="secondary" onClick={onClose}>Close</Button>
      </Modal.Footer>
    </Modal>
  );
};

const ExecutionModal = ({ show, path, onExecute, onClose, isLoading, curlCommand }) => {
  const [method, setMethod] = useState('GET');
  const [params, setParams] = useState([{ key: '', value: '' }]);

  const handleAddParam = () => setParams([...params, { key: '', value: '' }]);
  const handleParamChange = (index, field, value) => {
    const updatedParams = [...params];
    updatedParams[index][field] = value;
    setParams(updatedParams);
  };

  const handleExecute = async () => {
    const payload = params.reduce((acc, { key, value }) => {
      if (key.trim()) acc[key.trim()] = value.trim();
      return acc;
    }, {});

    await onExecute({ path, method, payload });
  };

  const handleCopyCurlCommand = () => {
    navigator.clipboard.writeText(curlCommand).then(() => {
      alert('cURL command copied to clipboard!');
    }).catch(err => {
      alert('Failed to copy cURL command!');
    });
  };

  return (
    <Modal show={show} onHide={onClose} aria-labelledby="contained-modal-title-vcenter" centered>
      <Modal.Header closeButton>
        <Modal.Title>Execute API</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form>
          <Form.Group controlId="methodSelect">
            <Form.Label>Method</Form.Label>
            <Form.Select value={method} onChange={(e) => setMethod(e.target.value)}>
              <option value="GET">GET</option>
              <option value="POST">POST</option>
              <option value="PUT">PUT</option>
              <option value="DELETE">DELETE</option>
            </Form.Select>
          </Form.Group>
          <hr />
          <Form.Label>Parameters</Form.Label>
          {params.map((param, index) => (
            <Row key={index} className="mb-2">
              <Col md={5}>
                <Form.Control
                  type="text"
                  placeholder="Key"
                  value={param.key}
                  onChange={(e) => handleParamChange(index, 'key', e.target.value)}
                />
              </Col>
              <Col md={5}>
                <Form.Control
                  type="text"
                  placeholder="Value"
                  value={param.value}
                  onChange={(e) => handleParamChange(index, 'value', e.target.value)}
                />
              </Col>
              <Col md={2}>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => setParams(params.filter((_, i) => i !== index))}
                >
                  Remove
                </Button>
              </Col>
            </Row>
          ))}
          <Button variant="secondary" size="sm" onClick={handleAddParam}>
            + Add Parameter
          </Button>
        </Form>

        {curlCommand && (
          <div className="mt-3">
            <h5>cURL Command:</h5>
            <pre>{curlCommand}</pre>
            <Button 
              variant="outline-primary" 
              onClick={handleCopyCurlCommand} 
              className="mt-2"
            >
              <Clipboard size={16} /> Copy Command
            </Button>
          </div>
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="primary" onClick={handleExecute} disabled={isLoading}>
          {isLoading ? <Spinner animation="border" size="sm" /> : 'Execute'}
        </Button>
        <Button variant="secondary" onClick={onClose}>Close</Button>
      </Modal.Footer>
    </Modal>
  );
};

const PlaygroundPage = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedTag, setSelectedTag] = useState('All');
  const [showExecutionModal, setShowExecutionModal] = useState(false);
  const [selectedPath, setSelectedPath] = useState(null);
  const [response, setResponse] = useState(null);
  const [showResponseModal, setShowResponseModal] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [curlCommand, setCurlCommand] = useState('');

  const uniqueTags = useMemo(() => {
    return ['All', ...new Set(data.flatMap((router) => {
      const tag = router.path.split('/api/')[1]?.split('/')[0];
      return tag ? tag.toUpperCase() : '';
    }))];
  }, [data]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch('/api/openapi');
        const apiData = await res.json();
        const paths = apiData?.paths || {};
        const routers = Object.keys(paths).map((path) => ({
          path,
          name: path.split('/').pop(),
          parameters: paths[path].get?.parameters || [],
          responses: paths[path].get?.responses || {},
        }));
        setData(routers);
      } catch (error) {
        setError('Failed to fetch data');
        console.error('Error fetching API data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleRun = (path) => {
    setSelectedPath(path);
    setShowExecutionModal(true);
  };

  const handleExecute = async ({ path, method, payload }) => {
    setIsExecuting(true);
    try {
      const config = {
        method,
        headers: { 'Content-Type': 'application/json' },
        ...(method !== 'GET' && { body: JSON.stringify(payload) }),
      };
      const url = method === 'GET' && payload
        ? `https://${process.env.DOMAIN_URL}${path}?${new URLSearchParams(payload)}`
        : `https://${process.env.DOMAIN_URL}${path}`;

      // Construct cURL command
      let curl = `curl -X ${method} "${url}"`;
      if (method !== 'GET') {
        curl += ` -H "Content-Type: application/json" -d '${JSON.stringify(payload)}'`;
      }
      setCurlCommand(curl);

      const res = await fetch(url, config);
      const result = await res.json();
      setResponse(result);
      setShowExecutionModal(false);
      setShowResponseModal(true);
    } catch (error) {
      console.error('Execution failed:', error);
      setResponse({ error: 'Execution failed' });
      setShowExecutionModal(false);
      setShowResponseModal(true);
    } finally {
      setIsExecuting(false);
    }
  };

  const filteredData = useMemo(() => {
    if (selectedTag === 'All') return data;
    return data.filter((router) => {
      const tag = router.path.split('/api/')[1]?.split('/')[0];
      return tag?.toUpperCase() === selectedTag;
    });
  }, [data, selectedTag]);

  return (
    <Container>
      <h1 className="my-4">Router List</h1>
      <Row className="mb-3">
        <Col>
          <Form.Select
            value={selectedTag}
            onChange={(e) => setSelectedTag(e.target.value)}
          >
            {uniqueTags.map((tag) => (
              <option key={tag} value={tag}>{tag}</option>
            ))}
          </Form.Select>
        </Col>
      </Row>
      <Row>
        <Col>
          <Card>
            <Card.Body>
              {loading ? (
                <div className="text-center">
                  <Spinner animation="border" role="status">
                    <span className="visually-hidden">Loading...</span>
                  </Spinner>
                  <p>Loading routes...</p>
                </div>
              ) : error ? (
                <div className="text-center text-danger">
                  <p>{error}</p>
                </div>
              ) : (
                <Table striped bordered hover responsive>
                  <thead>
                    <tr>
                      <th>No</th>
                      <th>Name</th>
                      <th>Path</th>
                      <th>Params</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredData.map((router, index) => (
                      <tr key={router.path}>
                        <td>{index + 1}</td>
                        <td>{router.name}</td>
                        <td>{router.path}</td>
                        <td>
                          {router.parameters.length
                            ? router.parameters.map((param) => param.name).join(', ')
                            : '-'}
                        </td>
                        <td>
                          <Button
                            variant="success"
                            size="sm"
                            onClick={() => handleRun(router.path)}
                          >
                            RUN
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>
      <ExecutionModal
        show={showExecutionModal}
        path={selectedPath}
        onExecute={handleExecute}
        onClose={() => setShowExecutionModal(false)}
        isLoading={isExecuting}
        curlCommand={curlCommand}
      />
      <ResponseModal
        show={showResponseModal}
        response={response}
        onClose={() => setShowResponseModal(false)}
      />
    </Container>
  );
};

export default PlaygroundPage;
