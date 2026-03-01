import { NextResponse } from "next/server"

// Map OpenWeatherMap condition codes to simple condition strings
function mapCondition(weatherMain: string): string {
  const main = weatherMain.toLowerCase()
  if (main === "thunderstorm") return "thunderstorm"
  if (main === "drizzle" || main === "rain") return "rain"
  if (main === "snow") return "snow"
  if (main === "clouds") return "clouds"
  return "clear"
}

export async function GET() {
  const apiKey = process.env.OPENWEATHERMAP_API_KEY
  const lat = process.env.WEATHER_LAT ?? "-23.5505" // São Paulo default
  const lon = process.env.WEATHER_LON ?? "-46.6333"

  // Return mock data when API key is not configured
  if (!apiKey) {
    return NextResponse.json({
      temp: 28,
      high: 30,
      low: 22,
      description: "clear sky",
      condition: "clear",
    })
  }

  try {
    const res = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric`,
      { next: { revalidate: 900 } } // cache for 15 minutes on the server
    )

    if (!res.ok) {
      throw new Error(`OpenWeatherMap error: ${res.status}`)
    }

    const data = await res.json()

    return NextResponse.json({
      temp: Math.round(data.main.temp),
      high: Math.round(data.main.temp_max),
      low: Math.round(data.main.temp_min),
      description: data.weather[0].description as string,
      condition: mapCondition(data.weather[0].main as string),
    })
  } catch {
    // Fallback to mock data on error so the UI never breaks
    return NextResponse.json({
      temp: 28,
      high: 30,
      low: 22,
      description: "clear sky",
      condition: "clear",
    })
  }
}
