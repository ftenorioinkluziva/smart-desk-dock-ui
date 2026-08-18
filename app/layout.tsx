import type { Metadata, Viewport } from 'next'
import { Inter, JetBrains_Mono } from 'next/font/google'
import Script from 'next/script'
import { DockThemeProvider } from '@/components/dock-theme-provider'
import {
  DEFAULT_DOCK_APPEARANCE,
  DOCK_ACCENT_IDS,
  DOCK_APPEARANCE_STORAGE_KEY,
  DOCK_THEME_IDS,
} from '@/lib/dock-theme'
import './globals.css'

const _inter = Inter({ subsets: ['latin'], variable: '--font-inter' })
const _jetbrainsMono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-jetbrains-mono' })

const dockThemeInitScript = `
  (() => {
    const fallback = ${JSON.stringify(DEFAULT_DOCK_APPEARANCE)};
    try {
      const saved = JSON.parse(localStorage.getItem(${JSON.stringify(DOCK_APPEARANCE_STORAGE_KEY)}) || "{}");
      const themes = ${JSON.stringify(DOCK_THEME_IDS)};
      const accents = ${JSON.stringify(DOCK_ACCENT_IDS)};
      const theme = themes.includes(saved.themePreset) ? saved.themePreset : fallback.themePreset;
      const accent = accents.includes(saved.accentPreset) ? saved.accentPreset : fallback.accentPreset;
      document.documentElement.dataset.dockTheme = theme;
      document.documentElement.dataset.dockAccent = accent;
      document.documentElement.style.colorScheme = theme === "paper-light" ? "light" : "dark";
    } catch {
      document.documentElement.dataset.dockTheme = fallback.themePreset;
      document.documentElement.dataset.dockAccent = fallback.accentPreset;
      document.documentElement.style.colorScheme = "dark";
    }
  })();
`

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#000000",
};

export const metadata: Metadata = {
  title: "Focus Dock",
  description: "Minimalist Desk Dock",
  applicationName: "Focus Dock",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Focus Dock",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/apple-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
      <html lang="pt-BR" suppressHydrationWarning>
      <body className={`${_inter.variable} ${_jetbrainsMono.variable} font-sans antialiased`}>
        <Script id="dock-theme-init" strategy="beforeInteractive">
          {dockThemeInitScript}
        </Script>
        <DockThemeProvider>{children}</DockThemeProvider>
      </body>
    </html>
  )
}
