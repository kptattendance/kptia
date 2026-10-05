import RoleGuard from "../components/RoleGuard";
import PrincipalSidebar from "./components/PrincipalSidebar";

export default function PrincipalLayout({ children }) {
  return (
    <div className="min-h-screen bg-slate-50">
      <PrincipalSidebar />

      <main className="ml-72 min-h-screen">
            <RoleGuard allowedRoles={["principal"]}>

        {children}
            </RoleGuard>
      </main>
    </div>
  );
}