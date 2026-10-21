export const metadata = {
  title: "Privacy Policy",
  description:
    "Privacy policy of the KPT Attendance and Internal Assessment System.",
};

const sections = [
  {
    heading: "Who runs this system",
    body: [
      "The KPT Attendance and Internal Assessment System at ia.kptmangaluru.in is run by Karnataka Government Polytechnic, Mangaluru, for its own students, faculty, heads of department and administration. It is not open to the public.",
    ],
  },
  {
    heading: "What information the system holds",
    body: [
      "Students: name, register number, roll number, department, semester, batch, date of birth, gender, parents' names, email address, phone numbers, photograph, and other admission details entered by the college.",
      "Faculty and staff: name, email address, phone number, department, role and photograph.",
      "Academic records: monthly attendance, internal assessment marks, course outcomes, subject allocation, and study material uploaded by faculty.",
      "Sign-in information: the email address used to sign in, and the time of sign-in.",
    ],
  },
  {
    heading: "How the information is used",
    body: [
      "To record and show attendance and internal assessment marks.",
      "To let students see their own records and read study material for their own subjects.",
      "To let faculty, heads of department, the principal and the administration carry out academic work and prepare reports, including reports required for accreditation.",
      "The information is not sold, and it is not used for advertising.",
    ],
  },
  {
    heading: "Who can see it",
    body: [
      "A student can see only their own records.",
      "Faculty and heads of department can see the records of the classes and departments they work with.",
      "The principal and the system administrators of the college can see all records.",
      "Records are shared outside the college only when the college is required to do so by the Department of Technical Education, an accreditation body, or by law.",
    ],
  },
  {
    heading: "Services used to run the system",
    body: [
      "Sign-in is handled by Clerk. Records are stored in MongoDB Atlas. Photographs are stored in Cloudinary. The website is hosted on Vercel.",
      "Study material is stored in a Google Drive account that belongs to the college. The system uses Google Drive only to store and read the study material files it has uploaded itself. It does not read, change or delete any other file in that Google Drive, and it does not access the Google Drive of any student or faculty member.",
      "Study material is shown inside this website to signed-in students of the relevant class. The files are not shared publicly.",
    ],
  },
  {
    heading: "How long it is kept",
    body: [
      "Academic records are kept for as long as the college is required to keep them. Sign-in accounts of students and staff who have left the college are removed by the administration.",
    ],
  },
  {
    heading: "Corrections and questions",
    body: [
      "If your details or records are wrong, tell your class faculty or head of department, who can have them corrected. For any question about this policy, contact the office of the Principal, Karnataka Government Polytechnic, Mangaluru.",
    ],
  },
];

export default function PrivacyPolicyPage() {
  return (
    <main className="min-h-screen px-5 py-12">
      <div className="mx-auto max-w-3xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-10">

        <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
          Karnataka Government Polytechnic, Mangaluru
        </p>

        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
          Privacy Policy
        </h1>

        <p className="mt-2 text-sm text-slate-500">
          KPT Attendance and Internal Assessment System
        </p>

        {sections.map((section) => (
          <section key={section.heading} className="mt-8">
            <h2 className="text-lg font-semibold text-slate-900">
              {section.heading}
            </h2>

            {section.body.map((paragraph) => (
              <p
                key={paragraph}
                className="mt-3 text-sm leading-7 text-slate-600"
              >
                {paragraph}
              </p>
            ))}
          </section>
        ))}

      </div>
    </main>
  );
}
