import FacultySidebar from "./components/FacultySidebar";

export default function FacultyLayout({ children }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <FacultySidebar />

      <main className="ml-72 min-h-screen">
        {children}
      </main>
    </div>
  );
}