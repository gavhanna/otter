# Geo-Location Recording Feature

## Overview
Otter now supports automatic and manual geo-location tagging for audio recordings using a hybrid approach.

## How It Works

### 1. Automatic Detection (Hybrid Approach)
When a recording is created, the system attempts to detect location in this order:

1. **IP-based Geolocation** (if user hasn't manually set location)
   - Multiple services tried in sequence for reliability
   - Services: ip-api.com → ipapi.co → ipgeolocation.io → Abstract API (if key provided)
   - 5-second timeout per service
   - Fallback to timezone-based location for local development

2. **Manual Override**
   - Users can always edit location in the recording view
   - Manual entries are marked with source "manual"
   - Auto-detected entries are marked with source "ip"

### 2. Local Development
- Detects local IPs (127.0.0.1, 192.168.x.x, 10.x.x.x, 172.x.x.x)
- Uses timezone-based location mapping as fallback
- Returns meaningful location based on system timezone

## Troubleshooting IP API Failures

### Common Issues
1. **Rate Limiting**: Free services have request limits
2. **Network Issues**: Blocked connections or DNS problems
3. **Service Downtime**: Temporary service outages

### Debugging Steps
1. **Check Server Logs**: Look for detailed logging about which services are failing
2. **Test Network Connectivity**: Ensure server can reach external APIs
3. **Verify IP Headers**: Check if client IP is being properly forwarded

### Error Messages You Might See
- `⚠️ IP API returned non-success or missing city`: Service responded but no valid location
- `❌ ip-api.com failed: Network error`: Connection issue
- `All IP geolocation services failed`: All services unavailable

### Manual Testing
You can test the geolocation API directly:

```bash
# Test ip-api.com
curl "http://ip-api.com/json/?fields=status,country,regionName,city,lat,lon,message"

# Test with specific IP
curl "http://ip-api.com/json/8.8.8.8?fields=status,country,regionName,city,lat,lon,message"

# Test fallback service
curl https://httpbin.org/ip
```

## Configuration

### Environment Variables (Optional)
- `ABSTRACT_API_KEY`: Add for Abstract API service (requires free registration)
- `NODE_ENV`: Set to 'development' for local development behavior

### Service Reliability
- **ip-api.com**: Free, no key required, most reliable
- **ipapi.co**: Free tier, limited to 1000 requests/month
- **ipgeolocation.io**: Requires API key for production use
- **Abstract API**: Requires API key, 1000 free requests/month

## Privacy Considerations
- Only city-level accuracy is stored by default
- No precise GPS coordinates are collected automatically
- Users can always remove or modify location information
- Location data is stored alongside other recording metadata

## Frontend Integration
- Location appears in Recording Details section
- Inline editing with save/cancel functionality
- Visual indicators for auto-detected vs manual location
- Optimistic updates for better UX

## Database Schema
```sql
location TEXT,                    -- Formatted location string
location_latitude TEXT,           -- Latitude as string (nullable)
location_longitude TEXT,          -- Longitude as string (nullable)
location_source TEXT,             -- 'ip', 'manual', or 'geolocation'
```

## Future Enhancements
1. **Browser Geolocation API**: Could add optional precise GPS detection
2. **Reverse Geocoding**: Convert coordinates to meaningful addresses
3. **Location-based Search**: Filter recordings by location
4. **Map Integration**: Visual map representation of recording locations

## Support
If location detection isn't working:
1. Check the server console logs for detailed error messages
2. Verify network connectivity to external services
3. Ensure the recording was created after the feature was deployed
4. Manual location entry always works as a fallback