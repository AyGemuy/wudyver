'use client';

import React, { useState, useEffect } from 'react';
import { Card, ListGroup, Spinner, Alert } from 'react-bootstrap';
import { Cpu, Memory as MemoryIcon, Hourglass, Laptop, People, Eye } from 'react-bootstrap-icons';
import axios from 'axios';

const StatsPage = () => {
  const [systemStats, setSystemStats] = useState(null);
  const [visitorStats, setVisitorStats] = useState(null);
  const [userStats, setUserStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [systemResponse, visitorResponse, userResponse] = await Promise.all([
          axios.get('/api/general/system-stats'),
          axios.get('/api/visitor/stats'),
          axios.get('/api/user/stats'),
        ]);

        setSystemStats(systemResponse.data);
        setVisitorStats(visitorResponse.data);
        setUserStats(userResponse.data);
      } catch (err) {
        setError(err.response?.data?.message || err.message || 'Failed to fetch data');
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
          <span className="visually-hidden">Loading...</span>
        </Spinner>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="danger" className="mt-4">
        {error}
      </Alert>
    );
  }

  const { Memory, Uptime, Platform, Architecture, NodeVersion } = systemStats?.Statistik || {};

  return (
    <div className="container mt-4">
      <h2 className="mb-4 text-center">Statistics Overview</h2>

      {/* Visitor Statistics */}
      <Card className="mb-3 shadow-sm">
        <Card.Header className="d-flex align-items-center bg-primary text-white">
          <Eye className="me-2" size={20} />
          Visitor Statistics
        </Card.Header>
        <Card.Body>
          <ListGroup variant="flush">
            <ListGroup.Item>
              <strong>Visitor Count:</strong> {visitorStats?.visitorCount}
            </ListGroup.Item>
            <ListGroup.Item>
              <strong>Request Count:</strong> {visitorStats?.requestCount}
            </ListGroup.Item>
          </ListGroup>
        </Card.Body>
      </Card>

      {/* User Statistics */}
      <Card className="mb-3 shadow-sm">
        <Card.Header className="d-flex align-items-center bg-success text-white">
          <People className="me-2" size={20} />
          User Statistics
        </Card.Header>
        <Card.Body>
          <ListGroup variant="flush">
            <ListGroup.Item>
              <strong>Total Users:</strong> {userStats?.userCount}
            </ListGroup.Item>
          </ListGroup>
        </Card.Body>
      </Card>

      {/* System Information */}
      <Card className="mb-3 shadow-sm">
        <Card.Header className="d-flex align-items-center bg-info text-white">
          <Cpu className="me-2" size={20} />
          System Information
        </Card.Header>
        <Card.Body>
          <ListGroup variant="flush">
            <ListGroup.Item>
              <Hourglass className="me-2" size={18} />
              <strong>Uptime:</strong> {Uptime}
            </ListGroup.Item>
            <ListGroup.Item>
              <Laptop className="me-2" size={18} />
              <strong>Platform:</strong> {Platform}
            </ListGroup.Item>
            <ListGroup.Item>
              <strong>Architecture:</strong> {Architecture}
            </ListGroup.Item>
            <ListGroup.Item>
              <strong>Node Version:</strong> {NodeVersion}
            </ListGroup.Item>
          </ListGroup>
        </Card.Body>
      </Card>

      {/* Memory Usage */}
      <Card className="mb-3 shadow-sm">
        <Card.Header className="d-flex align-items-center bg-warning text-dark">
          <MemoryIcon className="me-2" size={20} />
          Memory Usage
        </Card.Header>
        <Card.Body>
          <ListGroup variant="flush">
            <ListGroup.Item>
              <strong>Total Memory:</strong> {Memory?.total}
            </ListGroup.Item>
            <ListGroup.Item>
              <strong>Free Memory:</strong> {Memory?.free}
            </ListGroup.Item>
            <ListGroup.Item>
              <strong>Used Memory:</strong> {Memory?.used}
            </ListGroup.Item>
          </ListGroup>
        </Card.Body>
      </Card>
    </div>
  );
};

export default StatsPage;
