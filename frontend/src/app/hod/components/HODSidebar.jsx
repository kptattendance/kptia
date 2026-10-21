"use client";

import {
  BookOpen,
  CalendarCheck,
  ClipboardList,
  Compass,
  GraduationCap,
  Handshake,
  Layers,
  LayoutDashboard,
  Library,
  Target,
  Users,
} from "lucide-react";
import PortalSidebar from "../../components/PortalSidebar";

const menuItems = [
  { name: "Dashboard", href: "/hod", icon: LayoutDashboard },
  { name: "Subjects", href: "/hod/subjects", icon: BookOpen },
  { name: "Faculty", href: "/hod/faculty", icon: Users },
  { name: "Course Allocation", href: "/hod/allocations", icon: Layers },
  { name: "Mentors", href: "/hod/mentors", icon: Handshake },
  { name: "Program Outcomes", href: "/hod/program-outcomes", icon: Target },
  { name: "Course Outcomes", href: "/hod/course-outcomes", icon: Compass },
  { name: "Students", href: "/hod/students", icon: GraduationCap },
  { name: "Attendance", href: "/hod/attendance", icon: CalendarCheck },
  { name: "IA Marks", href: "/hod/ia-marks", icon: ClipboardList },
  { name: "Study Material", href: "/hod/study-material", icon: Library },
];

export default function HODSidebar() {
  return (
    <PortalSidebar
      portal="HOD Portal"
      homeHref="/hod"
      items={menuItems}
    />
  );
}
