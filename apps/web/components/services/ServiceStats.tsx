"use client";

import { BriefcaseBusiness, CheckCircle2, XCircle } from "lucide-react";

import { StatCard } from "@/components/ui/StatCard";
import { Service } from "./ServicesList";

interface ServiceStatsProps {
  services: Service[];
}

export default function ServiceStats({ services }: ServiceStatsProps) {
  const total = services.length;

  const active = services.filter((service) => service.active).length;

  const inactive = services.filter((service) => !service.active).length;

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <StatCard index={0} label="Total" value={total} icon={BriefcaseBusiness} description="Serviços no catálogo" />
      <StatCard index={1} label="Ativos" value={active} icon={CheckCircle2} tone="success" description="Visíveis para marcação" />
      <StatCard index={2} label="Inativos" value={inactive} icon={XCircle} tone="neutral" description="Escondidos dos clientes" />
    </div>
  );
}
