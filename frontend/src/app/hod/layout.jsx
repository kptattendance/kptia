import RoleGuard from "../components/RoleGuard";
import HODSidebar from "./components/HODSidebar";

export default function HODLayout({ children }) {
  return (
    <div className="min-h-screen">
      <RoleGuard allowedRoles={["hod"]}>
        <HODSidebar />

        <main className="min-h-screen pt-16 lg:pl-72 lg:pt-0">
          {children}
        </main>
      </RoleGuard>
    </div>
  );
}