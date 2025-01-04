'use client';

import { useEffect, useState } from 'react';
import { Accordion, Container, Button, Spinner, Alert } from 'react-bootstrap';

const EndpointPage = () => {
    const [routes, setRoutes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [executing, setExecuting] = useState(null); // Track which endpoint is executing

    useEffect(() => {
        const fetchRoutes = async () => {
            try {
                const res = await fetch('/api/routes');
                if (!res.ok) throw new Error('Failed to fetch routes');
                const data = await res.json();
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
            const res = await fetch(path);
            const data = await res.json();
            alert(`Response from ${path}: ${JSON.stringify(data)}`);
        } catch (error) {
            alert(`Error executing ${path}: ${error.message}`);
        } finally {
            setExecuting(null);
        }
    };

    return (
        <Container className="py-5">
            <h1 className="text-center mb-4">API Routes</h1>

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
                                <strong>{route.name}</strong> - <span className="text-muted">{route.path}</span>
                            </Accordion.Header>
                            <Accordion.Body>
                                <p>
                                    <strong>Path:</strong> {route.path}
                                </p>
                                <p>
                                    <strong>Parameters:</strong>
                                </p>
                                <ul>
                                    {route.params.length > 0 ? (
                                        route.params.map((param, idx) => (
                                            <li key={idx}>
                                                <strong>{param.name}</strong> - Required:{' '}
                                                {param.required ? 'Yes' : 'No'}
                                            </li>
                                        ))
                                    ) : (
                                        <li>No parameters required.</li>
                                    )}
                                </ul>
                                <Button
                                    variant="primary"
                                    onClick={() => handleExecute(route.path)}
                                    disabled={executing === route.path}
                                >
                                    {executing === route.path ? (
                                        <Spinner animation="border" size="sm" />
                                    ) : (
                                        'Execute'
                                    )}
                                </Button>
                            </Accordion.Body>
                        </Accordion.Item>
                    ))}
                </Accordion>
            )}
        </Container>
    );
};

export default EndpointPage;
