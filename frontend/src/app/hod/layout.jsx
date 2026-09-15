import HODSidebar from "./components/HODSidebar";

export default function HODLayout({ children }) {
  return (
    <div className="min-h-screen bg-slate-50">
      <HODSidebar />

      <main className="ml-72 min-h-screen">
        {children}
      </main>
    </div>
  );
}