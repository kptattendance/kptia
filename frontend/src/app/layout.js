import { ClerkProvider } from "@clerk/nextjs";
import Navbar from "./components/Navbar";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

// Site font
const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
  display: "swap",
});

export const metadata = {
  metadataBase: new URL("https://ia.kptmangaluru.in"),

  title: {
    default: "KPT Attendance & Internal Assessment System",
    template: "%s | KPT Mangaluru",
  },

  description:
    "KPT Mangaluru Attendance and Internal Assessment Management System for students, faculty, HODs and examination administration.",

  keywords: [
    "KPT Mangaluru",
    "Karnataka Government Polytechnic Mangaluru",
    "KPT Attendance",
    "KPT Internal Assessment",
    "KPT Mangaluru Attendance",
    "KPT IA",
    "Polytechnic Attendance Management",
    "Diploma Student Attendance",
    "Internal Assessment Management",
    "Karnataka Polytechnic",
  ],

  authors: [
    {
      name: "Karnataka Government Polytechnic Mangaluru",
    },
  ],

  creator: "Karnataka Government Polytechnic Mangaluru",
  publisher: "Karnataka Government Polytechnic Mangaluru",

  // Google Search Console verification
  verification: {
    google: "O67tWHY9xLUtBxSrAxCliKSiLNqr1KiTwmd_uKb_iVA",
  },

  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
  },

  openGraph: {
    type: "website",
    locale: "en_IN",
    url: "https://ia.kptmangaluru.in",
    siteName: "KPT Attendance & IA",
    title: "KPT Attendance & Internal Assessment System",
    description:
      "Attendance and Internal Assessment Management System of Karnataka Government Polytechnic Mangaluru.",
  },

  twitter: {
    card: "summary_large_image",
    title: "KPT Attendance & Internal Assessment System",
    description:
      "Attendance and Internal Assessment Management System of Karnataka Government Polytechnic Mangaluru.",
  },

  alternates: {
    canonical: "https://ia.kptmangaluru.in",
  },
};

// Phone browser bar in the theme colour
export const viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#283618",
};

const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "EducationalOrganization",
  name: "Karnataka Government Polytechnic Mangaluru",
  alternateName: "KPT Mangaluru",
  url: "https://ia.kptmangaluru.in",
};

export default function RootLayout({ children }) {
  return (
    <ClerkProvider
      appearance={{
        variables: {
          colorPrimary: "#606c38",
          colorText: "#283618",
          borderRadius: "0.75rem",
        },
      }}
    >
      <html lang="en" className={jakarta.variable}>
        <body className="min-h-screen font-sans text-slate-900">
          <Navbar />

          <main>{children}</main>

          {/* Educational Organization Structured Data */}
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: JSON.stringify(organizationSchema),
            }}
          />
        </body>
      </html>
    </ClerkProvider>
  );
}