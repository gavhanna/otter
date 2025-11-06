export interface LocationData {
  city?: string;
  region?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
}

export interface IpApiResponse {
  status: string;
  country?: string;
  countryCode?: string;
  region?: string;
  regionName?: string;
  city?: string;
  zip?: string;
  lat?: number;
  lon?: number;
  timezone?: string;
  isp?: string;
  org?: string;
  as?: string;
  query?: string;
}

export async function getLocationFromIp(ip?: string): Promise<LocationData | null> {
  // Try multiple IP geolocation services in order of preference

  // Service 1: ip-api.com (free, no API key required)
  try {
    const url = ip
      ? `http://ip-api.com/json/${ip}?fields=status,country,regionName,city,lat,lon,message`
      : 'http://ip-api.com/json/?fields=status,country,regionName,city,lat,lon,message';

    console.log(`Trying ip-api.com with IP: ${ip || 'auto-detect'}`);
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Otter-Recorder/1.0'
      },
      signal: AbortSignal.timeout(5000) // 5 second timeout
    });

    if (response.ok) {
      const data: IpApiResponse = await response.json();
      console.log('ip-api.com response:', JSON.stringify(data, null, 2));

      if (data.status === 'success' && data.city) {
        console.log('✓ ip-api.com success:', data.city);
        return {
          city: data.city,
          region: data.regionName,
          country: data.country,
          latitude: data.lat,
          longitude: data.lon,
        };
      } else {
        console.warn('⚠️ IP API returned non-success or missing city:', data);
      }
    } else {
      console.warn(`⚠️ ip-api.com HTTP error: ${response.status} ${response.statusText}`);
    }
  } catch (error) {
    console.warn('❌ ip-api.com failed:', error instanceof Error ? error.message : error);
  }

  // Service 2: ipapi.co (free tier, limited requests)
  try {
    const url = ip
      ? `https://ipapi.co/${ip}/json/?format=json`
      : 'https://ipapi.co/json/?format=json';

    const response = await fetch(url, {
      signal: AbortSignal.timeout(5000)
    });

    if (response.ok) {
      const data = await response.json();

      if (data.city && !data.error) {
        return {
          city: data.city,
          region: data.region,
          country: data.country_name,
          latitude: data.latitude,
          longitude: data.longitude,
        };
      }
    }
  } catch (error) {
    console.warn('ipapi.co failed:', error instanceof Error ? error.message : error);
  }

  // Service 3: ipgeolocation.io (free tier requires API key, but basic info might work)
  try {
    const url = ip
      ? `https://api.ipgeolocation.io/ipgeo?apiKey=free&ip=${ip}`
      : 'https://api.ipgeolocation.io/ipgeo?apiKey=free';

    const response = await fetch(url, {
      signal: AbortSignal.timeout(5000)
    });

    if (response.ok) {
      const data = await response.json();

      if (data.city) {
        return {
          city: data.city,
          region: data.state_prov,
          country: data.country_name,
          latitude: parseFloat(data.latitude),
          longitude: parseFloat(data.longitude),
        };
      }
    }
  } catch (error) {
    console.warn('ipgeolocation.io failed:', error instanceof Error ? error.message : error);
  }

  // Service 4: Abstract API (requires free API key for production)
  try {
    const url = `https://ipgeolocation.abstractapi.com/v1/?api_key=${process.env.ABSTRACT_API_KEY || 'free'}`;

    if (process.env.ABSTRACT_API_KEY) {
      const response = await fetch(url, {
        signal: AbortSignal.timeout(5000)
      });

      if (response.ok) {
        const data = await response.json();

        if (data.city) {
          return {
            city: data.city,
            region: data.region,
            country: data.country,
            latitude: data.latitude,
            longitude: data.longitude,
          };
        }
      }
    }
  } catch (error) {
    console.warn('Abstract API failed:', error instanceof Error ? error.message : error);
  }

  // Service 5: Very simple fallback - just try to get basic info
  try {
    console.log('Trying simple geolocation fallback...');
    const response = await fetch('https://httpbin.org/ip', {
      signal: AbortSignal.timeout(3000)
    });

    if (response.ok) {
      const { origin } = await response.json();
      console.log('Public IP detected:', origin);

      // If we got an IP but no location, at least record that we tried
      return {
        city: 'Unknown',
        region: 'Location',
        country: 'Unknown',
        latitude: undefined,
        longitude: undefined,
      };
    }
  } catch (error) {
    console.warn('Simple fallback failed:', error instanceof Error ? error.message : error);
  }

  console.warn('All IP geolocation services failed or returned incomplete data');
  return null;
}

export function formatLocation(location: LocationData | null): string {
  if (!location) return '';

  const parts: string[] = [];

  if (location.city) {
    parts.push(location.city);
  }

  if (location.region && location.region !== location.city) {
    parts.push(location.region);
  }

  if (location.country && (!location.city || location.country !== 'United States')) {
    parts.push(location.country);
  }

  return parts.join(', ');
}

export function isLocalDevelopment(request?: any): boolean {
  // Check for common local development indicators
  const ip = request?.ip || request?.connection?.remoteAddress;
  const forwarded = request?.headers?.['x-forwarded-for'] || request?.headers?.['x-real-ip'];

  return (
    process.env.NODE_ENV === 'development' ||
    ip === '127.0.0.1' ||
    ip === '::1' ||
    ip?.startsWith('192.168.') ||
    ip?.startsWith('10.') ||
    ip?.startsWith('172.') ||
    forwarded === '127.0.0.1' ||
    forwarded?.startsWith('192.168.') ||
    forwarded?.startsWith('10.') ||
    forwarded?.startsWith('172.')
  );
}

export async function getLocalDevelopmentLocation(): Promise<LocationData | null> {
  // For local development, return a placeholder location

  // Try to get a more meaningful location based on timezone or system info
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  // Simple timezone to location mapping
  const timezoneToLocation: Record<string, LocationData> = {
    'America/New_York': { city: 'New York', region: 'NY', country: 'United States', latitude: 40.7128, longitude: -74.0060 },
    'America/Chicago': { city: 'Chicago', region: 'IL', country: 'United States', latitude: 41.8781, longitude: -87.6298 },
    'America/Denver': { city: 'Denver', region: 'CO', country: 'United States', latitude: 39.7392, longitude: -104.9903 },
    'America/Los_Angeles': { city: 'Los Angeles', region: 'CA', country: 'United States', latitude: 34.0522, longitude: -118.2437 },
    'America/Toronto': { city: 'Toronto', region: 'ON', country: 'Canada', latitude: 43.6532, longitude: -79.3832 },
    'America/Vancouver': { city: 'Vancouver', region: 'BC', country: 'Canada', latitude: 49.2827, longitude: -123.1207 },
    'Europe/London': { city: 'London', region: 'England', country: 'United Kingdom', latitude: 51.5074, longitude: -0.1278 },
    'Europe/Paris': { city: 'Paris', region: 'Île-de-France', country: 'France', latitude: 48.8566, longitude: 2.3522 },
    'Europe/Berlin': { city: 'Berlin', region: 'Berlin', country: 'Germany', latitude: 52.5200, longitude: 13.4050 },
    'Asia/Tokyo': { city: 'Tokyo', region: 'Tokyo', country: 'Japan', latitude: 35.6762, longitude: 139.6503 },
    'Asia/Shanghai': { city: 'Shanghai', region: 'Shanghai', country: 'China', latitude: 31.2304, longitude: 121.4737 },
    'Asia/Kolkata': { city: 'Mumbai', region: 'Maharashtra', country: 'India', latitude: 19.0760, longitude: 72.8777 },
    'Australia/Sydney': { city: 'Sydney', region: 'NSW', country: 'Australia', latitude: -33.8688, longitude: 151.2093 },
  };

  return timezoneToLocation[timezone] || {
    city: 'Local',
    region: 'Development',
    country: 'Environment',
    latitude: 37.7749,
    longitude: -122.4194, // San Francisco as fallback
  };
}