import { z } from "zod"
import type { UserProfile } from "@/lib/operations/contracts"
import { OperationFailure, upstreamError } from "@/lib/operations/errors"

const openMeteoResponseSchema = z.object({
  current: z.object({
    temperature_2m: z.number().finite(),
    weather_code: z.number().finite(),
  }),
  daily: z.object({
    time: z.array(z.string()),
    weather_code: z.array(z.number().finite()),
    temperature_2m_max: z.array(z.number().finite()),
    temperature_2m_min: z.array(z.number().finite()),
  }),
  hourly: z.object({
    time: z.array(z.string()),
    temperature_2m: z.array(z.number().finite()),
    weather_code: z.array(z.number().finite()),
    precipitation_probability: z.array(z.number().finite()).optional(),
  }).optional(),
}).passthrough()

const WMO_DESCRIPTIONS: Record<number, string> = {
  0: "clear sky", 1: "mainly clear", 2: "partly cloudy", 3: "overcast",
  45: "fog", 48: "icy fog", 51: "light drizzle", 53: "moderate drizzle",
  55: "dense drizzle", 56: "light freezing drizzle", 57: "heavy freezing drizzle",
  61: "slight rain", 63: "moderate rain", 65: "heavy rain", 66: "light freezing rain",
  67: "heavy freezing rain", 71: "slight snow", 73: "moderate snow", 75: "heavy snow",
  77: "snow grains", 80: "slight showers", 81: "moderate showers", 82: "violent showers",
  85: "slight snow showers", 86: "heavy snow showers", 95: "thunderstorm",
  96: "thunderstorm with hail", 99: "thunderstorm with heavy hail",
}

const WEEKDAY_LABELS = ["DOM.", "SEG.", "TER.", "QUA.", "QUI.", "SEX.", "SÁB."] as const

export type WeatherForecast = {
  location: string
  temp: number
  high: number
  low: number
  description: string
  condition: string
  forecast: Array<{ day: string; date: string; low: number; high: number; condition: string }>
  hourly?: Array<{ time: string; temp: number; precipitationProbability: number | null; condition: string }>
  mock?: boolean
}

function wmoToCondition(code: number): string {
  if (code <= 1) return "clear"
  if ((code >= 2 && code <= 3) || code === 45 || code === 48) return "clouds"
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return "rain"
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return "snow"
  if (code >= 95) return "thunderstorm"
  return "clear"
}

function dateToWeekdayLabel(date: string): string {
  const [year, month, day] = date.split("-").map(Number)
  return WEEKDAY_LABELS[new Date(Date.UTC(year, month - 1, day)).getUTCDay()] ?? "---"
}

export async function getWeatherForecast(
  profile: UserProfile,
  includeHourly: boolean,
  fetcher: typeof fetch = fetch,
): Promise<WeatherForecast> {
  const params = new URLSearchParams({
    latitude: profile.weatherLat.toString(),
    longitude: profile.weatherLon.toString(),
    timezone: profile.weatherTimezone,
    forecast_days: "5",
    current: "temperature_2m,weather_code",
    daily: "weather_code,temperature_2m_max,temperature_2m_min",
  })
  if (includeHourly) params.set("hourly", "temperature_2m,weather_code,precipitation_probability")

  const response = await fetcher(`https://api.open-meteo.com/v1/forecast?${params.toString()}`, {
    next: { revalidate: 900 },
    signal: AbortSignal.timeout(10_000),
  })
  if (!response.ok) {
    throw new OperationFailure(upstreamError("WEATHER_REQUEST_FAILED", "Weather provider request failed", {
      retryable: response.status === 429 || response.status >= 500,
    }))
  }

  const parsed = openMeteoResponseSchema.safeParse(await response.json())
  if (!parsed.success) {
    throw new OperationFailure(upstreamError("WEATHER_RESPONSE_INVALID", "Weather provider returned an invalid response", {
      retryable: false,
    }))
  }
  const data = parsed.data
  if (!data.daily.time.length || !data.daily.temperature_2m_max.length || !data.daily.temperature_2m_min.length) {
    throw new OperationFailure(upstreamError("WEATHER_RESPONSE_INCOMPLETE", "Weather provider returned incomplete forecast data", {
      retryable: true,
    }))
  }

  const weatherCode = Math.round(data.current.weather_code)
  const forecast = data.daily.time.map((date, index) => ({
    day: dateToWeekdayLabel(date),
    date: date.split("-")[2] ?? "--",
    low: Math.round(data.daily.temperature_2m_min[index] ?? data.daily.temperature_2m_min[0]),
    high: Math.round(data.daily.temperature_2m_max[index] ?? data.daily.temperature_2m_max[0]),
    condition: wmoToCondition(Math.round(data.daily.weather_code[index] ?? weatherCode)),
  }))
  const hourly = includeHourly && data.hourly
    ? data.hourly.time.map((time, index) => ({
        time,
        temp: Math.round(data.hourly!.temperature_2m[index] ?? data.current.temperature_2m),
        precipitationProbability: data.hourly!.precipitation_probability?.[index] ?? null,
        condition: wmoToCondition(Math.round(data.hourly!.weather_code[index] ?? weatherCode)),
      }))
    : undefined

  return {
    location: profile.weatherLocation,
    temp: Math.round(data.current.temperature_2m),
    high: Math.round(data.daily.temperature_2m_max[0]),
    low: Math.round(data.daily.temperature_2m_min[0]),
    description: WMO_DESCRIPTIONS[weatherCode] ?? "clear sky",
    condition: wmoToCondition(weatherCode),
    forecast,
    ...(hourly ? { hourly } : {}),
  }
}

export function getWeatherFallback(location: string, includeHourly: boolean): WeatherForecast {
  return {
    location,
    temp: 28,
    high: 30,
    low: 18,
    description: "clear sky",
    condition: "clear",
    forecast: [
      { day: "DOM.", date: "05", low: 18, high: 30, condition: "clear" },
      { day: "SEG.", date: "06", low: 19, high: 31, condition: "clear" },
      { day: "TER.", date: "07", low: 20, high: 29, condition: "clouds" },
      { day: "QUA.", date: "08", low: 19, high: 28, condition: "rain" },
      { day: "QUI.", date: "09", low: 18, high: 30, condition: "clear" },
    ],
    ...(includeHourly ? { hourly: [] } : {}),
    mock: true,
  }
}
