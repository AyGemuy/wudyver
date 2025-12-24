import axios from "axios";
const ENDPOINT = "https://graphql.aws.mapquest.com/";
const HEADERS = {
  accept: "application/graphql-response+json, application/graphql+json, application/json, text/event-stream, multipart/mixed",
  "accept-language": "en-US,en;q=0.9",
  "content-type": "application/json",
  origin: "https://www.mapquest.com",
  priority: "u=1, i",
  referer: "https://www.mapquest.com/",
  "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99"',
  "sec-ch-ua-mobile": "?0",
  "sec-fetch-dest": "empty",
  "sec-fetch-mode": "cors",
  "sec-fetch-site": "same-site",
  "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36",
  "x-graphql-client-name": "com.mapquest.consumer",
  "x-graphql-client-version": "2.0.0-client"
};
const QUERIES = {
  SearchQuery: `
    query SearchQuery($coordinates: GeoPointInput!, $filter: SearchInput!, $first: Int = 20) {
      search(near: $coordinates, filter: $filter, first: $first, searchInfosheets: true, useLibpostal: true) {
        searchTerm
        nodes {
          ... on Place {
            id
            name
            coordinates { latitude longitude __typename }
            description
            location { street secondary region postcode locality __typename }
            url
            __typename
          }
          ... on GenericBusiness {
            categories(withUrlOnly: true) {
              nodes { name __typename }
              primary { node { name __typename } __typename }
              __typename
            }
            phone
            photos { primary { caption url __typename } __typename }
            provenance {
              nodes { id type context { id type __typename } __typename }
              totalCount
              __typename
            }
            price
            rating { provider value __typename }
            reviews { totalCount nodes { body __typename } __typename }
            __typename
          }
          __typename
        }
        __typename
      }
    }`,
  GetUserLocation: `
    query GetUserLocation {
      viewer {
        location {
          accuracyRadius
          coordinates { latitude longitude __typename }
          country
          region
          locality
          isInEuropeanUnion
          timeZone
          __typename
        }
        __typename
      }
    }`,
  DirectionsPOI: `
    query DirectionsPOI($id: ID!) {
      place(id: $id) {
        __typename
        id
        name
        url
        coordinates { latitude longitude }
        location { country street secondary region locality postcode formatted }
      }
    }`,
  GetSuggestions: `
    query GetSuggestions($coordinates: GeoPointInput!, $categories: Boolean, $query: NonEmptyString!, $useFacets: Boolean, $hereBeforeFacets: Boolean, $searchInfosheets: Boolean) {
      autosuggest(
        categories: $categories
        near: $coordinates
        query: $query
        first: 7
        useFacets: $useFacets
        hereBeforeFacets: $hereBeforeFacets
        searchInfosheets: $searchInfosheets
      ) {
        refinements(limit: 1) { text start end }
        edges {
          textMatches { fragment highlights { begin end } }
          node {
            ... on PlaceBrand { id name url }
            ... on PlaceCategory { id name url }
            ... on Place {
              id
              name
              location { formatted }
              coordinates { latitude longitude }
              url
            }
          }
        }
      }
    }`,
  GetAddress: `
    query GetAddress($at: GeoPointInput!) {
      address(at: $at) {
        url
        name
        coordinates { latitude longitude }
        location { street secondary region postcode locality formatted county country }
      }
    }`,
  GetRoutes: `
    query GetRoutes(
      $mode: RoutingMode!,
      $origin: GeoPointInput!,
      $destination: GeoPointInput!,
      $waypoints: [GeoPointInput!],
      $options: RouteOptions,
      $schedule: RouteScheduleInput,
      $alternatives: Int
    ) {
      routes(
        input: {
          mode: $mode
          origin: $origin
          destination: $destination
          waypoints: $waypoints
          options: $options
          schedule: $schedule
        }
        alternatives: $alternatives
      ) {
        summary {
          distance { value unit }
          durationInSeconds
          delayInSeconds
          elevationGain
          elevationLoss
          schedule { arrival departure }
        }
        polyline
        labels
        legs {
          summary {
            distance { value unit }
            durationInSeconds
            delayInSeconds
          }
          steps {
            instruction
            turnType
            direction
            streetName
            startPoint { latitude longitude }
            distance { value unit }
            duration
          }
        }
        mapView {
          bounds {
            ne { latitude longitude }
            sw { latitude longitude }
          }
          center { latitude longitude }
          zoom
        }
        features { geometry properties type }
        trafficImpact
      }
    }`,
  InfosheetInput: `
    query InfosheetInput($input: AddressInput, $at: GeoPointInput, $id: String) {
      address(input: $input, at: $at, id: $id) {
        name
        url
        description(format: HTML)
        coordinates { latitude longitude }
        location { country street locality region postcode formatted }
      }
    }`
};
class MapQuest {
  constructor() {
    this.api = axios.create({
      baseURL: ENDPOINT,
      headers: HEADERS,
      timeout: 15e3
    });
  }
  async req({
    op,
    query,
    vars
  }) {
    const start = Date.now();
    console.log(`[REQ] Op: ${op} | Keys: ${Object.keys(vars || {}).join(",")}`);
    try {
      const {
        data
      } = await this.api.post("", {
        operationName: op,
        query: query,
        variables: vars || {}
      });
      const graphErrors = data?.errors;
      if (graphErrors) {
        console.error(`[ERR] GraphQL in ${op}:`, graphErrors?.[0]?.message || "Unknown Error");
        throw new Error(graphErrors?.[0]?.message || "GraphQL Error");
      }
      console.log(`[OK] ${op} - ${Date.now() - start}ms`);
      return data?.data || {};
    } catch (error) {
      const msg = error?.response?.data ? JSON.stringify(error.response.data) : error.message || "Unknown Network Error";
      console.error(`[FATAL] Request ${op} Failed:`, msg);
      throw new Error(`MapQuest API Error: ${msg}`);
    }
  }
  async locate() {
    return await this.req({
      op: "GetUserLocation",
      query: QUERIES.GetUserLocation
    });
  }
  async search({
    q,
    lat,
    lng,
    limit
  }) {
    return await this.req({
      op: "SearchQuery",
      query: QUERIES.SearchQuery,
      vars: {
        coordinates: {
          latitude: lat,
          longitude: lng
        },
        filter: {
          query: q
        },
        first: limit || 20
      }
    });
  }
  async suggest({
    q,
    lat,
    lng
  }) {
    return await this.req({
      op: "GetSuggestions",
      query: QUERIES.GetSuggestions,
      vars: {
        coordinates: {
          latitude: lat,
          longitude: lng
        },
        query: q,
        categories: true,
        useFacets: true,
        hereBeforeFacets: true,
        searchInfosheets: true
      }
    });
  }
  async reverse({
    lat,
    lng
  }) {
    return await this.req({
      op: "GetAddress",
      query: QUERIES.GetAddress,
      vars: {
        at: {
          latitude: lat,
          longitude: lng
        }
      }
    });
  }
  async route({
    fromLat,
    fromLng,
    toLat,
    toLng,
    mode,
    unit
  }) {
    return await this.req({
      op: "GetRoutes",
      query: QUERIES.GetRoutes,
      vars: {
        mode: mode || "CAR",
        origin: {
          latitude: fromLat,
          longitude: fromLng
        },
        destination: {
          latitude: toLat,
          longitude: toLng
        },
        waypoints: [],
        options: {
          unit: unit || "KM",
          avoid: []
        },
        alternatives: 1
      }
    });
  }
  async place({
    id
  }) {
    return await this.req({
      op: "DirectionsPOI",
      query: QUERIES.DirectionsPOI,
      vars: {
        id: id
      }
    });
  }
  async info({
    id,
    lat,
    lng,
    input
  }) {
    const at = lat && lng ? {
      latitude: lat,
      longitude: lng
    } : null;
    return await this.req({
      op: "InfosheetInput",
      query: QUERIES.InfosheetInput,
      vars: {
        id: id || null,
        at: at,
        input: input || null
      }
    });
  }
}
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  if (!action) {
    return res.status(400).json({
      error: "Parameter 'action' wajib diisi."
    });
  }
  const api = new MapQuest();
  try {
    let response;
    switch (action) {
      case "locate":
        response = await api.locate();
        break;
      case "search":
        if (!params.q || !params.lat || !params.lng) {
          return res.status(400).json({
            error: "Parameter 'q', 'lat', dan 'lng' wajib diisi untuk action 'search'."
          });
        }
        response = await api.search(params);
        break;
      case "suggest":
        if (!params.q || !params.lat || !params.lng) {
          return res.status(400).json({
            error: "Parameter 'q', 'lat', dan 'lng' wajib diisi untuk action 'suggest'."
          });
        }
        response = await api.suggest(params);
        break;
      case "reverse":
        if (!params.lat || !params.lng) {
          return res.status(400).json({
            error: "Parameter 'lat' dan 'lng' wajib diisi untuk action 'reverse'."
          });
        }
        response = await api.reverse(params);
        break;
      case "route":
        if (!params.fromLat || !params.fromLng || !params.toLat || !params.toLng) {
          return res.status(400).json({
            error: "Parameter 'fromLat', 'fromLng', 'toLat', dan 'toLng' wajib diisi untuk action 'route'."
          });
        }
        response = await api.route(params);
        break;
      case "place":
        if (!params.id) {
          return res.status(400).json({
            error: "Parameter 'id' wajib diisi untuk action 'place'."
          });
        }
        response = await api.place(params);
        break;
      case "info":
        if (!params.id && (!params.lat || !params.lng)) {
          return res.status(400).json({
            error: "Action 'info' membutuhkan 'id' ATAU ('lat' dan 'lng')."
          });
        }
        response = await api.info(params);
        break;
      default:
        return res.status(400).json({
          error: `Action tidak valid: ${action}. Action yang didukung: 'locate', 'search', 'suggest', 'reverse', 'route', 'place', 'info'.`
        });
    }
    return res.status(200).json(response);
  } catch (error) {
    console.error(`[FATAL ERROR] Kegagalan pada action '${action}':`, error);
    return res.status(500).json({
      error: error.message || "Terjadi kesalahan internal pada server."
    });
  }
}