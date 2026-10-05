import RoleGuard from "../components/RoleGuard";
import HODSidebar from "./components/HODSidebar";

export default function HODLayout({ children }) {
  return (
    <div className="min-h-screen bg-slate-50">
      <HODSidebar />

      <main className="min-h-screen pt-16 lg:ml-72 lg:pt-0">
        <RoleGuard allowedRoles={["hod"]}>
          {children}
        </RoleGuard>
      </main>
    </div>
  );
}