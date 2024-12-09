'use client';

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Container, Form, InputGroup, Card, Spinner, Button, Row, Col } from 'react-bootstrap';
import { Search as SearchIcon } from 'react-bootstrap-icons';

const WikiPage = () => {
  const [term, setTerm] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const search = async () => {
      if (!term) {
        setResults([]);
        return;
      }

      setLoading(true);

      try {
        const { data } = await axios.get('https://en.wikipedia.org/w/api.php', {
          params: {
            action: 'query',
            list: 'search',
            origin: '*',
            format: 'json',
            srsearch: term,
          },
        });
        setResults(data.query.search);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    const timeoutId = setTimeout(() => {
      search();
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [term]);

  return (
    <Container className="my-4">
      <h1 className="text-center">Wikipedia Search</h1>
      <Form className="my-4">
        <InputGroup>
          <InputGroup.Text>
            <SearchIcon />
          </InputGroup.Text>
          <Form.Control
            placeholder="Enter search term..."
            value={term}
            onChange={(e) => setTerm(e.target.value)}
          />
        </InputGroup>
      </Form>

      {loading ? (
        <div className="text-center my-4">
          <Spinner animation="border" />
        </div>
      ) : (
        <>
          {results.length > 0 ? (
            <Row>
              {results.map((result) => (
                <Col key={result.pageid} xs={12} sm={6} md={4} lg={3} className="mb-4">
                  <Card>
                    <Card.Body>
                      <Card.Title>{result.title}</Card.Title>
                      <Card.Text>
                        {result.snippet.replace(/<[^>]*>/g, '')} {/* Menyaring HTML */}
                      </Card.Text>
                      <Button variant="outline-primary" size="sm" href={`https://en.wikipedia.org/?curid=${result.pageid}`} target="_blank">
                        Read More
                      </Button>
                    </Card.Body>
                  </Card>
                </Col>
              ))}
            </Row>
          ) : (
            term && <div>No results found for {term}</div>
          )}
        </>
      )}
    </Container>
  );
};

export default WikiPage;
