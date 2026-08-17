import { BarChart3, Coins, LayoutDashboard, Receipt, Settings, Swords, Users } from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  adminOnly?: boolean;
  /** Yalnızca yönetici ve yardımcı görsün */
  manageOnly?: boolean;
  /** Mobil alt menüde gösterilsin mi */
  mobile?: boolean;
}

export const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Panel", icon: LayoutDashboard, mobile: true },
  { href: "/farms", label: "Farmlar", icon: Swords, mobile: true },
  { href: "/drops", label: "Droplar", icon: Coins, manageOnly: true, mobile: true },
  { href: "/earnings", label: "Kazançlar", icon: BarChart3, mobile: true },
  { href: "/payments", label: "Ödemeler", icon: Receipt, mobile: false },
  { href: "/users", label: "Üyeler", icon: Users, adminOnly: true, mobile: false },
  { href: "/settings", label: "Ayarlar", icon: Settings, mobile: true },
];
