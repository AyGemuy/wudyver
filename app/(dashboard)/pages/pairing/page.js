'use client';

import React, { useState, Fragment } from 'react';
import { Button, Alert, Spinner, Container, Row, Col, Form } from 'react-bootstrap';
import useMounted from 'hooks/useMounted';

const Page = () => {
  const hasMounted = useMounted();
  const [number, setNumber] = useState('');
  const [version, setVersion] = useState('');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleFetch = async () => {
    if (!number || !version) {
      setError('Both number and version are required');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/tools/pair/v${version}?number=${number}`);
      const result = await res.json();
      if (res.ok) setData(result.code);
      else setError(result.error || 'Unknown error');
    } catch {
      setError('Error fetching data');
    }
    setLoading(false);
  };

  return (
    <Fragment>
      {hasMounted && (
        <Container className="mt-5">
          <Row className="justify-content-center">
            <Col xs={12} md={6}>
              <h2 className="text-center mb-4">Pairing Page</h2>
              <Form>
                <Form.Group controlId="formNumber">
                  <Form.Label>Number</Form.Label>
                  <Form.Control
                    type="text"
                    placeholder="Enter number"
                    value={number}
                    onChange={(e) => setNumber(e.target.value)}
                  />
                </Form.Group>

                <Form.Group controlId="formVersion" className="mt-3">
                  <Form.Label>Version</Form.Label>
                  <Form.Control
                    type="text"
                    placeholder="Enter version (1 - 4)"
                    value={version}
                    onChange={(e) => setVersion(e.target.value)}
                  />
                </Form.Group>

                <Button
                  variant="primary"
                  className="mt-3 w-100"
                  onClick={handleFetch}
                  disabled={loading || !number || !version}
                >
                  {loading ? <Spinner animation="border" size="sm" /> : 'Fetch Code'}
                </Button>
              </Form>

              {error && <Alert variant="danger" className="mt-3">{error}</Alert>}
              {data && <div className="mt-3">Code: <strong>{data}</strong></div>}
            </Col>
          </Row>
        </Container>
      )}
    </Fragment>
  );
};

export default Page;
