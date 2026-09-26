import { getAuth } from "@/lib/auth";
import { redirect } from "next/navigation";
import KitchenDisplay from "@/components/kitchen/KitchenDisplay";

export const metadata = {
  title: "Kitchen Display (KDS) — Biryani House POS",
};

export default async function KitchenPage() {
  const auth = await getAuth();
  if (!auth) redirect("/login");

  return (
    <KitchenDisplay
      branchId={auth.branchId}
      branchName={auth.branchName}
      role={auth.role}
    />
  );
}
