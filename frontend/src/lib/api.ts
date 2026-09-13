/**
 * FoodSave Typed API Client
 * Reads base URL dynamically from NEXT_PUBLIC_API_URL.
 * NEVER hardcodes localhost.
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('foodsave_token');
}

export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const url = `${API_BASE}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  const response = await fetch(url, {
    ...options,
    headers,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || data.message || `Request failed with status ${response.status}`);
  }

  return data as T;
}

// ── Authentication API ──────────────────────────────
export interface UserProfile {
  id: string;
  name: string;
  email: string;
  type: 'KITCHEN' | 'FOOD_PROCESSOR' | 'NGO' | 'LOGISTICS';
  latitude: number;
  longitude: number;
  address: string;
  contactPhone?: string;
  capacityKg?: number;
}

export interface AuthResponse {
  message: string;
  token: string;
  user: UserProfile;
}

export const authApi = {
  login: (data: { email: string; password: string }) =>
    apiRequest<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  register: (data: any) =>
    apiRequest<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getProfile: () => apiRequest<{ user: UserProfile }>('/auth/me'),
};

// ── Surplus Listings API ─────────────────────────────
export interface SurplusItem {
  id: string;
  donorId: string;
  title: string;
  foodCategory: string;
  quantityKg: number;
  preparedAt: string;
  safeUntil: string;
  storageCondition: 'ROOM_TEMP' | 'CHILLED' | 'HOT';
  status: 'AVAILABLE' | 'RESERVED' | 'CLAIMED' | 'EXPIRED';
  notes?: string;
  donor: {
    id: string;
    name: string;
    address: string;
    latitude: number;
    longitude: number;
    contactPhone: string;
  };
  remainingShelfLifeHours: number;
  distanceKm?: number | null;
  urgency: 'CRITICAL' | 'MODERATE' | 'STABLE';
  urgencyColor: string;
}

export const listingsApi = {
  getActive: (params?: { latitude?: number; longitude?: number; maxDistanceKm?: number; category?: string }) => {
    const query = new URLSearchParams();
    if (params?.latitude !== undefined) query.set('latitude', params.latitude.toString());
    if (params?.longitude !== undefined) query.set('longitude', params.longitude.toString());
    if (params?.maxDistanceKm) query.set('maxDistanceKm', params.maxDistanceKm.toString());
    if (params?.category) query.set('category', params.category);
    return apiRequest<{ total: number; listings: SurplusItem[] }>(`/listings/active?${query.toString()}`);
  },

  create: (data: {
    title: string;
    foodCategory: string;
    quantityKg: number;
    preparedAt: string;
    safeUntil: string;
    storageCondition: 'ROOM_TEMP' | 'CHILLED' | 'HOT';
    notes?: string;
  }) =>
    apiRequest<{ message: string; listing: SurplusItem }>('/listings', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getMyListings: () => apiRequest<{ listings: any[] }>('/listings/donor/my'),
};

// ── Claims & Verification API ────────────────────────
export const claimsApi = {
  claimListing: (listingId: string) =>
    apiRequest<any>(`/claims/${listingId}/claim`, {
      method: 'POST',
    }),

  verifyHandover: (claimId: string, data: { pickupOtp?: string; qrCodeToken?: string }) =>
    apiRequest<any>(`/claims/${claimId}/verify-handover`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getMyClaims: () => apiRequest<{ claims: any[] }>('/claims/recipient/my'),
};

// ── ESG & Analytics API ──────────────────────────────
export interface ESGSummaryResponse {
  summary: {
    totalKgRescued: number;
    co2AvoidedKg: number;
    mealsProvided: number;
    estimatedValueSaved: number;
    activeListingsCount: number;
    totalDonorsCount: number;
    totalNgosCount: number;
  };
  constants: {
    co2FactorKgPerKg: number;
    kgPerMeal: number;
    citation: string;
  };
  categoryBreakdown: Record<string, number>;
}

export const analyticsApi = {
  getESGSummary: () => apiRequest<ESGSummaryResponse>('/analytics/esg-summary'),
};

// ── Waste Logs & ML Forecasting API ──────────────────
export const wasteApi = {
  getLogs: () => apiRequest<{ logs: any[] }>('/waste-logs'),
  
  createLog: (data: any) =>
    apiRequest<any>('/waste-logs', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  predictPrep: (data: {
    expectedAttendanceCount: number;
    dayOfWeek: string;
    mealType: 'breakfast' | 'lunch' | 'dinner';
    isHolidayOrEvent: boolean;
  }) =>
    apiRequest<any>('/waste-logs/predict-prep', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  predictShelfLife: (data: {
    foodCategory: string;
    ambientTempC: number;
  }) =>
    apiRequest<any>('/waste-logs/predict-shelf-life', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};
