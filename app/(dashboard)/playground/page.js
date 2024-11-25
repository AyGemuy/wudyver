'use client';  // Menambahkan 'use client' untuk penggunaan React di Next.js

import { useState, useEffect } from "react";
import axios from "axios";
import { Col, Row, Card, Modal, Button, Pagination, Container, Table } from "react-bootstrap";
import { ChevronLeft, ChevronRight } from "react-bootstrap-icons";

const PlaygroundPage = () => {
  const [data, setData] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [modalResponse, setModalResponse] = useState(null);

  // Fetch data API
  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await axios.get("/api/openapi"); // Ganti dengan URL API yang sesuai
        const routers = response.data; // Sesuaikan dengan struktur response API
        setData(routers);
        setTotalPages(Math.ceil(routers.length / 5)); // Set total pages untuk pagination
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    };
    fetchData();
  }, []);

  const handlePageChange = (selectedPage) => {
    setPage(selectedPage);
  };

  const handleGet = (path) => {
    window.location.href = path; // Navigasi ke path ketika tombol GET ditekan
  };

  const handleRun = (response) => {
    setModalResponse(response);
    setShowModal(true); // Menampilkan modal dengan response
  };

  const handleCloseModal = () => setShowModal(false); // Menutup modal

  return (
    <Container>
      <h1 className="my-4">Router List</h1>
      <Row>
        <Col>
          <Card>
            <Card.Body>
              <Table striped bordered hover responsive>
                <thead>
                  <tr>
                    <th>No</th>
                    <th>Name</th>
                    <th>Path</th>
                    <th>Params</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {data
                    .slice((page - 1) * 5, page * 5)
                    .map((router, index) => (
                      <tr key={index}>
                        <td>{index + 1}</td>
                        <td>{router.name}</td>
                        <td>{router.path}</td>
                        <td>
                          {router.parameters.length
                            ? router.parameters
                                .map((param) => param.name)
                                .join(", ")
                            : "-"}
                        </td>
                        <td>
                          <Button
                            variant="primary"
                            size="sm"
                            className="me-2"
                            onClick={() => handleGet(router.path)}
                          >
                            GET
                          </Button>
                          <Button
                            variant="success"
                            size="sm"
                            onClick={() => handleRun(router.responses)}
                          >
                            RUN
                          </Button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </Table>

              {/* Pagination */}
              <Pagination className="justify-content-center">
                <Pagination.Prev
                  onClick={() => handlePageChange(page - 1)}
                  disabled={page === 1}
                >
                  <ChevronLeft />
                </Pagination.Prev>
                <Pagination.Item>{page}</Pagination.Item>
                <Pagination.Next
                  onClick={() => handlePageChange(page + 1)}
                  disabled={page === totalPages}
                >
                  <ChevronRight />
                </Pagination.Next>
              </Pagination>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Modal untuk menampilkan response */}
      <Modal show={showModal} onHide={handleCloseModal}>
        <Modal.Header closeButton>
          <Modal.Title>Response</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <pre>{JSON.stringify(modalResponse, null, 2)}</pre>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleCloseModal}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default PlaygroundPage;
