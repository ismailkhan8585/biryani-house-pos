import { getAuth } from "@/lib/auth";
import { redirect } from "next/navigation";
import AdminClient from "@/components/admin/AdminClient";

export const metadata = {
  title: "Owner Master Admin — Biryani House POS",
};

export default async function AdminPage() {
  const auth = await getAuth();
  if (!auth) redirect("/login");
  if (auth.role !== "admin") redirect("/pos");

  return <AdminClient />;
}
