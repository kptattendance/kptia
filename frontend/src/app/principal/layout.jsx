import RoleGuard from "../components/RoleGuard";
import PrincipalSidebar from "./components/PrincipalSidebar";

export default function PrincipalLayout({ children }) {
  return (
    <div className="min-h-screen bg-slate-50">
            <RoleGuard allowedRoles={["principal"]}>
      <PrincipalSidebar />

      <main className="ml-72 min-h-screen">

        {children}
      </main>
            </RoleGuard>
    </div>
  );
}