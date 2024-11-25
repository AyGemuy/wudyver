'use client';

import React, { useState, useEffect } from 'react';
import { Accordion, Card, Button, Spinner, Alert } from 'react-bootstrap';
import { ExclamationTriangle, FileLock, FileText } from 'react-bootstrap-icons';

export default function EndpointPage() {
  const [apiData, setApiData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch('/api/routes');
        if (!res.ok) {
          throw new Error(`Error: ${res.statusText}`);
        }
        const data = await res.json();
        setApiData(data);
      } catch (err) {
        setError(err.message || 'An error occurred while fetching data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="d-flex justify-content-center mt-4">
        <Spinner animation="border" role="status">
          <span className="sr-only">Loading...</span>
        </Spinner>
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert alert-danger mt-4">
        <ExclamationTriangle className="mr-2" /> Error: {error}
      </div>
    );
  }

  return (
    <div className="container mt-4">
      <h2>API Endpoints</h2>
      <Accordion defaultActiveKey="0">
        {apiData.map((api, index) => (
          <Card key={index}>
            <Accordion.Toggle as={Button} variant="link" eventKey={index.toString()}>
              <FileText className="mr-2" /> {api.name}
            </Accordion.Toggle>
            <Accordion.Collapse eventKey={index.toString()}>
              <Card.Body>
                <h5><FileLock className="mr-2" /> Path: {api.path}</h5>
                <p><strong>Parameters:</strong></p>
                {api.params && api.params.length > 0 ? (
                  <ul>
                    {api.params.map((param, paramIndex) => (
                      <li key={paramIndex}>
                        {param.name} (Required: {param.required ? 'Yes' : 'No'})
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p>No parameters.</p>
                )}
              </Card.Body>
            </Accordion.Collapse>
          </Card>
        ))}
      </Accordion>
    </div>
  );
}
