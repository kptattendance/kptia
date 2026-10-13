"use client";

import { useUser } from "@clerk/nextjs";
import StudyMaterialManager from "../../components/StudyMaterialManager";

// HOD works only with the subjects of their own department.
// The department comes from Clerk metadata.

export default function HODStudyMaterialPage() {
  const { user, isLoaded } = useUser();

  const department = String(
    user?.publicMetadata?.department || ""
  )
    .trim()
    .toLowerCase();

  if (!isLoaded || !department) {
    return (
      <div className="p-8 text-sm text-slate-500">
        {isLoaded
          ? "Your department is not assigned."
          : "Loading..."}
      </div>
    );
  }

  return (
    <StudyMaterialManager
      fixedDepartment={department}
      description="See which faculty have uploaded study material for the subjects of your department. A file is shown to students only after you approve it."
    />
  );
}
