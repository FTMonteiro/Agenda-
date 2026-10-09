import { ClientHeader } from "@/components/clientes/ClientHeader";
import { ClientTable } from "@/components/clientes/ClientTable";

export default function ClientesPage() {
  return (
    <div className="space-y-8 p-6">
      <ClientHeader />
      <ClientTable />
    </div>
  );
}