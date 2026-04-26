export type Geofence = {
  id: string
  name: string
  city: string
  country: string
  country_code: string
  timezone: string
  language: string
  lat: number
  lng: number
  radius_km: number
  local_sources: {
    news_keywords: string[]
    official_sites: string[]
    patrol_prompt: string
    emergency: {
      police: string
      ambulance: string
      fire: string
      tourist_police?: string
    }
  }
  form_types: string[]
  currency: string
  currency_symbol: string
  calling_code: string
}

export type UserLocation = {
  user_id: string
  city: string
  country: string
  country_code: string
  timezone: string
  lat: number
  lng: number
  geofence_id: string
  geofence_name: string
  local_config: {
    news_keywords: string[]
    official_sites: string[]
    patrol_prompt: string
    emergency: Record<string, string>
    form_types: string[]
    currency: string
    currency_symbol: string
    calling_code: string
  }
  source: 'manual' | 'gps' | 'ip' | 'default'
  accuracy: 'high' | 'medium' | 'low'
}
