import { BarChart3, Coins, LayoutDashboard, Receipt, Settings, Swords, Users } from "lucide-react";

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
  // Mobil alt menü beş sütuna sabit olduğu için burada mobile: false.
  { href: "/payments", label: "Ödemeler", icon: Receipt, mobile: false },
  { href: "/users", label: "Üyeler", icon: Users, mobile: false },
  { href: "/settings", label: "Ayarlar", icon: Settings, mobile: true },
];
