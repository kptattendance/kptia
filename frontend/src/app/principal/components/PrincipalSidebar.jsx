"use client";

import {
  CalendarCheck,
  ClipboardList,
  LayoutDashboard,
} from "lucide-react";
import PortalSidebar from "../../components/PortalSidebar";

const menuItems = [
  { name: "Dashboard", href: "/principal", icon: LayoutDashboard },
  { name: "Attendance", href: "/principal/attendance", icon: CalendarCheck },
  { name: "IA Marks", href: "/principal/ia-marks", icon: ClipboardList },
];

export default function PrincipalSidebar() {
  return (
    <PortalSidebar
      portal="Principal Portal"
      homeHref="/principal"
      items={menuItems}
    />
  );
}
