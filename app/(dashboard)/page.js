'use client'
// import node module libraries
import { Fragment, useEffect, useState } from "react";
import Link from 'next/link';
import { Container, Col, Row, Card } from 'react-bootstrap';
import { PeopleFill, BarChart } from 'react-bootstrap-icons';

// import widget/custom components
import { StatRightTopIcon } from "widgets";

// import sub components
import { ActiveProjects, Teams, TasksPerformance } from "sub-components";

// import required data files
import ProjectsStatsData from "data/dashboard/ProjectsStatsData";

const Home = () => {
    const [visitor, setVisitor] = useState(0);
    const [requests, setRequests] = useState(0);

    useEffect(() => {
        // Fetch visitor and total request data from the API
        const fetchData = async () => {
            const res = await fetch('/api/visitor-stats');
            const data = await res.json();
            setVisitor(data.visitorCount);
            setRequests(data.requestCount);
        };
        fetchData();
    }, []);

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
                                    <h3 className="mb-0  text-white">Projects</h3>
                                </div>
                                <div>
                                    <Link href="#" className="btn btn-white">Create New Project</Link>
                                </div>
                            </div>
                        </div>
                    </Col>
                    {ProjectsStatsData.map((item, index) => {
                        return (
                            <Col xl={3} lg={6} md={12} xs={12} className="mt-6" key={index}>
                                <StatRightTopIcon info={item} />
                            </Col>
                        );
                    })}
                </Row>

                {/* Active Projects  */}
                <ActiveProjects />

                {/* Visitor and Total Request */}
                <Row className="my-6">
                    <Col xl={6} lg={6} md={12} xs={12} className="mb-6 mb-xl-0">
                        <Card className="text-center">
                            <Card.Body>
                                <PeopleFill size={50} />
                                <Card.Title>Jumlah Pengunjung</Card.Title>
                                <Card.Text>
                                    <strong>{visitor}</strong> pengunjung telah mengakses halaman ini.
                                </Card.Text>
                            </Card.Body>
                        </Card>
                    </Col>
                    <Col xl={6} lg={6} md={12} xs={12} className="mb-6 mb-xl-0">
                        <Card className="text-center">
                            <Card.Body>
                                <BarChart size={50} />
                                <Card.Title>Total Request</Card.Title>
                                <Card.Text>
                                    <strong>{requests}</strong> request API telah tercatat.
                                </Card.Text>
                            </Card.Body>
                        </Card>
                    </Col>
                </Row>

                <Row className="my-6">
                    <Col xl={4} lg={12} md={12} xs={12} className="mb-6 mb-xl-0">
                        {/* Tasks Performance  */}
                        <TasksPerformance />
                    </Col>

                    {/* card  */}
                    <Col xl={8} lg={12} md={12} xs={12}>
                        {/* Teams  */}
                        <Teams />
                    </Col>
                </Row>
            </Container>
        </Fragment>
    );
};

export default Home;
