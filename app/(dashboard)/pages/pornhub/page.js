'use client';

import { useState } from 'react';
import { Container, Form, Button, Row, Col, Card, Spinner, Modal, Dropdown } from 'react-bootstrap';
import { Search, PlayCircle } from 'react-bootstrap-icons';

export default function VideoSearch() {
  const [query, setQuery] = useState('');
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [showModal, setShowModal] = useState(false);

  const searchVideos = async () => {
    if (!query.trim()) return;
    setLoading(true);
    try {
      const response = await fetch(`/api/nsfw/pornhub?action=search&query=${encodeURIComponent(query)}`);
      const data = await response.json();
      setVideos(data || []);
    } catch (error) {
      console.error('Error fetching videos:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchVideoDetail = async (url) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/nsfw/pornhub?action=detail&url=${encodeURIComponent(url)}`);
      const data = await response.json();
      setSelectedVideo(data);
      setShowModal(true);
    } catch (error) {
      console.error('Error fetching video details:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container className="mt-5">
      <Row className="justify-content-center">
        <Col lg={8} md={10} xs={12}>
          <Card className="shadow-lg border-0 p-4">
            <Card.Body>
              <h3 className="text-center fw-bold mb-4">Search Videos</h3>
              <Form
                onSubmit={(e) => {
                  e.preventDefault();
                  searchVideos();
                }}
              >
                <Row>
                  <Col md={10}>
                    <Form.Control
                      type='text'
                      placeholder='Enter search query...'
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                    />
                  </Col>
                  <Col md={2}>
                    <Button variant='primary' type='submit' disabled={loading || !query.trim()}>
                      {loading ? <Spinner animation='border' size='sm' /> : <Search />} Search
                    </Button>
                  </Col>
                </Row>
              </Form>

              <Row className='mt-4'>
                {loading ? (
                  <Col className="text-center">
                    <Spinner animation="border" variant="primary" />
                  </Col>
                ) : (
                  videos.map((video, index) => (
                    <Col md={4} key={index}>
                      <Card className='mb-3 shadow-sm border-0'>
                        <Card.Body>
                          <Card.Title>{video.title}</Card.Title>
                          <Card.Text>
                            <small>Uploader: {video.uploader}</small><br />
                            <small>Views: {video.views}</small><br />
                            <small>Duration: {video.duration}</small>
                          </Card.Text>
                          <Button variant='success' onClick={() => fetchVideoDetail(video.url)} disabled={loading}>
                            <PlayCircle /> View Details
                          </Button>
                        </Card.Body>
                      </Card>
                    </Col>
                  ))
                )}
              </Row>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {selectedVideo && (
        <Modal show={showModal} onHide={() => setShowModal(false)} centered>
          <Modal.Header closeButton>
            <Modal.Title>{selectedVideo.video_title}</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <img src={selectedVideo.image_url} alt={selectedVideo.video_title} className='img-fluid mb-3' />
            <iframe
              src={`https://www.pornhub.com/embed/${selectedVideo.video_id}`} // Ganti dengan ID video yang sesuai
              frameBorder="0"
              width="100%"
              height="340"
              scrolling="no"
              allowFullScreen
              title={selectedVideo.video_title}
            />
            <h5>Video Details</h5>
            <p><strong>Duration:</strong> {selectedVideo.video_duration} seconds</p>
            <p><strong>Uploader:</strong> <a href={selectedVideo.link_url} target="_blank" rel="noopener noreferrer">{selectedVideo.uploaderLink}</a></p>
            <p><strong>Language:</strong> {selectedVideo.language}</p>
            <p><strong>ISP:</strong> {selectedVideo.isp}</p>
            <p><strong>Geo:</strong> {selectedVideo.geo}</p>
            <p><strong>HD:</strong> {selectedVideo.isHD ? 'Yes' : 'No'}</p>
            <p><strong>Video Unavailable:</strong> {selectedVideo.video_unavailable ? 'Yes' : 'No'}</p>
            <p><strong>Next Video:</strong> <a href={selectedVideo.nextVideo.nextUrl}>{selectedVideo.nextVideo.title}</a></p>
            <h6>Additional Information</h6>
            <p><strong>Experiment ID:</strong> {selectedVideo.experimentId}</p>
            <p><strong>Autoplay:</strong> {selectedVideo.autoplay ? 'Enabled' : 'Disabled'}</p>
            <p><strong>Tracking Time Watched:</strong> {selectedVideo.trackingTimeWatched ? 'Yes' : 'No'}</p>
            <p><strong>Action Tags:</strong> {selectedVideo.actionTags}</p>
            <p><strong>Top Rated URL:</strong> <a href={selectedVideo.toprated_url} target="_blank" rel="noopener noreferrer">{selectedVideo.toprated_url}</a></p>
            <p><strong>Most Viewed URL:</strong> <a href={selectedVideo.mostviewed_url} target="_blank" rel="noopener noreferrer">{selectedVideo.mostviewed_url}</a></p>
            <Dropdown className='mt-3'>
              <Dropdown.Toggle variant='success' id='dropdown-basic'>
                Select Video Quality
              </Dropdown.Toggle>

              <Dropdown.Menu>
                {selectedVideo.mediaDefinitions.map((media, index) => (
                  <Dropdown.Item key={index} href={media.videoUrl} target="_blank">
                    {media.quality}p
                  </Dropdown.Item>
                ))}
              </Dropdown.Menu>
            </Dropdown>
          </Modal.Body>
          <Modal.Footer>
            <Button variant='secondary' onClick={() => setShowModal(false)}>Close</Button>
          </Modal.Footer>
        </Modal>
      )}
    </Container>
  );
}