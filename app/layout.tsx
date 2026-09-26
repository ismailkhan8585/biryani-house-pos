import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "react-hot-toast";

export const metadata: Metadata = {
  title: "Biryani House POS — Restaurant Point of Sale",
  description: "Fast, reliable POS system for Biryani House branches. Manage orders, tables, payments, and reports.",
  keywords: ["POS", "restaurant", "biryani", "point of sale", "Pakistan"],
  authors: [{ name: "Biryani House" }],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full">
      <body className="h-full antialiased">
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
