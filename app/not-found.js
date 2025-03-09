'use client';

import { Col, Row, Image, Container, Card, Button, Spinner } from 'react-bootstrap';
import Link from 'next/link';
import { HouseDoorFill } from 'react-bootstrap-icons';
import useMounted from 'hooks/useMounted';
import { Fragment, useState } from 'react';

const NotFound = () => {
  const hasMounted = useMounted();
  const [loading, setLoading] = useState(false);

  const handleGoHome = () => {
    setLoading(true);
    setTimeout(() => {
      window.location.href = '/';
    }, 1000);
  };

  return (
    <Fragment>
      {hasMounted && (
        <Container className="d-flex align-items-center justify-content-center vh-100">
          <Card className="shadow-lg text-center p-4" style={{ maxWidth: '500px', width: '100%' }}>
            <Card.Body>
              <div className="mb-4">
                <Image
                  src="/images/error/404-error-img.png"
                  alt="404 Error"
                  className="img-fluid"
                  style={{ maxHeight: '200px' }}
                />
              </div>
              <Card.Title className="display-5 fw-bold mb-3">
                Oops! Page Not Found
              </Card.Title>
              <Card.Text className="mb-4 text-muted">
                Sorry, the page you’re looking for doesn’t exist. You can go back to the homepage.
              </Card.Text>
              <Button
                variant="primary"
                size="lg"
                className="d-flex align-items-center justify-content-center"
                onClick={handleGoHome}
                disabled={loading}
              >
                {loading ? (
                  <Spinner animation="border" size="sm" className="me-2" />
                ) : (
                  <HouseDoorFill size={20} className="me-2" />
                )}
                {loading ? 'Loading...' : 'Go Home'}
              </Button>
            </Card.Body>
          </Card>
        </Container>
      )}
    </Fragment>
  );
};

export default NotFound;
