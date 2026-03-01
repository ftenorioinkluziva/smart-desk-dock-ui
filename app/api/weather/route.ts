import { fetchWeatherApi } from "openmeteo"
import { NextResponse } from "next/server"

// WMO Weather Code → UI condition string
function wmoToCondition(code: number): string {
  if (code === 0 || code === 1) return "clear"
  if (code === 2 || code === 3) return "clouds"
  if (code === 45 || code === 48) return "clouds" // fog → clouds icon
  if (code >= 51 && code <= 57) return "rain"     // drizzle / freezing drizzle
  if (code >= 61 && code <= 67) return "rain"     // rain / freezing rain
  if (code >= 71 && code <= 77) return "snow"
  if (code >= 80 && code <= 82) return "rain"     // showers
  if (code === 85 || code === 86) return "snow"   // snow showers
  if (code >= 95) return "thunderstorm"
  return "clear"
}

// WMO Weather Code → human-readable description
const WMO_DESCRIPTIONS: Record<number, string> = {
  0: "clear sky",
  1: "mainly clear",
  2: "partly cloudy",
  3: "overcast",
  45: "fog",
  48: "icy fog",
  51: "light drizzle",
  53: "moderate drizzle",
  55: "dense drizzle",
  56: "light freezing drizzle",
  57: "heavy freezing drizzle",
  61: "slight rain",
  63: "moderate rain",
  65: "heavy rain",
  66: "light freezing rain",
  67: "heavy freezing rain",
  71: "slight snow",
  73: "moderate snow",
  75: "heavy snow",
  77: "snow grains",
  80: "slight showers",
  81: "moderate showers",
  82: "violent showers",
  85: "slight snow showers",
  86: "heavy snow showers",
  95: "thunderstorm",
  96: "thunderstorm with hail",
  99: "thunderstorm with heavy hail",
}

export async function GET() {
  const lat = parseFloat(process.env.WEATHER_LAT ?? "-15.886953") // Brasília default
  const lon = parseFloat(process.env.WEATHER_LON ?? "-47.813873")
  const timezone = process.env.WEATHER_TIMEZONE ?? "America/Sao_Paulo"

  try {
    const responses = await fetchWeatherApi("https://api.open-meteo.com/v1/forecast", {
      latitude: lat,
      longitude: lon,
      timezone,
      forecast_days: 1,
      // Order matters — variables() index matches declaration order
      current: ["temperature_2m", "weather_code"],
      daily: ["temperature_2m_max", "temperature_2m_min"],
    })

    const response = responses[0]
    const current = response.current()!
    const daily = response.daily()!

    const temp = Math.round(current.variables(0)!.value())          // temperature_2m
    const weatherCode = Math.round(current.variables(1)!.value())   // weather_code
    const high = Math.round(daily.variables(0)!.valuesArray()![0])  // temp_max today
    const low = Math.round(daily.variables(1)!.valuesArray()![0])   // temp_min today

    return NextResponse.json({
      temp,
      high,
      low,
      description: WMO_DESCRIPTIONS[weatherCode] ?? "clear sky",
      condition: wmoToCondition(weatherCode),
    })
  } catch {
    // Fallback so the UI never breaks
    return NextResponse.json({
      temp: 28,
      high: 30,
      low: 18,
      description: "clear sky",
      condition: "clear",
    })
  }
}
