import type { Metadata } from "next";
import { BeingDashboard } from "@/components/being-dashboard";

export const metadata: Metadata = {
  title: "Patterns | ClearPth",
};

export default function DashboardPage() {
  return <BeingDashboard />;
}
