'use client';

import React, { useState, Fragment } from 'react';
import { Button, Card, Alert, Spinner, Dropdown, DropdownButton, ListGroup } from 'react-bootstrap';
import { Play, Pause, Copy } from 'react-bootstrap-icons';
import { CopyToClipboard } from 'react-copy-to-clipboard';
import useMounted from 'hooks/useMounted';

const AlquranPage = () => {
  const hasMounted = useMounted();
  const [surahNumber, setSurahNumber] = useState(1); // Default to Surah 1
  const [ayahNumber, setAyahNumber] = useState(1); // Default to Ayah 1
  const [surahData, setSurahData] = useState(null);
  const [message, setMessage] = useState('');
  const [isFetching, setIsFetching] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audio, setAudio] = useState(null);

  const fetchSurahData = async () => {
    setIsFetching(true);
    setMessage('');
    setSurahData(null);

    try {
      const res = await fetch(`/api/islami/alquran?surah=${surahNumber}`);

      if (!res.ok) throw new Error('Failed to fetch Surah data');

      const result = await res.json();
      setSurahData(result.data);
    } catch (error) {
      setMessage('Error fetching Surah data');
    } finally {
      setIsFetching(false);
    }
  };

  const toggleAudio = (ayah) => {
    if (isPlaying && audio) {
      audio.pause();
      setIsPlaying(false);
    } else {
      const newAudio = new Audio(ayah.audioUrl);
      newAudio.play();
      setAudio(newAudio);
      setIsPlaying(true);
    }
  };

  return (
    <Fragment>
      {hasMounted && (
        <div className="container mt-5 d-flex flex-column align-items-center">
          <h2 className="text-center mb-4 text-primary font-weight-bold">Al-Quran Surah</h2>

          {/* Dropdown for selecting Surah */}
          <div className="w-50 mb-3">
            <DropdownButton
              variant="outline-primary"
              title={`Surah ${surahNumber}`}
              onSelect={(e) => setSurahNumber(parseInt(e))}
              className="w-100"
            >
              {Array.from({ length: 114 }, (_, idx) => (
                <Dropdown.Item key={idx} eventKey={idx + 1}>
                  Surah {idx + 1}
                </Dropdown.Item>
              ))}
            </DropdownButton>
          </div>

          {/* Button to fetch Surah data */}
          <div className="w-50 mb-4">
            <Button
              variant="primary"
              onClick={fetchSurahData}
              disabled={isFetching}
              className="w-100"
            >
              {isFetching ? <Spinner animation="border" size="sm" /> : 'Fetch Surah'}
            </Button>
          </div>

          {message && <Alert variant="danger" className="w-50">{message}</Alert>}

          {surahData && (
            <div className="w-75">
              <Card className="shadow-lg">
                <Card.Body>
                  <Card.Title className="text-center mb-3 text-success">{surahData.name} ({surahData.englishName})</Card.Title>
                  <Card.Text className="mb-4">
                    <strong>Revelation Type:</strong> {surahData.revelationType}<br />
                    <strong>Number of Ayahs:</strong> {surahData.numberOfAyahs}
                  </Card.Text>
                  <ListGroup variant="flush">
                    {surahData.ayahs.map((ayah) => (
                      <ListGroup.Item key={ayah.number} className="d-flex align-items-center p-3">
                        <div className="d-flex flex-column flex-grow-1">
                          <span><strong>Ayah {ayah.number}:</strong> {ayah.text}</span>
                          <img src={ayah.imageUrl} alt={`Ayah ${ayah.number}`} className="mt-2 img-fluid rounded" />
                        </div>

                        {/* Copy to clipboard button */}
                        <CopyToClipboard text={ayah.text}>
                          <Button variant="outline-secondary" size="sm" className="ml-2">
                            <Copy />
                          </Button>
                        </CopyToClipboard>

                        {/* Play/Pause button */}
                        <Button
                          variant="outline-success"
                          size="sm"
                          className="ml-2"
                          onClick={() => toggleAudio(ayah)}
                        >
                          {isPlaying && audio?.src === ayah.audioUrl ? <Pause /> : <Play />}
                        </Button>
                      </ListGroup.Item>
                    ))}
                  </ListGroup>
                </Card.Body>
              </Card>
            </div>
          )}
        </div>
      )}
    </Fragment>
  );
};

export default AlquranPage;
