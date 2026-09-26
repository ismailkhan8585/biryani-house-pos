import { getAuth } from "@/lib/auth";
import { redirect } from "next/navigation";
import SettingsClient from "@/components/settings/SettingsClient";

export const metadata = {
  title: "Settings — Biryani House POS",
};

export default async function SettingsPage() {
  const auth = await getAuth();
  if (!auth) redirect("/login");
  if (auth.role !== "admin") redirect("/pos");

  return <SettingsClient />;
}
