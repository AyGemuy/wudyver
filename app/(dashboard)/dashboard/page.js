'use client'

// Import node module libraries
import { Fragment } from "react";
import Link from 'next/link';
import { Container, Col, Row, Badge } from 'react-bootstrap';

// Import widget/custom components
import { StatRightTopIcon } from "widgets";

// Import sub-components
import { ActiveProjects, Teams, TasksPerformance } from "sub-components";

// Import required data files
import ProjectsStatsData from "data/dashboard/ProjectsStatsData";
import ProjectStats from 'components/stats/ProjectStats';

const Home = () => {
    return (
        <Fragment>
            {/* Background Section */}
            <div className="bg-primary pt-10 pb-21"></div>

            {/* Container with margin and padding */}
            <Container fluid className="mt-n22 px-6">
                <Row>
                    <Col lg={12} md={12} xs={12}>
                        {/* Page Header */}
                        <div className="d-flex justify-content-between align-items-center">
                            <div className="mb-2 mb-lg-0">
                                <h3 className="mb-0 text-white">Projects API</h3>
                                <Badge pill bg="success"  className="me-1">dashboard</Badge>
                            </div>
                            <div>
                                <Link href="/docs" className="btn btn-light shadow-lg">
                                    Documentation
                                </Link>
                            </div>
                        </div>
                    </Col>
                </Row>

                {/* Project Stats Section */}
                <ProjectStats />

                {/* Render Project Stats Data */}
                    {ProjectsStatsData.map((item, index) => (
                        <Col xl={3} lg={6} md={12} xs={12} className="mt-6" key={index}>
                            <StatRightTopIcon info={item} />
                        </Col>
                    ))}

                {/* Active Projects Section */}
                <Row className="accordion-expand delay-1">
                    <Col xl={3} lg={6} md={12} xs={12} className="mt-6">
                        <ActiveProjects />
                    </Col>
                </Row>

                {/* Tasks Performance Section */}
                <Row className="accordion-expand delay-1">
                    <Col xl={3} lg={6} md={12} xs={12} className="mt-6">
                        <TasksPerformance />
                    </Col>
                </Row>

                {/* Teams Card Section */}
                <Row className="accordion-expand delay-1">
                    <Col xl={3} lg={6} md={12} xs={12} className="mt-6">
                        <Teams />
                    </Col>
                </Row>
            </Container>
        </Fragment>
    );
};

export default Home;
