import { ClerkProvider } from "@clerk/nextjs";
import Navbar from "./components/Navbar";
import "./globals.css";

export const metadata = {
  title: "KPT Attendance & IA",
  description: "College Attendance and Internal Assessment Management System",
};

export default function RootLayout({ children }) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body className="min-h-screen bg-gray-50 text-gray-900">

          <Navbar />

          <main>
            {children}
          </main>

        </body>
      </html>
    </ClerkProvider>
  );
}