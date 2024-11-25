'use client';

import React, { useState, useEffect } from 'react';
import { Card, Alert, Spinner, Button, Form } from 'react-bootstrap';
import { CloudSun, ThermometerHalf, CloudRain, Wind } from 'react-bootstrap-icons';

export default function CuacaPage() {
  const [weatherData, setWeatherData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [city, setCity] = useState('');
  const [ipCity, setIpCity] = useState('');
  const [useIpCity, setUseIpCity] = useState(true);

  // Fungsi untuk mendapatkan kota berdasarkan IP
  const fetchCityByIp = async () => {
    try {
      const response = await fetch('https://ipapi.co/json/');
      const data = await response.json();
      setIpCity(data.city || '');
    } catch (err) {
      console.error('Error getting IP-based city:', err);
    }
  };

  useEffect(() => {
    fetchCityByIp(); // Mendapatkan kota berdasarkan IP saat halaman dimuat
  }, []);

  const fetchWeather = async (cityName) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/info/cuaca?kota=${cityName}`);
      const data = await response.json();
      setWeatherData(data.result);
    } catch (err) {
      setError('Terjadi kesalahan saat mengambil data cuaca.');
    } finally {
      setLoading(false);
    }
  };

  const handleCityChange = (event) => {
    setCity(event.target.value);
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    const cityToFetch = useIpCity ? ipCity : city;
    fetchWeather(cityToFetch);
  };

  if (loading) {
    return (
      <div className="container mt-4 text-center">
        <Spinner animation="border" variant="primary" />
        <span className="ml-2">Memuat cuaca...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mt-4">
        <Alert variant="danger">{error}</Alert>
      </div>
    );
  }

  if (!weatherData) {
    return (
      <div className="container mt-4">
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
          <Button variant="primary" type="submit">
            Cari Cuaca
          </Button>
        </Form>
      </div>
    );
  }

  const { location, current } = weatherData;
  const { temp_c, temp_f, condition, humidity, wind_mph, wind_kph, feelslike_c, feelslike_f } = current;

  return (
    <div className="container mt-4">
      <h2 className="text-center">
        Cuaca di {location.name}, {location.region}, {location.country}
      </h2>

      <Card className="mt-4">
        <Card.Header>
          <CloudSun size={20} className="me-2" />
          Informasi Cuaca
        </Card.Header>
        <Card.Body>
          <div className="row">
            <div className="col-md-6">
              <h5>Suasana:</h5>
              <p>
                {condition.text}
                <img src={condition.iconUrl} alt="Cuaca" />
              </p>
            </div>

            <div className="col-md-6">
              <h5>Suhu:</h5>
              <p><ThermometerHalf size={18} className="me-2" />{temp_c}°C ({temp_f}°F)</p>
              <h5>Feels Like:</h5>
              <p>{feelslike_c}°C ({feelslike_f}°F)</p>
              <h5>Humidity:</h5>
              <p>{humidity}%</p>
              <h5>
                <Wind size={18} className="me-2" />
                Wind:
              </h5>
              <p>{wind_mph} mph ({wind_kph} kph), {current.wind_dir}</p>
            </div>
          </div>
        </Card.Body>
      </Card>

      <Button variant="link" className="mt-4" href={`https://www.google.com/maps?q=${location.name}`} target="_blank">
        Lihat Lokasi di Google Maps
      </Button>
    </div>
  );
}
