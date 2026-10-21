export const metadata = {
  title: "Terms of Service",
  description:
    "Terms of service of the KPT Attendance and Internal Assessment System.",
};

const sections = [
  {
    heading: "About this system",
    body: [
      "The KPT Attendance and Internal Assessment System at ia.kptmangaluru.in is provided by Karnataka Government Polytechnic, Mangaluru, for the academic work of the college. By signing in, you agree to these terms.",
    ],
  },
  {
    heading: "Who may use it",
    body: [
      "Only students, faculty, heads of department, the principal and administrative staff of the college who have been given an account by the college may use this system.",
      "Your account is for you alone. Do not share your sign-in details, and do not use another person's account.",
    ],
  },
  {
    heading: "Using the system properly",
    body: [
      "Faculty and staff must enter attendance and marks accurately and only for the classes they are responsible for.",
      "Do not try to see, change or delete records you are not permitted to.",
      "Do not try to disturb the working of the system or get around its security.",
    ],
  },
  {
    heading: "Study material",
    body: [
      "Study material is provided for the personal study of the students of the college. It may be read on this website. It must not be copied, downloaded, recorded, shared outside the college or sold.",
      "Each page shown to a student carries that student's register number.",
      "Faculty must upload only material they are permitted to share with students.",
    ],
  },
  {
    heading: "Records",
    body: [
      "The official academic records of the college are those kept and certified by the college. If something shown here differs from the official record, the official record applies. Report any mistake to your faculty or head of department.",
    ],
  },
  {
    heading: "Availability",
    body: [
      "The college tries to keep the system working, but it may be unavailable at times for maintenance or for reasons outside the college's control.",
    ],
  },
  {
    heading: "Misuse",
    body: [
      "The college may suspend or remove the account of anyone who misuses the system, and may take action under the rules of the college.",
    ],
  },
  {
    heading: "Changes and questions",
    body: [
      "The college may change these terms. For any question, contact the office of the Principal, Karnataka Government Polytechnic, Mangaluru.",
    ],
  },
];

export default function TermsOfServicePage() {
  return (
    <main className="min-h-screen px-5 py-12">
      <div className="mx-auto max-w-3xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-10">

        <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
          Karnataka Government Polytechnic, Mangaluru
        </p>

        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
          Terms of Service
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
