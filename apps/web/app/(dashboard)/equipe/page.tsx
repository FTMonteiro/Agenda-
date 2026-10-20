"use client";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

import TeamHeader from "@/components/equipe/TeamHeader";
import TeamStats from "@/components/equipe/TeamStats";
import TeamList, {
  TeamMember,
} from "@/components/equipe/TeamList";

export default function EquipePage() {
  const [members, setMembers] =
    useState<TeamMember[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const loadMembers = useCallback(
    async () => {
      try {
        setLoading(true);
        setError("");

        const response = await fetch(
          "/api/professionals",
          {
            method: "GET",
            cache: "no-store",
          },
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data?.error ||
              "Não foi possível carregar a equipe.",
          );
        }

        if (!Array.isArray(data)) {
          throw new Error(
            "A API retornou um formato inválido.",
          );
        }

        const normalized: TeamMember[] =
          data.map((item) => ({
            id: String(item.id),
            name: String(item.name ?? ""),
            email: String(item.email ?? ""),
            phone: String(item.phone ?? ""),
            specialty: String(
              item.specialty ?? "",
            ),
            photo:
              typeof item.photo === "string"
                ? item.photo
                : null,
            active: item.active === true,
            emailVerified:
              item.emailVerified === true,
            businessId: String(
              item.businessId ?? "",
            ),
            createdAt: String(
              item.createdAt ?? "",
            ),
            updatedAt: String(
              item.updatedAt ?? "",
            ),
          }));

        setMembers(normalized);
      } catch (error) {
        console.error(
          "Erro ao carregar equipe:",
          error,
        );

        setError(
          error instanceof Error
            ? error.message
            : "Erro ao carregar equipe.",
        );
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    loadMembers();
  }, [loadMembers]);

  function handleMemberCreated(
    member: TeamMember,
  ) {
    setMembers((current) => [
      member,
      ...current,
    ]);
  }

  function handleUpdateMember(
    updatedMember: TeamMember,
  ) {
    setMembers((current) =>
      current.map((member) =>
        member.id === updatedMember.id
          ? updatedMember
          : member,
      ),
    );
  }

  function handleDeleteMember(id: string) {
    setMembers((current) =>
      current.filter(
        (member) => member.id !== id,
      ),
    );
  }

  if (loading) {
    return (
      <div className="space-y-8 p-6">
        <div>
          <p className="text-sm font-medium text-blue-600">
            Gestão
          </p>

          <h1 className="mt-2 text-2xl font-bold text-gray-950">
            Equipe
          </h1>

          <p className="mt-2 text-sm text-gray-500">
            A carregar profissionais...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-8 p-6">
        <div className="rounded-2xl border border-red-100 bg-red-50 p-6">
          <h2 className="font-semibold text-red-800">
            Erro ao carregar equipe
          </h2>

          <p className="mt-2 text-sm text-red-600">
            {error}
          </p>

          <button
            type="button"
            onClick={loadMembers}
            className="mt-4 rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
          >
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1600px] space-y-6">
      <TeamHeader
        onMemberCreated={
          handleMemberCreated
        }
      />

      <TeamStats members={members} />

      <TeamList
        members={members}
        onUpdateMember={
          handleUpdateMember
        }
        onDeleteMember={
          handleDeleteMember
        }
      />
    </div>
  );
}