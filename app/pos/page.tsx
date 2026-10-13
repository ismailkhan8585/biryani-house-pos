import { getAuth } from "@/lib/auth";
import BranchChooser from "@/components/BranchChooser";
import { redirect } from "next/navigation";
import POSClient from "@/components/pos/POSClient";

export const metadata = {
  title: "POS — Biryani House",
};

export default async function POSPage({
  searchParams,
}: {
  searchParams: Promise<{ choose?: string }>;
}) {
  const auth = await getAuth();
  if (!auth) redirect("/login");
  if ((await searchParams).choose === "1" && auth.role === "admin")
    return <BranchChooser />;
  if (auth.branchId === "all" || auth.branchId === "admin")
    return <BranchChooser />;
  return (
    <POSClient
      key={auth.staffId + ":" + auth.branchId}
      branchId={auth!.branchId}
      branchName={auth!.branchName}
      role={auth!.role}
      staffId={auth.staffId}
      staffName={auth.staffName}
      sessionExpires={(auth.exp || 0) * 1000}
    />
  );
}
