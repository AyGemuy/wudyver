'use client';

import { useEffect, useState } from 'react';
import { Accordion, Container, Button, Spinner, Alert, Form, Row, Col, Modal } from 'react-bootstrap';
import axios from 'axios';

const EndpointPage = () => {
    const [routes, setRoutes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [executing, setExecuting] = useState(null);
    const [params, setParams] = useState({});
    const [showModal, setShowModal] = useState(false);
    const [modalResponse, setModalResponse] = useState(null);
    const [selectedPath, setSelectedPath] = useState('');
    const [baseApiUrl, setBaseApiUrl] = useState(`https://${process.env.DOMAIN_URL}`); // New state for base API URL

    useEffect(() => {
        const fetchRoutes = async () => {
            try {
                const { data } = await axios.get('/api/routes');
                setRoutes(data);
            } catch (error) {
                console.error('Error fetching routes:', error);
                setError('Failed to load API routes. Please try again later.');
            } finally {
                setLoading(false);
            }
        };

        fetchRoutes();
    }, []);

    const handleExecute = async (path) => {
        setExecuting(path);
        try {
            const queryParams = params[path] || {};
            const fullPath = `${baseApiUrl}${path}`; // Combine base URL with path
            const { data } = await axios.get(fullPath, { params: queryParams });
            setModalResponse(data);
            setSelectedPath(fullPath);
            setShowModal(true);
        } catch (error) {
            alert(`Error executing ${path}: ${error.message}`);
        } finally {
            setExecuting(null);
        }
    };

    const handleCopyCurl = (path) => {
        const queryParams = params[path] || {};
        const queryStr = Object.entries(queryParams)
            .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
            .join('&');
        const fullPath = `${baseApiUrl}${path}`; // Combine base URL with path
        const curlCommand = `curl -X GET "${fullPath}?${queryStr}"`;
        navigator.clipboard
            .writeText(curlCommand)
            .then(() => alert('cURL command copied to clipboard!'))
            .catch(() => alert('Failed to copy cURL command.'));
    };

    const handleAddParam = (path) => {
        setParams((prev) => ({
            ...prev,
            [path]: [
                ...(prev[path] || []),
                { key: '', value: '' }, // Add a new parameter object
            ],
        }));
    };

    const handleParamChange = (path, index, field, value) => {
        setParams((prev) => {
            const updatedParams = [...(prev[path] || [])];
            updatedParams[index] = { ...updatedParams[index], [field]: value };
            return {
                ...prev,
                [path]: updatedParams,
            };
        });
    };

    return (
        <Container className="py-5">
            <h1 className="text-center mb-4">API Routes</h1>

            <Form.Group className="mb-4">
                <Form.Label>Base API URL</Form.Label>
                <Form.Control
                    type="text"
                    placeholder="Enter base API URL"
                    value={baseApiUrl}
                    onChange={(e) => setBaseApiUrl(e.target.value)}
                />
            </Form.Group>

            {loading && (
                <div className="text-center">
                    <Spinner animation="border" variant="primary" />
                    <p className="mt-3">Loading routes...</p>
                </div>
            )}

            {error && (
                <Alert variant="danger" className="text-center">
                    {error}
                </Alert>
            )}

            {!loading && !error && (
                <Accordion defaultActiveKey="0" className="mt-4">
                    {routes.map((route, index) => (
                        <Accordion.Item eventKey={index.toString()} key={index}>
                            <Accordion.Header>
                                <div>
                                    <strong>{route.name}</strong> -{' '}
                                    <span className="text-muted">{route.path}</span>
                                </div>
                            </Accordion.Header>
                            <Accordion.Body>
                                <p>
                                    <strong>Path:</strong> {route.path}
                                </p>
                                <div>
                                    <strong>Custom Parameters:</strong>
                                    {(params[route.path] || []).map((param, idx) => (
                                        <Row key={idx} className="mb-3">
                                            <Col xs={12} sm={4}>
                                                <Form.Control
                                                    type="text"
                                                    placeholder="Key"
                                                    value={param.key}
                                                    onChange={(e) =>
                                                        handleParamChange(route.path, idx, 'key', e.target.value)
                                                    }
                                                />
                                            </Col>
                                            <Col xs={12} sm={8}>
                                                <Form.Control
                                                    type="text"
                                                    placeholder="Value"
                                                    value={param.value}
                                                    onChange={(e) =>
                                                        handleParamChange(route.path, idx, 'value', e.target.value)
                                                    }
                                                />
                                            </Col>
                                        </Row>
                                    ))}
                                    <Button
                                        variant="success"
                                        className="mb-3"
                                        onClick={() => handleAddParam(route.path)}
                                    >
                                        Add Parameter
                                    </Button>
                                </div>
                                <div className="d-flex gap-3 mt-3 justify-content-center flex-column flex-md-row">
                                    <Button
                                        variant="primary"
                                        className="mb-2 mb-md-0"
                                        onClick={() => handleExecute(route.path)}
                                        disabled={executing === route.path}
                                    >
                                        {executing === route.path ? (
                                            <Spinner animation="border" size="sm" />
                                        ) : (
                                            'Execute'
                                        )}
                                    </Button>
                                    <Button
                                        variant="outline-secondary"
                                        onClick={() => handleCopyCurl(route.path)}
                                    >
                                        Copy cURL
                                    </Button>
                                </div>
                            </Accordion.Body>
                        </Accordion.Item>
                    ))}
                </Accordion>
            )}

            {/* Modal for API Call Results */}
            <Modal show={showModal} onHide={() => setShowModal(false)}>
                <Modal.Header closeButton>
                    <Modal.Title>Response for {selectedPath}</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <pre>{JSON.stringify(modalResponse, null, 2)}</pre>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowModal(false)}>
                        Close
                    </Button>
                </Modal.Footer>
            </Modal>
        </Container>
    );
};

export default EndpointPage;