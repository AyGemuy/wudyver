'use client';

// Import node module libraries
import { Fragment } from 'react';
import Link from 'next/link';
import { Container, Col, Row } from 'react-bootstrap';

// Import widget/custom components
import { StatRightTopIcon } from 'widgets';

// Import sub components
import { ActiveProjects, Teams, TasksPerformance } from 'sub-components';

// Import required data files
import ProjectsStatsData from 'data/dashboard/ProjectsStatsData';
import ProjectStats from 'components/stats/ProjectStats';

const Home = () => {
  return (
    <Fragment>
      <div className="bg-primary pt-10 pb-21"></div>
      <Container fluid className="mt-n22 px-6">
        <Row>
          <Col lg={12} md={12} xs={12}>
            {/* Page header */}
            <div>
              <div className="d-flex justify-content-between align-items-center">
                <div className="mb-2 mb-lg-0">
                  <h3 className="mb-0 text-white">Projects</h3>
                </div>
                <div>
                  <Link href="/documentation" className="btn btn-white">
                    Create New Project
                  </Link>
                </div>
              </div>
            </div>
          </Col>
        </Row>

        <Row>
          {/* Project Stats Section */}
          <ProjectStats />
          {ProjectsStatsData.map((item, index) => (
            <Col xl={3} lg={6} md={12} xs={12} className="mt-6" key={index}>
              <StatRightTopIcon info={item} />
            </Col>
          ))}
        </Row>

        {/* Active Projects */}
        <ActiveProjects />

        <Row className="my-6">
          <Col xl={4} lg={12} md={12} xs={12} className="mb-6 mb-xl-0">
            {/* Tasks Performance */}
            <TasksPerformance />
          </Col>
          <Col xl={8} lg={12} md={12} xs={12}>
            {/* Teams */}
            <Teams />
          </Col>
        </Row>
      </Container>
    </Fragment>
  );
};

export default Home;
