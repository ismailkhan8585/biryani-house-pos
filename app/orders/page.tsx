import { getAuth } from "@/lib/auth";
import { redirect } from "next/navigation";
import OrdersClient from "@/components/orders/OrdersClient";

export const metadata = { title: "Orders — Biryani House POS" };

export default async function OrdersPage() {
  const auth = await getAuth();
  if (!auth) redirect("/login");
  return <OrdersClient branchId={auth.branchId} role={auth.role} />;
}
