'use client'
// import node module libraries
import { Col, Row, Image, Container, Card, Button } from 'react-bootstrap';
import Link from 'next/link';

// import hooks
import useMounted from 'hooks/useMounted';
import { Fragment } from 'react';

const NotFound = () => {
  const hasMounted = useMounted();
  return (
    <Fragment>
      {hasMounted && (
        <Container className="d-flex justify-content-center align-items-center" style={{ height: '100vh' }}>
          <Row className="justify-content-center">
            <Col xs={12} sm={8} md={6} lg={4}>
              <Card className="text-center shadow-lg">
                <Card.Body>
                  <div className="mb-3">
                    <Image src="/images/error/404-error-img.png" alt="404 Error" className="img-fluid" />
                  </div>
                  <h1 className="display-4 fw-bold">Oops! The page was not found.</h1>
                  <p className="mb-4">Or simply leverage the expertise of our consultation team.</p>
                  <Link href="/" passHref>
                    <Button variant="primary" className="w-100">
                      Go Home
                    </Button>
                  </Link>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </Container>
      )}
    </Fragment>
  );
};

export default NotFound;
