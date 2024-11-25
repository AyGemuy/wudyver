// pages/visitor/stats.js
'use client';

import React, { useState, useEffect } from 'react';
import { Card, ListGroup, Spinner, Alert } from 'react-bootstrap';
import { Cpu, Memory as MemoryIcon, Hourglass, Laptop } from 'react-bootstrap-icons';

export default function StatsPage() {
  const [systemStats, setSystemStats] = useState(null);
  const [visitorStats, setVisitorStats] = useState(null);
  const [userStats, setUserStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Fetch data from API for system stats
    const fetchSystemStats = async () => {
      try {
        const res = await fetch('/api/general/system-stats');
        const data = await res.json();
        setSystemStats(data);
      } catch (err) {
        setError('Failed to fetch system data');
      }
    };

    // Fetch data from API for visitor stats
    const fetchVisitorStats = async () => {
      try {
        const res = await fetch('/api/visitor/stats');
        const data = await res.json();
        setVisitorStats(data);
      } catch (err) {
        setError('Failed to fetch visitor data');
      }
    };

    // Fetch data from API for user stats
    const fetchUserStats = async () => {
      try {
        const res = await fetch('/api/user/stats');
        const data = await res.json();
        setUserStats(data);
      } catch (err) {
        setError('Failed to fetch user data');
      }
    };

    // Call all fetch functions
    fetchSystemStats();
    fetchVisitorStats();
    fetchUserStats();
  }, []);

  // Check loading state
  if (loading) {
    return (
      <div className="d-flex justify-content-center mt-4">
        <Spinner animation="border" role="status">
          <span className="sr-only">Loading...</span>
        </Spinner>
      </div>
    );
  }

  // Check for errors
  if (error) {
    return (
      <div className="alert alert-danger mt-4">
        {error}
      </div>
    );
  }

  // Destructure system stats
  const { Statistik } = systemStats || {};
  const { Memory, Uptime, Platform, Architecture, NodeVersion } = Statistik || {};

  return (
    <div className="container mt-4">
      <h2>Statistics</h2>

      {/* Visitor Statistics */}
      <Card>
        <Card.Header>Visitor Statistics</Card.Header>
        <Card.Body>
          <ListGroup variant="flush">
            <ListGroup.Item><strong>Visitor Count:</strong> {visitorStats?.visitorCount}</ListGroup.Item>
            <ListGroup.Item><strong>Request Count :</strong> {visitorStats?.requestCount}</ListGroup.Item>
          </ListGroup>
        </Card.Body>
      </Card>

      {/* User Statistics */}
      <Card className="mt-3">
        <Card.Header>User Statistics</Card.Header>
        <Card.Body>
          <ListGroup variant="flush">
            <ListGroup.Item><strong>Total Users:</strong> {userStats?.userCount}</ListGroup.Item>
          </ListGroup>
        </Card.Body>
      </Card>

      {/* System Information */}
      <Card className="mt-3">
        <Card.Header>
          <Cpu className="me-2" size={20} />
          System Information
        </Card.Header>
        <Card.Body>
          <ListGroup variant="flush">
            <ListGroup.Item><Hourglass className="me-2" size={18} /><strong>Uptime:</strong> {Uptime}</ListGroup.Item>
            <ListGroup.Item><Laptop className="me-2" size={18} /><strong>Platform:</strong> {Platform}</ListGroup.Item>
            <ListGroup.Item><strong>Architecture:</strong> {Architecture}</ListGroup.Item>
            <ListGroup.Item><strong>Node Version:</strong> {NodeVersion}</ListGroup.Item>
          </ListGroup>
        </Card.Body>
      </Card>

      {/* Memory Usage */}
      <Card className="mt-3">
        <Card.Header>
          <MemoryIcon className="me-2" size={20} />
          Memory Usage
        </Card.Header>
        <Card.Body>
          <ListGroup variant="flush">
            <ListGroup.Item><strong>Total Memory:</strong> {Memory?.total}</ListGroup.Item>
            <ListGroup.Item><strong>Free Memory:</strong> {Memory?.free}</ListGroup.Item>
            <ListGroup.Item><strong>Used Memory:</strong> {Memory?.used}</ListGroup.Item>
          </ListGroup>
        </Card.Body>
      </Card>
    </div>
  );
}