import dotenv from 'dotenv';
dotenv.config();

/**
 * Single source of truth for ESG and environmental calculation factors.
 * Referenced across the backend and exposed to the frontend via /api/analytics/esg-summary.
 * 
 * Citation:
 * IPCC Climate Change and Land Special Report (Chapter 5: Food Security) &
 * FAO Food Wastage Footprint: Impacts on Natural Resources.
 * Mixed institutional food waste produces ~2.5 kg CO2 equivalent per 1 kg food waste avoided
 * (incorporating upstream embedded production emissions, transport, and avoided landfill anaerobic methane generation).
 */
export const ESG_CONSTANTS = {
  // Read from env with fallback to 2.5 kg CO2e / kg waste avoided
  CO2_FACTOR_KG_PER_KG: parseFloat(process.env.CO2_FACTOR_KG_PER_KG || '2.5'),
  
  // Standard emergency nutrition metric: average institutional meal ~ 0.4 kg
  KG_PER_MEAL: 0.4,
  
  // Average financial value recovered per kg surplus food (approx in INR or base currency)
  VALUE_PER_KG: 50.0,

  // Urgency threshold parameters in hours
  URGENCY_THRESHOLDS: {
    CRITICAL_HOURS: 2.0,
    MODERATE_HOURS: 5.0,
  },

  // Proximity matching default search radius in kilometers
  MATCHING_MAX_RADIUS_KM: 15.0,
} as const;
