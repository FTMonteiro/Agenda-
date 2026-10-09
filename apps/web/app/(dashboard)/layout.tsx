import { DashboardLayout } from "@/components/ui/layout/DashoardLayout";


export default function Layout({
  children
}: {
  children: React.ReactNode
}) {

  return (
    <DashboardLayout>
      {children}
    </DashboardLayout>
  );
}