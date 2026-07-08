import { Router } from 'express';
import axios from 'axios';
import { successResponse, errorResponse } from '@improveit/common';
import { logger } from '../utils/logger';
import { db } from '../db';

const router = Router();

const NOMINATIM_URL = process.env.NOMINATIM_URL || 'https://nominatim.openstreetmap.org';

// Geocode: Address to coordinates
router.get('/geocode', async (req, res) => {
  try {
    const { address } = req.query;

    if (!address) {
      return res.status(400).json(
        errorResponse('VALIDATION_ERROR', 'Address parameter is required')
      );
    }

    const response = await axios.get(`${NOMINATIM_URL}/search`, {
      params: {
        q: address,
        format: 'json',
        limit: 5,
      },
      headers: {
        'User-Agent': 'ImproveIt.Today/1.0',
      },
    });

    if (!response.data || response.data.length === 0) {
      return res.status(404).json(
        errorResponse('NOT_FOUND', 'Location not found')
      );
    }

    const results = response.data.map((item: any) => ({
      displayName: item.display_name,
      latitude: parseFloat(item.lat),
      longitude: parseFloat(item.lon),
      type: item.type,
      importance: item.importance,
    }));

    logger.info(`Geocoded address: ${address}`);

    return res.json(successResponse(results));
  } catch (error: any) {
    logger.error('Geocoding error:', error);
    return res.status(500).json(
      errorResponse('INTERNAL_ERROR', 'Failed to geocode address')
    );
  }
});

// Reverse geocode: Coordinates to address
router.get('/reverse-geocode', async (req, res) => {
  try {
    const { latitude, longitude } = req.query;

    if (!latitude || !longitude) {
      return res.status(400).json(
        errorResponse('VALIDATION_ERROR', 'Latitude and longitude are required')
      );
    }

    const lat = parseFloat(latitude as string);
    const lon = parseFloat(longitude as string);

    const response = await axios.get(`${NOMINATIM_URL}/reverse`, {
      params: {
        lat,
        lon,
        format: 'json',
      },
      headers: {
        'User-Agent': 'ImproveIt.Today/1.0',
      },
    });

    if (!response.data) {
      return res.status(404).json(
        errorResponse('NOT_FOUND', 'Address not found for coordinates')
      );
    }

    const result = {
      displayName: response.data.display_name,
      address: response.data.address,
      latitude: lat,
      longitude: lon,
    };

    logger.info(`Reverse geocoded: ${lat}, ${lon}`);

    return res.json(successResponse(result));
  } catch (error: any) {
    logger.error('Reverse geocoding error:', error);
    return res.status(500).json(
      errorResponse('INTERNAL_ERROR', 'Failed to reverse geocode')
    );
  }
});

// Find jurisdiction for coordinates
router.get('/jurisdiction', async (req, res) => {
  try {
    const { latitude, longitude } = req.query;

    if (!latitude || !longitude) {
      return res.status(400).json(
        errorResponse('VALIDATION_ERROR', 'Latitude and longitude are required')
      );
    }

    const lat = parseFloat(latitude as string);
    const lon = parseFloat(longitude as string);

    // Find jurisdiction using PostGIS ST_Within
    const result = await db.query(
      `SELECT id, name, type
       FROM jurisdictions
       WHERE ST_Within(
         ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography,
         boundary
       )
       ORDER BY type DESC
       LIMIT 1`,
      [lon, lat]
    );

    if (result.rows.length === 0) {
      // Try to fetch from Nominatim if not in database
      const nominatimResponse = await axios.get(`${NOMINATIM_URL}/reverse`, {
        params: {
          lat,
          lon,
          format: 'json',
        },
        headers: {
          'User-Agent': 'ImproveIt.Today/1.0',
        },
      });

      if (nominatimResponse.data && nominatimResponse.data.address) {
        const address = nominatimResponse.data.address;

        return res.json(successResponse({
          source: 'nominatim',
          city: address.city || address.town || address.village,
          state: address.state,
          country: address.country,
          countryCode: address.country_code,
        }));
      }

      return res.status(404).json(
        errorResponse('NOT_FOUND', 'No jurisdiction found for coordinates')
      );
    }

    logger.info(`Found jurisdiction: ${result.rows[0].name}`);

    return res.json(successResponse({
      source: 'database',
      ...result.rows[0],
    }));
  } catch (error: any) {
    logger.error('Find jurisdiction error:', error);
    return res.status(500).json(
      errorResponse('INTERNAL_ERROR', 'Failed to find jurisdiction')
    );
  }
});

// Calculate distance between two points
router.get('/distance', async (req, res) => {
  try {
    const { lat1, lon1, lat2, lon2 } = req.query;

    if (!lat1 || !lon1 || !lat2 || !lon2) {
      return res.status(400).json(
        errorResponse('VALIDATION_ERROR', 'All coordinates are required')
      );
    }

    const result = await db.query(
      `SELECT ST_Distance(
        ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography,
        ST_SetSRID(ST_MakePoint($3, $4), 4326)::geography
      ) as distance`,
      [parseFloat(lon1 as string), parseFloat(lat1 as string),
       parseFloat(lon2 as string), parseFloat(lat2 as string)]
    );

    const distanceMeters = result.rows[0].distance;

    return res.json(successResponse({
      distanceMeters: Math.round(distanceMeters),
      distanceKilometers: (distanceMeters / 1000).toFixed(2),
      distanceMiles: (distanceMeters / 1609.34).toFixed(2),
    }));
  } catch (error: any) {
    logger.error('Distance calculation error:', error);
    return res.status(500).json(
      errorResponse('INTERNAL_ERROR', 'Failed to calculate distance')
    );
  }
});

export default router;
