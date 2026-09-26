import { getAuth } from "@/lib/auth";
import { redirect } from "next/navigation";
import MenuClient from "@/components/menu/MenuClient";

export const metadata = {
  title: "Menu Management — Biryani House POS",
};

export default async function MenuPage() {
  const auth = await getAuth();
  if (!auth) redirect("/login");
  if (auth.role !== "admin") redirect("/pos");

  return <MenuClient role={auth.role} />;
}
