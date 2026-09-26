import { getAuth } from "@/lib/auth";
import POSClient from "@/components/pos/POSClient";

export const metadata = {
  title: "POS — Biryani House",
};

export default async function POSPage() {
  const auth = await getAuth();
  return <POSClient branchId={auth!.branchId} branchName={auth!.branchName} role={auth!.role} />;
}
