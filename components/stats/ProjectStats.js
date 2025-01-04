'use client';

import React, { useState, useEffect } from 'react';
import { Row, Col, Spinner, Alert } from 'react-bootstrap';
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
        const results = await Promise.all([
          fetchData('/api/user/stats', 'User Stats'),
          fetchData('/api/visitor/stats', 'Visitor Stats'),
          fetchData('/api/general/system-stats', 'System Stats'),
        ]);

        const [userData, visitorData, systemData] = results;

        if (userData) setUserStats(userData);
        if (visitorData) setVisitorStats(visitorData);
        if (systemData) setSystemStats(systemData);
      } catch (err) {
        setError('Error fetching stats');
      } finally {
        setLoading(false);
      }
    };

    const fetchData = async (url, statName) => {
      try {
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`Failed to fetch ${statName}`);
        }
        return await response.json();
      } catch (err) {
        setError(`Error fetching ${statName}`);
        return null;
      }
    };

    fetchStats();
  }, []);

  if (loading) {
    return (
      <Row className="d-flex justify-content-center align-items-center mt-5">
        <Col xl={3}
          lg={6}
          md={12}
          xs={12}
          className="mt-6">
          <Alert variant="info" className="mt-4 p-3 rounded-3 shadow-sm fade show">
            <div className="d-flex  align-items-center">
    <strong>Loading...</strong>
    <Spinner animation="border" role="status" className="ms-auto">
        <span className="visually-hidden">Loading...</span>
    </Spinner>
</div>
          </Alert>
        </Col>
      </Row>
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
    <Row className="accordion-expand delay-1">
      {statsData.map((item, index) => (
        <Col
          xl={3}
          lg={6}
          md={12}
          xs={12}
          className="mt-6"
          key={item.id}
        >
          <StatRightTopIcon info={item} />
        </Col>
      ))}
    </Row>
  );
};

export default ProjectStats;
