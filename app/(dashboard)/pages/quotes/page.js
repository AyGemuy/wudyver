'use client';

import React, { useState, Fragment } from 'react';
import { Button, Dropdown, DropdownButton, Card, Alert, Modal } from 'react-bootstrap';
import { FileText, ArrowRight, ArrowLeft, Clipboard as ClipboardIcon } from 'react-bootstrap-icons';
import useMounted from 'hooks/useMounted';

const QuotesPage = () => {
  const hasMounted = useMounted();
  const [types] = useState(['dare', 'truth', 'bucin', 'gombalan', 'renungan']);
  const [selectedType, setSelectedType] = useState('');
  const [quote, setQuote] = useState(null);
  const [message, setMessage] = useState('');
  const [isFetching, setIsFetching] = useState(false);
  const [showModal, setShowModal] = useState(false);

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

  const handleCopyToClipboard = () => {
    navigator.clipboard.writeText(quote);
  };

  const handleNext = () => {
    // Call handleFetchQuote to get a new quote
    handleFetchQuote();
  };

  const handlePreview = () => {
    setShowModal(true);
  };

  return (
    <Fragment>
      {hasMounted && (
        <div className="container mt-5 d-flex justify-content-center align-items-center flex-column">
          <h2 className="text-center mb-4">Get a Quote</h2>
          <div className="w-100">
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
              className="w-100 mb-3"
            >
              {isFetching ? 'Fetching...' : 'Get Quote'}
            </Button>
          </div>
          {message && <Alert variant="danger" className="mt-3 w-100">{message}</Alert>}

          {quote && (
            <Card className="mt-3 w-100 shadow" style={{ borderRadius: '12px' }}>
              <Card.Body>
                <Card.Title>
                  <FileText size={20} className="me-2" />
                  Quote
                </Card.Title>
                <Card.Text>
                  &quot;{quote}&quot;
                </Card.Text>
                <div className="d-flex flex-wrap">
                  <Button variant="success" onClick={handleCopyToClipboard} className="me-2 mb-2">
                    <ClipboardIcon size={18} className="me-2" />
                    Salin
                  </Button>
                  <Button variant="secondary" onClick={handleNext} className="me-2 mb-2">
                    <ArrowRight size={18} className="me-2" />
                    Next
                  </Button>
                  <Button variant="secondary" onClick={handlePreview} className="me-2 mb-2">
                    <ArrowLeft size={18} className="me-2" />
                    Preview
                  </Button>
                </div>
              </Card.Body>
            </Card>
          )}

          {/* Modal for preview */}
          <Modal show={showModal} onHide={() => setShowModal(false)} centered>
            <Modal.Header closeButton>
              <Modal.Title>Preview Quote</Modal.Title>
            </Modal.Header>
            <Modal.Body>
              <p>{quote}</p>
              <Button variant="success" onClick={handleCopyToClipboard}>
                <ClipboardIcon size={18} className="me-2" />
                Salin ke Clipboard
              </Button>
            </Modal.Body>
          </Modal>
        </div>
      )}
    </Fragment>
  );
};

export default QuotesPage;
