'use client';

import { useEffect, useState } from 'react';
import { Container, Table, Spinner, Card } from 'react-bootstrap';

const EndpointPage = () => {
    const [routes, setRoutes] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchRoutes = async () => {
            try {
                const res = await fetch('/api/routes');
                if (!res.ok) throw new Error('Failed to fetch');
                const data = await res.json();
                setRoutes(data);
            } catch (error) {
                console.error('Error fetching routes:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchRoutes();
    }, []);

    return (
        <Container className="py-5">
            <h1 className="text-center mb-4">API Routes Statistics</h1>
            
            {loading ? (
                <div className="text-center">
                    <Spinner animation="border" variant="primary" />
                </div>
            ) : (
                <>
                    <Table striped bordered hover responsive>
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>Name</th>
                                <th>Path</th>
                                <th>Params</th>
                            </tr>
                        </thead>
                        <tbody>
                            {routes.map((route, index) => (
                                <tr key={index}>
                                    <td>{index + 1}</td>
                                    <td>{route.name}</td>
                                    <td>{route.path}</td>
                                    <td>
                                        {route.params.map((param, idx) => (
                                            <div key={idx}>
                                                <strong>{param.name}</strong> (Required: {param.required ? 'Yes' : 'No'})
                                            </div>
                                        ))}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </Table>

                    <div className="d-flex flex-wrap gap-3 mt-5">
                        {routes.map((route, index) => (
                            <Card style={{ width: '18rem' }} key={index}>
                                <Card.Body>
                                    <Card.Title>{route.name}</Card.Title>
                                    <Card.Subtitle className="mb-2 text-muted">{route.path}</Card.Subtitle>
                                    <Card.Text>
                                        {route.params.map((param, idx) => (
                                            <div key={idx}>
                                                <strong>{param.name}</strong> (Required: {param.required ? 'Yes' : 'No'})
                                            </div>
                                        ))}
                                    </Card.Text>
                                </Card.Body>
                            </Card>
                        ))}
                    </div>
                </>
            )}
        </Container>
    );
};

export default EndpointPage;
