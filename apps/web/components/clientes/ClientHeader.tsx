"use client";

export function ClientHeader() {
  return (
    <section className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
          Clientes
        </h1>

        <p className="mt-1.5 max-w-xl text-sm text-gray-500 sm:text-base">
          Gerencie os clientes, informações e histórico do seu
          estabelecimento.
        </p>
      </div>
    </section>
  );
}