import AppNavigation from "@/components/AppNavigation";
import { getAuth } from "@/lib/auth";
import type { Metadata, Viewport } from "next";
import InstallApp from "@/components/InstallApp";
import "./globals.css";
import { Toaster } from "react-hot-toast";

export const metadata: Metadata = {
  title: "Biryani House POS — Restaurant Point of Sale",
  description:
    "Fast, reliable POS system for Biryani House branches. Manage orders, tables, payments, and reports.",
  icons: {
    icon: { url: "/ilyas-logo.png", type: "image/png", sizes: "1254x1254" },
    apple: "/icons/pos-180.png",
  },
  keywords: ["POS", "restaurant", "biryani", "point of sale", "Pakistan"],
  authors: [{ name: "Biryani House" }],
  appleWebApp: { capable: true, title: "Ilyas POS", statusBarStyle: "default" },
};

export const viewport: Viewport = { themeColor: "#F97316" };

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const auth = await getAuth();
  return (
    <html lang="en" className="h-full">
      <body className="h-full antialiased">
        <InstallApp />
        {auth && (
          <AppNavigation
            role={auth.role}
            staffName={auth.staffName}
            branchName={auth.branchName}
          />
        )}
        {children}
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              fontFamily: "'DM Sans', sans-serif",
              borderRadius: "0.75rem",
              fontSize: "14px",
            },
            success: {
              iconTheme: { primary: "rgb(249 115 22)", secondary: "white" },
              style: {
                border: "1px solid rgb(254 215 170)",
                background: "rgb(255 253 248)",
                color: "rgb(28 25 23)",
              },
            },
            error: {
              style: {
                border: "1px solid rgb(254 202 202)",
                background: "rgb(254 242 242)",
              },
            },
          }}
        />
      </body>
    </html>
  );
}
