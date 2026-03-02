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

const WEEKDAY_LABELS = ["DOM.", "SEG.", "TER.", "QUA.", "QUI.", "SEX.", "SÁB."] as const

function dateToWeekdayLabel(date: string): string {
  const [year, month, day] = date.split("-").map(Number)
  const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay()
  return WEEKDAY_LABELS[weekday] ?? "---"
}

export async function GET() {
  const lat = parseFloat(process.env.WEATHER_LAT ?? "-15.886953") // Brasília default
  const lon = parseFloat(process.env.WEATHER_LON ?? "-47.813873")
  const timezone = process.env.WEATHER_TIMEZONE ?? "America/Sao_Paulo"
  const location = process.env.WEATHER_LOCATION ?? "Brasília"

  try {
    const params = new URLSearchParams({
      latitude: lat.toString(),
      longitude: lon.toString(),
      timezone,
      forecast_days: "5",
      current: "temperature_2m,weather_code",
      daily: "weather_code,temperature_2m_max,temperature_2m_min",
    })

    const response = await fetch(`https://api.open-meteo.com/v1/forecast?${params.toString()}`, {
      next: { revalidate: 900 },
    })

    if (!response.ok) {
      throw new Error("Weather API request failed")
    }

    const data = await response.json() as {
      current: {
        temperature_2m: number
        weather_code: number
      }
      daily: {
        time: string[]
        weather_code: number[]
        temperature_2m_max: number[]
        temperature_2m_min: number[]
      }
    }

    const temp = Math.round(data.current.temperature_2m)
    const weatherCode = Math.round(data.current.weather_code)
    const high = Math.round(data.daily.temperature_2m_max[0])
    const low = Math.round(data.daily.temperature_2m_min[0])

    const forecast = data.daily.time.map((date, index) => {
      return {
        day: dateToWeekdayLabel(date),
        low: Math.round(data.daily.temperature_2m_min[index]),
        high: Math.round(data.daily.temperature_2m_max[index]),
        condition: wmoToCondition(Math.round(data.daily.weather_code[index])),
      }
    })

    return NextResponse.json({
      location,
      temp,
      high,
      low,
      description: WMO_DESCRIPTIONS[weatherCode] ?? "clear sky",
      condition: wmoToCondition(weatherCode),
      forecast,
    })
  } catch {
    // Fallback so the UI never breaks
    return NextResponse.json({
      location,
      temp: 28,
      high: 30,
      low: 18,
      description: "clear sky",
      condition: "clear",
      forecast: [
        { day: "DOM.", low: 18, high: 30, condition: "clear" },
        { day: "SEG.", low: 19, high: 31, condition: "clear" },
        { day: "TER.", low: 20, high: 29, condition: "clouds" },
        { day: "QUA.", low: 19, high: 28, condition: "rain" },
        { day: "QUI.", low: 18, high: 30, condition: "clear" },
      ],
    })
  }
}
