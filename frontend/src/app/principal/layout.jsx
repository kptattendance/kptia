import RoleGuard from "../components/RoleGuard";
import PrincipalSidebar from "./components/PrincipalSidebar";

export default function PrincipalLayout({ children }) {
  return (
    <div className="min-h-screen">
            <RoleGuard allowedRoles={["principal"]}>
      <PrincipalSidebar />

      <main className="min-h-screen pt-16 lg:pl-72 lg:pt-0">

        {children}
      </main>
            </RoleGuard>
    </div>
  );
}