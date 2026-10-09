import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { NotificationsProvider } from "@/components/notifications/NotificationsProvider";
import { ThemedToaster } from "@/components/theme/ThemedToaster";
import { Translator } from "@/components/i18n/Translator";

import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  // Base dos endereços absolutos do ícone e da imagem de partilha (opengraph-image.png).
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3001"),
  title: "agenda+",
  description: "Organize hoje. Avance amanhã. — sistema de agendamento para profissionais de beleza",
};

/*
 * Corre antes da primeira pintura e define a classe de tema em <html>. Sem
 * isto o React só aplicaria o tema depois de hidratar, e uma página escura
 * apareceria branca por um instante a cada carregamento.
 */
const themeScript = `
(function () {
  try {
    var stored = localStorage.getItem("nevrix-theme");
    var theme = stored === "dark" || stored === "light"
      ? stored
      : (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    document.documentElement.classList.add(theme);
    document.documentElement.style.colorScheme = theme;
  } catch (error) {
    document.documentElement.classList.add("light");
  }
})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: themeScript,
          }}
        />
      </head>

      <body
        className="min-h-full flex flex-col"
        suppressHydrationWarning={true}
      >
        <ThemeProvider>
          <NotificationsProvider>
            {children}

            <ThemedToaster />
            <Translator />
          </NotificationsProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
