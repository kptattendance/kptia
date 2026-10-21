"use client";

import {
  BookMarked,
  FileText,
  LayoutDashboard,
  Library,
} from "lucide-react";
import PortalSidebar from "../../components/PortalSidebar";

const menuItems = [
  { name: "Dashboard", href: "/student", icon: LayoutDashboard },
  { name: "Academic", href: "/student/academic", icon: BookMarked },
  { name: "Study Material", href: "/student/study-material", icon: Library },
  { name: "Progress Report", href: "/student/progress-report", icon: FileText },
];

export default function StudentSidebar() {
  return (
    <PortalSidebar
      portal="Student Portal"
      homeHref="/student"
      items={menuItems}
    />
  );
}
