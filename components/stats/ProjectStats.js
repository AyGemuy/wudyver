'use client';

import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Spinner } from 'react-bootstrap';
import { Person, Eye, Cpu, Memory as MemoryIcon, ListTask } from 'react-bootstrap-icons';
import { StatRightTopIcon } from "widgets";

const ProjectStats = () => {
  const [userStats, setUserStats] = useState(null);
  const [visitorStats, setVisitorStats] = useState(null);
  const [systemStats, setSystemStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      try {
        const [userResponse, visitorResponse, systemResponse] = await Promise.all([
          fetch('/api/user/stats'),
          fetch('/api/visitor/stats'),
          fetch('/api/general/system-stats')
        ]);

        const [userData, visitorData, systemData] = await Promise.all([
          userResponse.json(),
          visitorResponse.json(),
          systemResponse.json()
        ]);

        setUserStats(userData);
        setVisitorStats(visitorData);
        setSystemStats(systemData);
      } catch (err) {
        setError('Failed to fetch data');
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="d-flex justify-content-center mt-4">
        <Spinner animation="grow" role="status" variant="primary">
          <span className="visually-hidden">Loading...</span>
        </Spinner>
      </div>
    );
  }

  if (error) {
    return <div className="alert alert-danger mt-4">{error}</div>;
  }

  const statsData = [
    {
      id: 1,
      title: "Request Count",
      value: visitorStats?.requestCount,
      icon: <ListTask size={24} className="text-danger" />,
      statInfo: `${visitorStats?.requestCount} total requests`,
    },
    {
      id: 2,
      title: "Total Visitors",
      value: visitorStats?.visitorCount,
      icon: <Eye size={24} className="text-success" />,
      statInfo: `${visitorStats?.visitorCount} total visitors`,
    },
    {
      id: 3,
      title: "Total Users",
      value: userStats?.userCount,
      icon: <Person size={24} className="text-primary" />,
      statInfo: `${userStats?.userCount} total users`,
    },
    {
      id: 4,
      title: "System Uptime",
      value: systemStats?.Statistik?.Uptime,
      icon: <Cpu size={24} className="text-info" />,
      statInfo: `Uptime: ${systemStats?.Statistik?.Uptime}`,
    },
    {
      id: 5,
      title: "Memory Usage",
      value: systemStats?.Statistik?.Memory?.used,
      icon: <MemoryIcon size={24} className="text-warning" />,
      statInfo: `Used: ${systemStats?.Statistik?.Memory?.used}`,
    },
  ];

  return (
    <Row className="my-4">
      {statsData.map((item) => (
        <Col xl={3} lg={6} md={12} xs={12} className="mt-4" key={item.id}>
          <StatRightTopIcon info={item} />
        </Col>
      ))}
    </Row>
  );
};

export default ProjectStats;
