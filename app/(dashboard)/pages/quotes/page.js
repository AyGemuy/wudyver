'use client';

import React, { useState, Fragment } from 'react';
import { Button, Dropdown, DropdownButton, Card, Alert } from 'react-bootstrap';
import useMounted from 'hooks/useMounted';

const Page = () => {
  const hasMounted = useMounted();
  const [types] = useState(['dare', 'truth', 'bucin', 'gombalan', 'renungan']);
  const [selectedType, setSelectedType] = useState('');
  const [quote, setQuote] = useState(null);
  const [message, setMessage] = useState('');
  const [isFetching, setIsFetching] = useState(false);

  const handleFetchQuote = async () => {
    if (!selectedType) {
      setMessage('Please select a type first!');
      return;
    }

    setIsFetching(true);
    setMessage('');
    setQuote(null);

    try {
      const res = await fetch(`/api/quotes/by?type=${selectedType}`, {
        method: 'GET',
      });

      if (!res.ok) throw new Error('Failed to fetch quote');

      const result = await res.json();
      setQuote(result.quote);
    } catch (error) {
      setMessage('Error fetching quote');
    } finally {
      setIsFetching(false);
    }
  };

  return (
    <Fragment>
      {hasMounted && (
        <div className="container mt-5 d-flex justify-content-center align-items-center flex-column">
          <h2 className="text-center mb-4">Get a Quote</h2>
          <div className="w-50">
            <div className="mb-3">
              <label className="form-label">Select Quote Type</label>
              <DropdownButton
                variant="secondary"
                title={selectedType || 'Choose Type'}
                onSelect={(type) => setSelectedType(type)}
                className="w-100"
              >
                {types.map((type, idx) => (
                  <Dropdown.Item key={idx} eventKey={type}>
                    {type}
                  </Dropdown.Item>
                ))}
              </DropdownButton>
            </div>
            <Button
              variant="primary"
              onClick={handleFetchQuote}
              disabled={isFetching}
              className="w-100"
            >
              {isFetching ? 'Fetching...' : 'Get Quote'}
            </Button>
          </div>
          {message && <Alert variant="danger" className="mt-3 w-50">{message}</Alert>}

          {quote && (
            <Card className="mt-3 w-50">
              <Card.Body>
                <Card.Title>Quote</Card.Title>
                <Card.Text>
                  &quot;{quote}&quot;
                </Card.Text>
              </Card.Body>
            </Card>
          )}
        </div>
      )}
    </Fragment>
  );
};

export default Page;
