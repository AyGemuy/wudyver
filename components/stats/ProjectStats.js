'use client';

import React, { useState, useEffect } from 'react';
import { Row, Col, Spinner, Alert } from 'react-bootstrap';
import { Person, Eye, Cpu, Memory as MemoryIcon, ListTask, Diagram3Fill } from 'react-bootstrap-icons';
import { StatRightTopIcon } from "widgets";

const ProjectStats = () => {
  const [userStats, setUserStats] = useState({});
  const [visitorStats, setVisitorStats] = useState({});
  const [systemStats, setSystemStats] = useState({});
  const [totalRoutes, setTotalRoutes] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      try {
        const [userData, visitorData, systemData] = await Promise.all([
          fetchData('/api/user/stats'),
          fetchData('/api/visitor/stats'),
          fetchData('/api/general/system-stats'),
        ]);

        setUserStats(userData || {});
        setVisitorStats(visitorData || {});
        setSystemStats(systemData || {});
        setTotalRoutes(systemData?.TotalRoute ?? 0);
      } catch {
        setError('Gagal mengambil data statistik.');
      } finally {
        setLoading(false);
      }
    };

    const fetchData = async (url) => {
      try {
        const response = await fetch(url);
        return response.ok ? await response.json() : null;
      } catch {
        return null;
      }
    };

    fetchStats();
  }, []);

  if (loading) {
    return (
      <Row className="d-flex justify-content-center align-items-center mt-5">
        <Col xl={3} lg={6} md={12} xs={12} className="mt-6">
          <Alert variant="info" className="mt-4 p-3 rounded-3 shadow-sm fade show">
            <div className="d-flex align-items-center">
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
      value: visitorStats?.requestCount ?? 0,
      icon: <ListTask size={24} className="text-danger" />,
      statInfo: `${visitorStats?.requestCount ?? 0} total requests`,
    },
    {
      id: 2,
      title: "Total Visitors",
      value: visitorStats?.visitorCount ?? 0,
      icon: <Eye size={24} className="text-success" />,
      statInfo: `${visitorStats?.visitorCount ?? 0} total visitors`,
    },
    {
      id: 3,
      title: "Total Users",
      value: userStats?.userCount ?? 0,
      icon: <Person size={24} className="text-primary" />,
      statInfo: `${userStats?.userCount ?? 0} total users`,
    },
    {
      id: 4,
      title: "System Uptime",
      value: systemStats?.Statistik?.Uptime ?? '-',
      icon: <Cpu size={24} className="text-info" />,
      statInfo: `Uptime: ${systemStats?.Statistik?.Uptime ?? '-'}`,
    },
    {
      id: 5,
      title: "Memory Usage",
      value: systemStats?.Statistik?.Memory?.used ?? 'N/A',
      icon: <MemoryIcon size={24} className="text-warning" />,
      statInfo: `Used: ${systemStats?.Statistik?.Memory?.used ?? 'N/A'}`,
    },
    {
      id: 6,
      title: "Total Routes",
      value: totalRoutes ?? 0,
      icon: <Diagram3Fill size={24} className="text-dark" />,
      statInfo: `${totalRoutes ?? 0} total routes`,
    },
  ];

  return (
    <Row className="accordion-expand delay-1">
      {statsData.map((item) => (
        <Col xl={3} lg={6} md={12} xs={12} className="mt-6" key={item.id}>
          <StatRightTopIcon info={item} />
        </Col>
      ))}
    </Row>
  );
};

export default ProjectStats;
