"use client";

import {
  BookOpen,
  CalendarCheck,
  ClipboardList,
  Database,
  GraduationCap,
  KeyRound,
  LayoutDashboard,
  Library,
  UserCog,
  Users,
} from "lucide-react";
import PortalSidebar from "../../components/PortalSidebar";

const menuItems = [
  { name: "Dashboard", href: "/admin/ia-monitoring", icon: LayoutDashboard },
  { name: "Faculty", href: "/admin/faculty", icon: Users },
  { name: "HOD", href: "/admin/hod", icon: UserCog },
  { name: "Subjects", href: "/admin/subjects", icon: BookOpen },
  { name: "Students", href: "/admin/students", icon: GraduationCap },
  { name: "Attendance", href: "/admin/attendance", icon: CalendarCheck },
  { name: "IA Marks", href: "/admin/ia-marks", icon: ClipboardList },
  { name: "Study Material", href: "/admin/study-material", icon: Library },
  { name: "Mongo Users", href: "/admin/mongo-users", icon: Database },
  { name: "Clerk Users", href: "/admin/clerk-users", icon: KeyRound },
];

export default function AdminSidebar() {
  return (
    <PortalSidebar
      portal="Admin Portal"
      homeHref="/admin/ia-monitoring"
      items={menuItems}
    />
  );
}
