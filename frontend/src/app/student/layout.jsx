import RoleGuard from "../components/RoleGuard";
import StudentSidebar from "./components/StudentSidebar";

export default function StudentLayout({ children }) {
  return (
    <div className="min-h-screen bg-slate-50">
            <RoleGuard allowedRoles={["student"]}>
      <StudentSidebar />

      <main className="ml-72 min-h-screen">

        {children}
      </main>
            </RoleGuard>
    </div>
  );
}