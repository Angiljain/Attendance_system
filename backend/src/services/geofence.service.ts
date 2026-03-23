// ============================================================
// Geofence Service - Validates student proximity to session location
// ============================================================

import { haversineDistance } from '../utils/haversine';

const DEFAULT_RADIUS = parseInt(process.env.GEOFENCE_RADIUS_METERS || '70', 10);

/**
 * Check if a student's GPS coordinates are within the allowed
 * radius of the session's location.
 *
 * @param studentLat - Student's latitude
 * @param studentLng - Student's longitude
 * @param sessionLat - Session location latitude
 * @param sessionLng - Session location longitude
 * @param maxMeters  - Maximum allowed distance (default: 70m)
 * @returns Object with isWithin flag and actual distance
 */
export function isWithinGeofence(
  studentLat: number,
  studentLng: number,
  sessionLat: number,
  sessionLng: number,
  maxMeters: number = DEFAULT_RADIUS
): { isWithin: boolean; distance: number } {
  const distance = haversineDistance(studentLat, studentLng, sessionLat, sessionLng);

  return {
    isWithin: distance <= maxMeters,
    distance: Math.round(distance * 100) / 100, // Round to 2 decimal places
  };
}
