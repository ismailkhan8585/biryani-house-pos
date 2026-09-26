import { getAuth } from "@/lib/auth";
import { redirect } from "next/navigation";
import TablesClient from "@/components/tables/TablesClient";

export const metadata = { title: "Tables — Biryani House POS" };

export default async function TablesPage() {
  const auth = await getAuth();
  if (!auth) redirect("/login");
  return <TablesClient branchId={auth.branchId} />;
}
