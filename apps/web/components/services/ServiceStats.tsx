"use client";

import { BriefcaseBusiness, CheckCircle2, XCircle } from "lucide-react";

import { Service } from "./ServicesList";

interface ServiceStatsProps {
  services: Service[];
}

export default function ServiceStats({ services }: ServiceStatsProps) {
  const total = services.length;

  const active = services.filter((service) => service.active).length;

  const inactive = services.filter((service) => !service.active).length;

  const stats = [
    {
      label: "Total",
      value: total,
      icon: BriefcaseBusiness,
    },
    {
      label: "Ativos",
      value: active,
      icon: CheckCircle2,
    },
    {
      label: "Inativos",
      value: inactive,
      icon: XCircle,
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {stats.map((stat) => {
        const Icon = stat.icon;

        return (
          <div
            key={stat.label}
            className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">{stat.label}</p>

                <p className="mt-2 text-3xl font-bold text-gray-950">
                  {stat.value}
                </p>
              </div>

              <div className="rounded-xl bg-gray-100 p-3">
                <Icon size={22} className="text-gray-700" />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
