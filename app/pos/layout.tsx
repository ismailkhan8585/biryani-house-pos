import { redirect } from "next/navigation";
import { getAuth } from "@/lib/auth";

export default async function POSLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const auth = await getAuth();
  if (!auth) redirect("/login");

  return (
    <div className="pos-layout">
      {children}
    </div>
  );
}
