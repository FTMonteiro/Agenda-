"use client";

import { Users, UserCheck, UserX } from "lucide-react";

import { StatCard } from "@/components/ui/StatCard";
import type { TeamMember } from "./TeamList";

interface TeamStatsProps {
  members: TeamMember[];
}

export default function TeamStats({ members }: TeamStatsProps) {
  const total = members.length;

  const active = members.filter((member) => member.active).length;

  const inactive = members.filter((member) => !member.active).length;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <StatCard index={0} label="Total" value={total} icon={Users} description="Profissionais na equipa" />
      <StatCard index={1} label="Ativos" value={active} icon={UserCheck} tone="success" description="A receber marcações" />
      <StatCard index={2} label="Inativos" value={inactive} icon={UserX} tone="neutral" description="Sem marcações novas" />
    </div>
  );
}
