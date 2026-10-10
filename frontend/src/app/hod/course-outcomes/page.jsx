"use client";

import { useUser } from "@clerk/nextjs";
import CourseOutcomesEditor from "../../components/CourseOutcomesEditor";

// HOD works only with the subjects of their own department.
// The department comes from Clerk metadata.

export default function HODCourseOutcomesPage() {
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
    <CourseOutcomesEditor fixedDepartment={department} />
  );
}
