import axios from "axios";
class SpaceAPI {
  constructor(apiKey = "DEMO_KEY") {
    this.apiKey = apiKey;
  }
  async getSpaceData() {
    try {
      const earthImageResponse = await axios.get(`https://api.nasa.gov/EPIC/api/natural/images?api_key=${this.apiKey}`);
      const images = earthImageResponse.data;
      const randomIndex = Math.floor(Math.random() * images.length);
      const imageName = images[randomIndex]?.image || "N/A";
      const fullDate = images[randomIndex]?.date || "N/A";
      const [year, month, day] = fullDate.split(" ")[0].split("-");
      const imageLink = `https://epic.gsfc.nasa.gov/archive/natural/${year}/${month}/${day}/png/${imageName}.png`;
      const apodDate = fullDate.split(" ")[0];
      const apodResponse = await axios.get(`https://api.nasa.gov/planetary/apod?api_key=${this.apiKey}&date=${apodDate}`);
      const apodData = apodResponse.data;
      const issLocationResponse = await axios.get(`http://api.open-notify.org/iss-now.json`);
      const {
        latitude,
        longitude
      } = issLocationResponse.data.iss_position || {
        latitude: "N/A",
        longitude: "N/A"
      };
      const issTimestamp = new Date(issLocationResponse.data.timestamp * 1e3).toISOString() || "N/A";
      const nearEarthObjectsResponse = await axios.get(`https://api.nasa.gov/neo/rest/v1/feed/today?detailed=true&api_key=${this.apiKey}`);
      const totalNEOs = nearEarthObjectsResponse.data.element_count || 0;
      const nearEarthObjects = nearEarthObjectsResponse.data.near_earth_objects || {};
      const closestObjects = Object.values(nearEarthObjects).flat().map(obj => ({
        name: obj.name || "N/A",
        size: obj.estimated_diameter.kilometers || "N/A",
        closeApproachDate: obj.close_approach_data[0]?.close_approach_date || "N/A"
      }));
      const marsRoverResponse = await axios.get(`https://api.nasa.gov/mars-photos/api/v1/rovers/curiosity/photos?sol=1000&api_key=${this.apiKey}`);
      const marsPhotos = marsRoverResponse.data.photos || [];
      const randomMarsPhoto = marsPhotos.length > 0 ? marsPhotos[Math.floor(Math.random() * marsPhotos.length)] : null;
      const marsWeatherResponse = await axios.get(`https://api.nasa.gov/insight_weather/?api_key=${this.apiKey}&feedtype=json&ver=1.0`);
      const marsWeatherData = marsWeatherResponse.data || {};
      return {
        earthImage: {
          ...earthImageResponse.data,
          caption: images[randomIndex]?.caption || "N/A",
          fullDate: fullDate,
          link: imageLink,
          imageId: imageName
        },
        apod: {
          title: apodData.title || "N/A",
          explanation: apodData.explanation || "N/A",
          url: apodData.url || "N/A",
          hdurl: apodData.hdurl || "N/A",
          date: apodData.date || "N/A"
        },
        issLocation: {
          ...issLocationResponse.data,
          latitude: latitude,
          longitude: longitude,
          timestamp: issTimestamp
        },
        nearEarthObjects: {
          ...nearEarthObjectsResponse.data,
          total: totalNEOs,
          closest: closestObjects
        },
        marsRoverPhoto: {
          photoUrl: randomMarsPhoto ? randomMarsPhoto.img_src : "N/A",
          rover: randomMarsPhoto ? randomMarsPhoto.rover.name : "N/A",
          camera: randomMarsPhoto ? randomMarsPhoto.camera.full_name : "N/A",
          earthDate: randomMarsPhoto ? randomMarsPhoto.earth_date : "N/A"
        },
        marsWeather: marsWeatherData
      };
    } catch (error) {
      console.error(error);
      return {
        error: "An error occurred while fetching data."
      };
    }
  }
}
export default async function handler(req, res) {
  try {
    const spaceAPI = new SpaceAPI();
    const result = await spaceAPI.getSpaceData();
    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({
      error: error.message
    });
  }
}