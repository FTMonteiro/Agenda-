import type { MetadataRoute } from "next";

// O painel instalado no ecrã inicial (Android/desktop) usa o ícone e as cores da marca.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Agenda+",
    short_name: "Agenda+",
    description: "Organize hoje. Avance amanhã. — sistema de agendamento para profissionais de beleza",
    start_url: "/",
    display: "standalone",
    background_color: "#FFFFFF",
    theme_color: "#1451D6",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
