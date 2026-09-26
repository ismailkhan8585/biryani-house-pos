import { getAuth } from "@/lib/auth";
import { redirect } from "next/navigation";
import ReportsClient from "@/components/reports/ReportsClient";

export const metadata = {
  title: "Reports & Analytics — Biryani House POS",
};

export default async function ReportsPage() {
  const auth = await getAuth();
  if (!auth) redirect("/login");

  return (
    <ReportsClient
      branchId={auth.branchId}
      branchName={auth.branchName}
      role={auth.role}
    />
  );
}
