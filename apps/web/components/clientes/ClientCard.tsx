"use client";

import {
  CalendarDays,
  Mail,
  MoreHorizontal,
  Phone,
} from "lucide-react";

import { Client } from "@/types/clients";

interface Props {
  client: Client;
  onView?: (client: Client) => void;
  onEdit?: (client: Client) => void;
  onDelete?: (client: Client) => void;
}

export function ClientCard({
  client,
  onView,
}: Props) {
  const initial =
    client.name?.charAt(0).toUpperCase() || "?";

  const isActive =
    client.status?.toLowerCase() === "ativo";

  const formattedLastVisit = client.lastVisit
    ? new Intl.DateTimeFormat("pt-AO", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }).format(new Date(client.lastVisit))
    : "Nenhuma visita";

  return (
    <article
      className="
        group
        w-full
        rounded-2xl
        border
        border-gray-200
        bg-white
        px-5
        py-4
        transition-all
        duration-200
        hover:border-gray-300
        hover:shadow-sm
      "
    >
      <div
        className="
          flex
          w-full
          items-center
          gap-5
        "
      >
        {/*  CLIENTE */}

        <div className="flex min-w-[240px] flex-1 items-center gap-3">
          {/* AVATAR */}

          <div
            className="
              flex
              h-11
              w-11
              shrink-0
              items-center
              justify-center
              rounded-xl
              bg-gray-100
              text-sm
              font-bold
              text-gray-700
            "
          >
            {initial}
          </div>

          {/* NOME + STATUS */}

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2
                className="
                  truncate
                  text-sm
                  font-semibold
                  text-gray-900
                "
              >
                {client.name}
              </h2>

              <span
                className={`
                  inline-flex
                  shrink-0
                  items-center
                  gap-1.5
                  rounded-full
                  px-2
                  py-0.5
                  text-[10px]
                  font-semibold
                  ${
                    isActive
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-gray-100 text-gray-500"
                  }
                `}
              >
                <span
                  className={`
                    h-1.5
                    w-1.5
                    rounded-full
                    ${
                      isActive
                        ? "bg-emerald-500"
                        : "bg-gray-400"
                    }
                  `}
                />

                {client.status || "Inativo"}
              </span>
            </div>

            <p className="mt-1 text-xs text-gray-400">
              Cliente
            </p>
          </div>
        </div>

        {/* EMAIL */}

        <div
          className="
            hidden
            min-w-[220px]
            flex-1
            items-center
            gap-3
            lg:flex
          "
        >
          <div
            className="
              flex
              h-9
              w-9
              shrink-0
              items-center
              justify-center
              rounded-lg
              bg-gray-50
            "
          >
            <Mail className="h-4 w-4 text-gray-400" />
          </div>

          <div className="min-w-0">
            <p className="text-[10px] font-medium uppercase tracking-wide text-gray-400">
              Email
            </p>

            <p className="mt-0.5 truncate text-xs font-medium text-gray-700">
              {client.email || "Sem email"}
            </p>
          </div>
        </div>

        {/* TELEFONE */}

        <div
          className="
            hidden
            min-w-[180px]
            flex-1
            items-center
            gap-3
            xl:flex
          "
        >
          <div
            className="
              flex
              h-9
              w-9
              shrink-0
              items-center
              justify-center
              rounded-lg
              bg-gray-50
            "
          >
            <Phone className="h-4 w-4 text-gray-400" />
          </div>

          <div className="min-w-0">
            <p className="text-[10px] font-medium uppercase tracking-wide text-gray-400">
              Telefone
            </p>

            <p className="mt-0.5 truncate text-xs font-medium text-gray-700">
              {client.phone || "Sem telefone"}
            </p>
          </div>
        </div>

        {/* VISITAS */}

        <div
          className="
            hidden
            w-[100px]
            shrink-0
            items-center
            gap-3
            md:flex
          "
        >
          <div
            className="
              flex
              h-9
              w-9
              shrink-0
              items-center
              justify-center
              rounded-lg
              bg-gray-50
            "
          >
            <CalendarDays className="h-4 w-4 text-gray-400" />
          </div>

          <div>
            <p className="text-[10px] font-medium uppercase tracking-wide text-gray-400">
              Visitas
            </p>

            <p className="mt-0.5 text-sm font-semibold text-gray-900">
              {client.visits ?? 0}
            </p>
          </div>
        </div>

        {/* ÚLTIMA VISITA */}

        <div
          className="
            hidden
            min-w-[135px]
            shrink-0
            lg:block
          "
        >
          <p className="text-[10px] font-medium uppercase tracking-wide text-gray-400">
            Última visita
          </p>

          <p className="mt-1 truncate text-xs font-semibold text-gray-800">
            {formattedLastVisit}
          </p>
        </div>

        {/* MENU */}

        <button
          type="button"
          aria-label={`Mais opções para ${client.name}`}
          onClick={() => onView?.(client)}
          className="
            flex
            h-9
            w-9
            shrink-0
            items-center
            justify-center
            rounded-lg
            text-gray-400
            transition
            hover:bg-gray-100
            hover:text-gray-900
            lg:opacity-0
            lg:group-hover:opacity-100
          "
        >
          <MoreHorizontal className="h-5 w-5" />
        </button>
      </div>

      {/* INFORMAÇÕES MOBILE*/}

      <div
        className="
          mt-4
          grid
          grid-cols-2
          gap-3
          border-t
          border-gray-100
          pt-4
          md:hidden
        "
      >
        {/* TELEFONE */}

        <div className="flex min-w-0 items-center gap-2">
          <Phone className="h-3.5 w-3.5 shrink-0 text-gray-400" />

          <span className="truncate text-xs text-gray-600">
            {client.phone || "Sem telefone"}
          </span>
        </div>

        {/* EMAIL */}

        <div className="flex min-w-0 items-center gap-2">
          <Mail className="h-3.5 w-3.5 shrink-0 text-gray-400" />

          <span className="truncate text-xs text-gray-600">
            {client.email || "Sem email"}
          </span>
        </div>

        {/* VISITAS */}

        <div className="flex items-center gap-2">
          <CalendarDays className="h-3.5 w-3.5 text-gray-400" />

          <span className="text-xs text-gray-600">
            {client.visits ?? 0} visitas
          </span>
        </div>

        {/* ÚLTIMA VISITA */}

        <div className="truncate text-xs text-gray-500">
          {formattedLastVisit}
        </div>
      </div>
    </article>
  );
}