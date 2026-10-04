import FacultySidebar from "./components/FacultySidebar";

export default function FacultyLayout({ children }) {
  return (
    <div className="min-h-screen overflow-x-hidden bg-gray-50">
      <FacultySidebar />

      <main className="min-h-screen ml-0 lg:ml-72">
        {children}
      </main>
    </div>
  );
}