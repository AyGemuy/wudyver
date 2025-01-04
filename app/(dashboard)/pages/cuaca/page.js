'use client';

import React, { useState, useEffect } from 'react';
import { Card, Alert, Spinner, Button, Form } from 'react-bootstrap';
import { CloudSun, ThermometerHalf, Wind, Map } from 'react-bootstrap-icons';
import Image from 'next/image';

export default function CuacaPage() {
  const [weatherData, setWeatherData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [city, setCity] = useState('');
  const [ipCity, setIpCity] = useState('');
  const [useIpCity, setUseIpCity] = useState(true);

  const fetchCityByIp = async () => {
    try {
      const response = await fetch('https://ipapi.co/json/');
      if (!response.ok) throw new Error('Gagal mendapatkan data lokasi berdasarkan IP.');
      const data = await response.json();
      setIpCity(data.city || '');
    } catch (err) {
      console.error('Error mendapatkan kota berdasarkan IP:', err);
    }
  };

  useEffect(() => {
    fetchCityByIp();
  }, []);

  const fetchWeather = async (cityName) => {
    if (!cityName) {
      setError('Nama kota tidak boleh kosong.');
      return;
    }

    setLoading(true);
    setError('');
    setWeatherData(null);

    try {
      const response = await fetch(`/api/info/cuaca?kota=${cityName}`);
      if (!response.ok) throw new Error('Terjadi kesalahan saat mengambil data cuaca.');
      const data = await response.json();
      setWeatherData(data.result);
    } catch (err) {
      setError(err.message || 'Terjadi kesalahan saat mengambil data cuaca.');
    } finally {
      setLoading(false);
    }
  };

  const handleCityChange = (event) => {
    setCity(event.target.value);
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    const cityToFetch = useIpCity ? ipCity : city.trim();
    fetchWeather(cityToFetch);
  };

  const isPngIcon = (url) => {
    return url?.toLowerCase().startsWith('https');
  };

  const openMap = (lat, lon) => {
    if (!lat || !lon) {
      alert('Koordinat lokasi tidak tersedia.');
      return;
    }
    const mapUrl = `https://www.google.com/maps?q=${lat},${lon}`;
    window.open(mapUrl, '_blank');
  };

  return (
    <div className="container mt-4">
      <h2 className="text-center mb-4">Cek Cuaca</h2>

      <Card className="p-4 shadow-lg mx-auto" style={{ maxWidth: '500px', borderRadius: '12px' }}>
        <Form onSubmit={handleSubmit}>
          <Form.Check
            type="checkbox"
            label="Gunakan kota berdasarkan IP saya"
            checked={useIpCity}
            onChange={() => setUseIpCity(!useIpCity)}
          />
          {!useIpCity && (
            <Form.Group className="mt-3">
              <Form.Label>Masukkan Nama Kota:</Form.Label>
              <Form.Control
                type="text"
                value={city}
                onChange={handleCityChange}
                placeholder="Contoh: Bandung"
              />
            </Form.Group>
          )}
          <Button variant="primary" type="submit" className="mt-3 w-100" disabled={!useIpCity && !city.trim()}>
            {loading ? <Spinner animation="border" size="sm" /> : 'Cari Cuaca'}
          </Button>
        </Form>
      </Card>

      {error && <Alert variant="danger" className="mt-3">{error}</Alert>}

      {weatherData && (
        <Card className="mt-4 shadow">
          <Card.Header>
            <CloudSun size={20} className="me-2" />
            Cuaca di {weatherData.location.name}, {weatherData.location.region}, {weatherData.location.country}
          </Card.Header>
          <Card.Body>
            <div className="row">
              <div className="col-md-6">
                <h5>Suasana:</h5>
                <p>
                  {weatherData.current.condition.text}
                  {isPngIcon(weatherData.current.condition.iconUrl) && (
                    <Image
                      src={weatherData.current.condition.iconUrl}
                      alt="Cuaca"
                      width={40}
                      height={40}
                      layout="intrinsic"
                    />
                  )}
                </p>
                <h5>Terakhir Diperbarui:</h5>
                <p>{weatherData.current.last_updated}</p>
                <h5>Tekanan:</h5>
                <p>{weatherData.current.pressure_mb} mb ({weatherData.current.pressure_in} in)</p>
                <h5>Curah Hujan:</h5>
                <p>{weatherData.current.precip_mm} mm ({weatherData.current.precip_in} in)</p>
                <h5>Visibilitas:</h5>
                <p>{weatherData.current.vis_km} km ({weatherData.current.vis_miles} miles)</p>
                <h5>UV Index:</h5>
                <p>{weatherData.current.uv}</p>
              </div>
              <div className="col-md-6">
                <h5>Suhu:</h5>
                <p>
                  <ThermometerHalf size={18} className="me-2" />
                  {weatherData.current.temp_c}°C ({weatherData.current.temp_f}°F)
                </p>
                <h5>Feels Like:</h5>
                <p>{weatherData.current.feelslike_c}°C ({weatherData.current.feelslike_f}°F)</p>
                <h5>Humidity:</h5>
                <p>{weatherData.current.humidity}%</p>
                <h5>
                  <Wind size={18} className="me-2" />
                  Wind:
                </h5>
                <p>
                  {weatherData.current.wind_mph} mph ({weatherData.current.wind_kph} kph), {weatherData.current.wind_dir}
                </p>
              </div>
            </div>
            <h5>Peta Lokasi:</h5>
            <div className="d-flex align-items-center">
              <Image
                src={weatherData.tileUrl}
                alt="Peta Cuaca"
                width={500}
                height={300}
                layout="intrinsic"
              />
              <Button
                variant="outline-primary"
                className="ms-3"
                onClick={() => openMap(weatherData.location.lat, weatherData.location.lon)}
              >
                <Map size={20} className="me-2" />
                Lihat di Google Maps
              </Button>
            </div>
          </Card.Body>
        </Card>
      )}
    </div>
  );
}
