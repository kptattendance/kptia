"use client";

import {
  CalendarCheck,
  ClipboardList,
  Compass,
  LayoutDashboard,
  Library,
  ListChecks,
} from "lucide-react";
import PortalSidebar from "../../components/PortalSidebar";

const menuItems = [
  { name: "Dashboard", href: "/faculty", icon: LayoutDashboard },
  { name: "Entry Status", href: "/faculty/entry-status", icon: ListChecks },
  { name: "Attendance", href: "/faculty/attendance", icon: CalendarCheck },
  { name: "IA Marks", href: "/faculty/ia-marks", icon: ClipboardList },
  { name: "Course Outcomes", href: "/faculty/course-outcomes", icon: Compass },
  { name: "Study Material", href: "/faculty/study-material", icon: Library },
];

export default function FacultySidebar() {
  return (
    <PortalSidebar
      portal="Faculty Portal"
      homeHref="/faculty"
      items={menuItems}
    />
  );
}
