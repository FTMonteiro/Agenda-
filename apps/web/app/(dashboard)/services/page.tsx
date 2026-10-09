"use client";

import { useCallback, useEffect, useState } from "react";

import ServicesHeader from "@/components/services/ServicesHeader";
import ServiceStats from "@/components/services/ServiceStats";
import ServicesList, {
  Service,
} from "@/components/services/ServicesList";

interface CurrentUser {
  id: string;
  name: string;
  email: string;
  role: string;
  businessId: string;
}

export default function ServicesPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [user, setUser] =
    useState<CurrentUser | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [loadingUser, setLoadingUser] =
    useState(true);

  const [error, setError] =
    useState("");

  /*
  |--------------------------------------------------------------------------
  | CARREGAR UTILIZADOR
  |--------------------------------------------------------------------------
  */

  const loadUser = useCallback(async () => {
    try {
      setLoadingUser(true);

      const response = await fetch(
        "/api/auth/me",
        {
          method: "GET",
          credentials: "include",
          cache: "no-store",
        },
      );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error ||
            "Não foi possível carregar o utilizador.",
        );
      }

      setUser(data.user ?? null);
    } catch (error) {
      console.error(
        "Erro ao carregar utilizador:",
        error,
      );

      setUser(null);
    } finally {
      setLoadingUser(false);
    }
  }, []);

  /*
  |--------------------------------------------------------------------------
  | VERIFICAR OWNER
  |--------------------------------------------------------------------------
  */

  const isOwner =
    user?.role?.toUpperCase() ===
    "OWNER";

  /*
  |--------------------------------------------------------------------------
  | CARREGAR SERVIÇOS
  |--------------------------------------------------------------------------
  */

  const loadServices = useCallback(
    async () => {
      try {
        setLoading(true);
        setError("");

        const response = await fetch(
          "/api/services",
          {
            method: "GET",
            credentials: "include",
            cache: "no-store",
          },
        );

        const data =
          await response.json();

        if (!response.ok) {
          throw new Error(
            data?.error ||
              "Não foi possível carregar os serviços.",
          );
        }

        if (!Array.isArray(data)) {
          throw new Error(
            "A API retornou um formato inválido.",
          );
        }

        const normalizedServices: Service[] =
          data
            .map((item: any) => ({
              id: String(
                item.id ?? "",
              ),

              name: String(
                item.name ?? "",
              ),

              description:
                item.description == null
                  ? null
                  : String(
                      item.description,
                    ),

              price: Number(
                item.price ?? 0,
              ),

              duration: Number(
                item.duration ?? 0,
              ),

              active:
                item.active === true,

              businessId: String(
                item.businessId ?? "",
              ),

              createdAt: String(
                item.createdAt ?? "",
              ),

              updatedAt: String(
                item.updatedAt ?? "",
              ),
            }))
            /*
            |--------------------------------------------------------------------------
            | EMPLOYEE
            |--------------------------------------------------------------------------
            |
            | Funcionário só recebe serviços ativos.
            |
            | OWNER recebe todos.
            |
            */
            .filter((service) => {
              if (isOwner) {
                return true;
              }

              return service.active;
            });

        setServices(
          normalizedServices,
        );
      } catch (error) {
        console.error(
          "Erro ao carregar serviços:",
          error,
        );

        setError(
          error instanceof Error
            ? error.message
            : "Erro ao carregar serviços.",
        );
      } finally {
        setLoading(false);
      }
    },
    [isOwner],
  );

  /*
  |--------------------------------------------------------------------------
  | INICIALIZAÇÃO
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  /*
  |--------------------------------------------------------------------------
  | CARREGAR SERVIÇOS DEPOIS DO UTILIZADOR
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    if (loadingUser) {
      return;
    }

    if (!user) {
      setLoading(false);
      return;
    }

    loadServices();
  }, [
    loadingUser,
    user,
    loadServices,
  ]);

  /*
  |--------------------------------------------------------------------------
  | SERVIÇO CRIADO
  |--------------------------------------------------------------------------
  |
  | Só será utilizado pelo OWNER.
  |
  */

  function handleServiceCreated(
    service: Service,
  ) {
    if (!isOwner) {
      return;
    }

    setServices((current) => [
      service,
      ...current,
    ]);
  }

  /*
  |--------------------------------------------------------------------------
  | CARREGANDO UTILIZADOR
  |--------------------------------------------------------------------------
  */

  if (loadingUser) {
    return (
      <div className="space-y-8 p-6">
        <div>
          <p className="text-sm font-medium text-blue-600">
            Gestão
          </p>

          <h1 className="mt-2 text-2xl font-bold text-gray-950">
            Serviços
          </h1>

          <p className="mt-2 text-sm text-gray-500">
            A carregar...
          </p>
        </div>
      </div>
    );
  }

  /*
  |--------------------------------------------------------------------------
  | NÃO AUTENTICADO
  |--------------------------------------------------------------------------
  */

  if (!user) {
    return (
      <div className="p-6">
        <div className="rounded-2xl border border-red-100 bg-red-50 p-6">
          <h2 className="font-semibold text-red-800">
            Sessão inválida
          </h2>

          <p className="mt-2 text-sm text-red-600">
            Não foi possível identificar o
            utilizador autenticado.
          </p>
        </div>
      </div>
    );
  }

  /*
  |--------------------------------------------------------------------------
  | CARREGANDO SERVIÇOS
  |--------------------------------------------------------------------------
  */

  if (loading) {
    return (
      <div className="space-y-8 p-6">
        <div>
          <p className="text-sm font-medium text-blue-600">
            Gestão
          </p>

          <h1 className="mt-2 text-2xl font-bold text-gray-950">
            Serviços
          </h1>

          <p className="mt-2 text-sm text-gray-500">
            A carregar serviços...
          </p>
        </div>
      </div>
    );
  }

  /*
  |--------------------------------------------------------------------------
  | ERRO
  |--------------------------------------------------------------------------
  */

  if (error) {
    return (
      <div className="space-y-8 p-6">
        <div className="rounded-2xl border border-red-100 bg-red-50 p-6">
          <h2 className="font-semibold text-red-800">
            Erro ao carregar serviços
          </h2>

          <p className="mt-2 text-sm text-red-600">
            {error}
          </p>

          <button
            type="button"
            onClick={loadServices}
            className="mt-4 rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700"
          >
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  /*
  |--------------------------------------------------------------------------
  | EMPLOYEE
  |--------------------------------------------------------------------------
  |
  | Funcionário:
  |
  | - não vê botão "Novo serviço"
  | - não vê estatísticas de gestão
  | - vê somente serviços ativos
  | - não pode alterar nada
  |
  */

  if (!isOwner) {
    return (
      <main className="space-y-8 p-6">
        <div>
          <p className="text-sm font-medium text-blue-600">
            Catálogo
          </p>

          <h1 className="mt-2 text-2xl font-bold text-gray-950">
            Serviços
          </h1>

          <p className="mt-2 text-sm text-gray-500">
            Serviços disponíveis para atendimento.
          </p>
        </div>

        <ServicesList
          services={services}
          readOnly={true}
        />
      </main>
    );
  }

  /*
  |--------------------------------------------------------------------------
  | OWNER
  |--------------------------------------------------------------------------
  |
  | OWNER mantém a gestão completa.
  |
  */

  return (
    <main className="space-y-8 p-6">
      <ServicesHeader
        onServiceCreated={
          handleServiceCreated
        }
      />

      <ServiceStats
        services={services}
      />

      <ServicesList
        services={services}
        onServicesChange={
          setServices
        }
      />
    </main>
  );
}