'use client';

import React, { useState } from 'react';
import { Button, Card, Alert, Spinner, ListGroup } from 'react-bootstrap';
import { Play, Pause, Clipboard } from 'react-bootstrap-icons';
import Image from 'next/image';

const AlquranPage = () => {
  const [surahNumber, setSurahNumber] = useState(1); // Default to Surah 1
  const [surahData, setSurahData] = useState(null);
  const [message, setMessage] = useState('');
  const [isFetching, setIsFetching] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audio, setAudio] = useState(null);
  const [currentPage, setCurrentPage] = useState(0);
  const ayahsPerPage = 10;

  const fetchSurahData = async () => {
    setIsFetching(true);
    setMessage('');
    setSurahData(null);
    setCurrentPage(0); // Reset to the first page when fetching new data

    try {
      const res = await fetch(`/api/islami/alquran/v1?surah=${surahNumber}`);
      if (!res.ok) throw new Error('Gagal mengambil data Surah.');

      const result = await res.json();
      setSurahData(result.data);
    } catch (error) {
      setMessage('Terjadi kesalahan saat mengambil data Surah.');
    } finally {
      setIsFetching(false);
    }
  };

  const toggleAudio = (ayah) => {
    if (isPlaying && audio?.src === ayah.audioUrl) {
      audio.pause();
      setIsPlaying(false);
    } else {
      if (audio) audio.pause(); // Pause existing audio
      const newAudio = new Audio(ayah.audioUrl);
      newAudio.play();
      newAudio.onended = () => setIsPlaying(false); // Reset state when playback ends
      setAudio(newAudio);
      setIsPlaying(true);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(
      () => setMessage('Teks berhasil disalin!'),
      () => setMessage('Gagal menyalin teks.')
    );
  };

  const renderAyahList = () => {
    if (!surahData) return null;

    const startIndex = currentPage * ayahsPerPage;
    const selectedAyahs = surahData.ayahs.slice(startIndex, startIndex + ayahsPerPage);

    return (
      <ListGroup variant="flush">
        {selectedAyahs.map((ayah) => (
          <ListGroup.Item key={ayah.number} className="d-flex align-items-center p-3">
            <div className="flex-grow-1">
              <strong>Ayah {ayah.number}:</strong> {ayah.text}
              <div className="mt-2">
                <Image
                  src={ayah.imageUrl}
                  alt={`Ayah ${ayah.number}`}
                  width={400}
                  height={200}
                  className="img-fluid rounded"
                  priority // Optimize loading for better performance
                />
              </div>
            </div>
            <div className="d-flex gap-2">
              {/* Copy to clipboard button */}
              <Button 
                variant="outline-secondary" 
                size="sm" 
                onClick={() => copyToClipboard(ayah.text)}
              >
                <Clipboard size={16} />
              </Button>
              {/* Play/Pause button */}
              <Button
                variant="outline-success"
                size="sm"
                onClick={() => toggleAudio(ayah)}
              >
                {isPlaying && audio?.src === ayah.audioUrl ? <Pause size={16} /> : <Play size={16} />}
              </Button>
            </div>
          </ListGroup.Item>
        ))}
      </ListGroup>
    );
  };

  const handleNextPage = () => {
    if (surahData && (currentPage + 1) * ayahsPerPage < surahData.ayahs.length) {
      setCurrentPage(currentPage + 1);
    }
  };

  const handlePreviousPage = () => {
    if (currentPage > 0) {
      setCurrentPage(currentPage - 1);
    }
  };

  return (
    <div className="container mt-5 d-flex flex-column align-items-center">
      <h2 className="text-center mb-4 text-primary fw-bold">Al-Quran Surah</h2>

      {/* Select for choosing Surah */}
      <div className="mb-3 w-100 col-md-6">
        <select
          value={surahNumber}
          onChange={(e) => setSurahNumber(parseInt(e.target.value))}
          className="form-select"
        >
          {Array.from({ length: 114 }, (_, idx) => (
            <option key={idx} value={idx + 1}>
              Surah {idx + 1}
            </option>
          ))}
        </select>
      </div>

      {/* Button to fetch Surah data */}
      <Button
        variant="primary"
        onClick={fetchSurahData}
        disabled={isFetching}
        className="w-100 col-md-6 mb-4"
      >
        {isFetching ? <Spinner animation="border" size="sm" /> : 'Ambil Data Surah'}
      </Button>

      {message && <Alert variant="danger" className="w-100 col-md-6 text-center">{message}</Alert>}

      {surahData && (
        <Card className="shadow-lg w-100 col-md-8 mt-4">
          <Card.Body>
            <Card.Title className="text-center mb-3 text-success">
              {surahData.name} ({surahData.englishName})
            </Card.Title>
            <Card.Text className="mb-4">
              <strong>Jenis Wahyu:</strong> {surahData.revelationType}<br />
              <strong>Jumlah Ayat:</strong> {surahData.numberOfAyahs}
            </Card.Text>
            {renderAyahList()}
            <div className="d-flex justify-content-between mt-3">
              <Button 
                variant="secondary" 
                onClick={handlePreviousPage} 
                disabled={currentPage === 0}
              >
                Back
              </Button>
              <Button 
                variant="secondary" 
                onClick={handleNextPage} 
                disabled={surahData && (currentPage + 1) * ayahsPerPage >= surahData.ayahs.length}
              >
                Next
              </Button>
            </div>
          </Card.Body>
        </Card>
      )}
    </div>
  );
};

export default AlquranPage;