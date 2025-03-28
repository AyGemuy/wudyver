"use client";

import { useState } from "react";
import { Container, Card, Button, Row, Col, Modal } from "react-bootstrap";

export default function GoPro() {
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [showModal, setShowModal] = useState(false);

  const plans = [
    { id: 1, name: "Basic", price: "$5/month", features: ["Access to premium features", "Priority support"] },
    { id: 2, name: "Pro", price: "$10/month", features: ["All Basic features", "Unlimited access", "Faster processing"] },
    { id: 3, name: "Ultimate", price: "$20/month", features: ["All Pro features", "Custom integrations", "24/7 Support"] },
  ];

  const handleUpgrade = (plan) => {
    setSelectedPlan(plan);
    setShowModal(true);
  };

  const handleConfirm = () => {
    alert(`You have upgraded to the ${selectedPlan.name} plan!`);
    setShowModal(false);
  };

  return (
    <Container className="mt-5 text-center">
      <h2 className="mb-4">Upgrade to Pro</h2>
      <p>Choose the plan that suits you best.</p>

      <Row className="justify-content-center">
        {plans.map((plan) => (
          <Col md={4} key={plan.id} className="mb-4">
            <Card>
              <Card.Body>
                <Card.Title>{plan.name}</Card.Title>
                <Card.Subtitle className="mb-2 text-muted">{plan.price}</Card.Subtitle>
                <ul className="list-unstyled">
                  {plan.features.map((feature, index) => (
                    <li key={index}>✔ {feature}</li>
                  ))}
                </ul>
                <Button variant="primary" onClick={() => handleUpgrade(plan)}>
                  Upgrade Now
                </Button>
              </Card.Body>
            </Card>
          </Col>
        ))}
      </Row>

      {/* Modal Konfirmasi */}
      <Modal show={showModal} onHide={() => setShowModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Confirm Upgrade</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          Are you sure you want to upgrade to the <strong>{selectedPlan?.name}</strong> plan?
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowModal(false)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleConfirm}>
            Confirm
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
}
