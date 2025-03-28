"use client";

import { useState, useEffect } from "react";
import { Container, Table, Spinner, Alert } from "react-bootstrap";

export default function ActivityLog() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulasi fetch API logs
    setTimeout(() => {
      setLogs([
        { id: 1, activity: "Login", date: "2024-08-29 12:45:00" },
        { id: 2, activity: "Edit Profile", date: "2024-08-28 15:30:00" },
        { id: 3, activity: "Upload Image", date: "2024-08-28 14:10:00" },
        { id: 4, activity: "Logout", date: "2024-08-28 13:00:00" },
      ]);
      setLoading(false);
    }, 1500); // Simulasi delay 1.5 detik
  }, []);

  return (
    <Container className="mt-5">
      <h2 className="text-center mb-4">Activity Log</h2>
      {loading ? (
        <div className="text-center">
          <Spinner animation="border" variant="primary" />
          <p>Loading activity log...</p>
        </div>
      ) : logs.length === 0 ? (
        <Alert variant="warning">No activity found.</Alert>
      ) : (
        <Table striped bordered hover responsive>
          <thead>
            <tr>
              <th>#</th>
              <th>Activity</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log, index) => (
              <tr key={log.id}>
                <td>{index + 1}</td>
                <td>{log.activity}</td>
                <td>{log.date}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </Container>
  );
}
