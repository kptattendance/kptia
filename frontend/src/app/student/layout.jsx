import RoleGuard from "../components/RoleGuard";
import StudentSidebar from "./components/StudentSidebar";

export default function StudentLayout({ children }) {
  return (
    <div className="min-h-screen bg-slate-50">
            <RoleGuard allowedRoles={["student"]}>
      <StudentSidebar />

      <main className="min-h-screen pt-16 lg:ml-72 lg:pt-0">

        {children}
      </main>
            </RoleGuard>
    </div>
  );
}