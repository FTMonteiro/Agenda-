"use client";

import { Users, UserCheck, UserX } from "lucide-react";

import type { TeamMember } from "./TeamList";

interface TeamStatsProps {
  members: TeamMember[];
}

export default function TeamStats({ members }: TeamStatsProps) {
  const total = members.length;

  const active = members.filter((member) => member.active).length;

  const inactive = members.filter((member) => !member.active).length;

  const stats = [
    {
      title: "Total",
      value: total,
      icon: Users,
    },
    {
      title: "Ativos",
      value: active,
      icon: UserCheck,
    },
    {
      title: "Inativos",
      value: inactive,
      icon: UserX,
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      {stats.map((stat) => {
        const Icon = stat.icon;

        return (
          <div
            key={stat.title}
            className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">
                  {stat.title}
                </p>

                <p className="mt-2 text-3xl font-bold text-gray-950">
                  {stat.value}
                </p>
              </div>

              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gray-100">
                <Icon size={21} className="text-gray-700" />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
