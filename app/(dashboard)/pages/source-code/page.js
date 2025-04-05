"use client";

import { useState, useEffect } from "react";
import {
  Container,
  Card,
  Form,
  Modal,
  Button,
  InputGroup,
  Spinner,
  ListGroup,
  Dropdown,
} from "react-bootstrap";
import {
  FolderFill,
  Folder2Open,
  FileEarmarkCodeFill,
  Search,
  Clipboard,
  SortAlphaDown,
  SortAlphaUp,
  FilterCircle,
} from "react-bootstrap-icons";

export default function SourcePage() {
  const [search, setSearch] = useState("");
  const [routes, setRoutes] = useState({});
  const [filtered, setFiltered] = useState({});
  const [expandedFolders, setExpandedFolders] = useState({});
  const [rawContent, setRawContent] = useState(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [sortOrder, setSortOrder] = useState("A-Z");

  useEffect(() => {
    const fetchRoutes = async () => {
      try {
        const res = await fetch("/api/routes");
        const data = await res.json();
        const structured = structureRoutes(data);
        setRoutes(structured);
        setFiltered(structured);
      } catch (error) {
        console.error("Error fetching routes:", error);
      }
    };

    fetchRoutes();
  }, []);

  const structureRoutes = (data) => {
    let structured = {};
    data.forEach(({ path }) => {
      const parts = path.split("/").filter(Boolean).slice(1);
      let current = structured;

      parts.forEach((part, index) => {
        if (!current[part]) {
          current[part] = index === parts.length - 1 ? { path } : {};
        }
        current = current[part];
      });
    });
    return structured;
  };

  const filterRoutes = (routes, query) => {
    if (!query) return routes;
    let result = {};

    Object.entries(routes).forEach(([key, value]) => {
      if (typeof value === "object" && !value.path) {
        const filteredSubRoutes = filterRoutes(value, query);
        if (Object.keys(filteredSubRoutes).length > 0) result[key] = filteredSubRoutes;
      } else if (key.toLowerCase().includes(query.toLowerCase())) {
        result[key] = value;
      }
    });

    return result;
  };

  useEffect(() => {
    setFiltered(filterRoutes(routes, search));
  }, [search, routes]);

  const toggleFolder = (folder) => {
    setExpandedFolders((prev) => ({ ...prev, [folder]: !prev[folder] }));
  };

  const fetchRawFile = async (path) => {
    setLoading(true);
    try {
      const res = await fetch(
        `https://raw.githubusercontent.com/AyGemuy/wudyver/refs/heads/master/pages/api/${path.replace(
          "/api/",
          ""
        )}.js`
      );
      setRawContent(await res.text());
    } catch (err) {
      setRawContent("Gagal mengambil file.");
    }
    setShowModal(true);
    setLoading(false);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(rawContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const renderRoutes = (routes, parentPath = "") => {
    return Object.entries(routes).map(([key, value]) => {
      const currentPath = parentPath ? `${parentPath}/${key}` : key;
      const isFolder = typeof value === "object" && !value.path;

      return (
        <ListGroup.Item key={currentPath} action>
          {isFolder ? (
            <>
              <div
                onClick={() => toggleFolder(currentPath)}
                style={{ cursor: "pointer", display: "flex", alignItems: "center" }}
              >
                {expandedFolders[currentPath] ? (
                  <Folder2Open className="me-2" />
                ) : (
                  <FolderFill className="me-2" />
                )}
                {key}
              </div>
              {expandedFolders[currentPath] && (
                <ListGroup variant="flush">{renderRoutes(value, currentPath)}</ListGroup>
              )}
            </>
          ) : (
            <div
              onClick={() => fetchRawFile(value.path)}
              style={{ cursor: "pointer", display: "flex", alignItems: "center" }}
            >
              <FileEarmarkCodeFill className="me-2 text-primary" />
              {key}
            </div>
          )}
        </ListGroup.Item>
      );
    });
  };

  return (
    <Container className="mt-4">
      <Card className="p-4 shadow-lg border-primary">
        <h2 className="text-center">API Explorer</h2>

        <InputGroup className="mb-3">
          <Form.Control
            type="text"
            placeholder="Cari file atau folder..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Button variant="outline-secondary">
            <Search />
          </Button>
        </InputGroup>

        <Dropdown className="mb-3">
          <Dropdown.Toggle variant="secondary">
            <FilterCircle className="me-2" /> Sort & Filter
          </Dropdown.Toggle>
          <Dropdown.Menu>
            <Dropdown.Item onClick={() => setSortOrder("A-Z")}>
              <SortAlphaDown className="me-2" /> A-Z
            </Dropdown.Item>
            <Dropdown.Item onClick={() => setSortOrder("Z-A")}>
              <SortAlphaUp className="me-2" /> Z-A
            </Dropdown.Item>
          </Dropdown.Menu>
        </Dropdown>

        {Object.keys(filtered).length === 0 ? (
          <p className="text-muted text-center">Tidak ada hasil ditemukan.</p>
        ) : (
          <ListGroup variant="flush">{renderRoutes(filtered)}</ListGroup>
        )}

        <Modal show={showModal} onHide={() => setShowModal(false)} size="lg">
          <Modal.Header closeButton>
            <Modal.Title>Isi File</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            {loading ? (
              <div className="d-flex justify-content-center">
                <Spinner animation="border" variant="primary" />
              </div>
            ) : (
              <pre className="bg-light p-3 rounded" style={{ maxHeight: "60vh", overflowY: "auto" }}>
                {rawContent}
              </pre>
            )}
          </Modal.Body>
          <Modal.Footer>
            <Button variant="success" onClick={copyToClipboard}>
              <Clipboard className="me-2" />
              {copied ? "Tersalin!" : "Salin ke Clipboard"}
            </Button>
          </Modal.Footer>
        </Modal>
      </Card>
    </Container>
  );
}
