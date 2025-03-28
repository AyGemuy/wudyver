"use client";

import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import {
  Container,
  Form,
  InputGroup,
  Card,
  Spinner,
  Button,
} from "react-bootstrap";
import { Search, BoxArrowUpRight } from "react-bootstrap-icons";

export default function WikiPage() {
  const [term, setTerm] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  const search = useCallback(async () => {
    if (!term.trim()) {
      setResults([]);
      return;
    }

    setLoading(true);

    try {
      const { data } = await axios.get("https://en.wikipedia.org/w/api.php", {
        params: {
          action: "query",
          list: "search",
          origin: "*",
          format: "json",
          srsearch: term,
        },
      });

      setResults(data.query.search);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  }, [term]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      search();
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [term, search]);

  return (
    <Container className="my-5">
      <Card className="p-4 mt-4 shadow-lg border-primary">
        <h2 className="text-center mb-4">Wikipedia Search</h2>

        {/* Search Bar */}
        <Form className="mb-4">
          <InputGroup className="shadow-sm">
            <InputGroup.Text>
              <Search size={20} />
            </InputGroup.Text>
            <Form.Control
              placeholder="Cari artikel Wikipedia..."
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              className="fs-5"
            />
          </InputGroup>
        </Form>

        {/* Loading Spinner */}
        {loading && (
          <div className="text-center my-4">
            <Spinner animation="border" variant="primary" />
          </div>
        )}

        {/* Results in One Card */}
        {!loading && results.length > 0 && (
          <Card.Body>
            <h4 className="text-center mb-3">Hasil Pencarian</h4>
            <ul className="list-group list-group-flush">
              {results.map((result) => (
                <li key={result.pageid} className="list-group-item">
                  <h5 className="fw-bold">{result.title}</h5>
                  <p className="text-muted">
                    {result.snippet.replace(/<[^>]*>/g, "")} {/* Filter HTML */}
                  </p>
                  <Button
                    variant="primary"
                    href={`https://en.wikipedia.org/?curid=${result.pageid}`}
                    target="_blank"
                    className="d-flex align-items-center"
                  >
                    Baca Selengkapnya <BoxArrowUpRight className="ms-2" />
                  </Button>
                </li>
              ))}
            </ul>
          </Card.Body>
        )}

        {/* No Results */}
        {!loading && term && results.length === 0 && (
          <div className="text-center text-muted">
            Tidak ada hasil untuk &quot;{term}&quot;
          </div>
        )}
      </Card>
    </Container>
  );
}
