import { BarChart3, Coins, LayoutDashboard, Settings, Swords, Users } from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  adminOnly?: boolean;
  /** Mobil alt menüde gösterilsin mi */
  mobile?: boolean;
}

export const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Panel", icon: LayoutDashboard, mobile: true },
  { href: "/farms", label: "Farmlar", icon: Swords, mobile: true },
  { href: "/drops", label: "Droplar", icon: Coins, mobile: true },
  { href: "/earnings", label: "Kazançlar", icon: BarChart3, mobile: true },
  { href: "/users", label: "Üyeler", icon: Users, mobile: false },
  { href: "/settings", label: "Ayarlar", icon: Settings, mobile: true },
];
