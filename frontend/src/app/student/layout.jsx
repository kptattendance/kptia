import RoleGuard from "../components/RoleGuard";
import StudentSidebar from "./components/StudentSidebar";

export default function StudentLayout({ children }) {
  return (
    <div className="min-h-screen bg-slate-50">
      <StudentSidebar />

      <main className="ml-72 min-h-screen">
            <RoleGuard allowedRoles={["student"]}>

        {children}
            </RoleGuard>
      </main>
    </div>
  );
}