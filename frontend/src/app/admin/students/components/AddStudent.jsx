"use client";

import { useState } from "react";
import { useAuth } from "@clerk/nextjs";
import axios from "axios";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

const departments = [
  { value: "at", label: "Automobile Engineering" },
  { value: "ch", label: "Chemical Engineering" },
  { value: "ce", label: "Civil Engineering" },
  { value: "cs", label: "Computer Science Engineering" },
  { value: "ec", label: "Electronics & Communication" },
  { value: "ee", label: "Electrical & Electronics" },
  { value: "me", label: "Mechanical Engineering" },
  { value: "ps", label: "Polymer Engineering" },
  { value: "sc", label: "Science & English" },
  { value: "ot", label: "Other" },
];

const genders = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "other", label: "Other" },
];

const admissionTypes = [
  { value: "regular", label: "Regular" },
  { value: "lateralPUC", label: "Lateral Entry – PUC" },
  { value: "lateralITI", label: "Lateral Entry – ITI" },
  { value: "lateralCross", label: "Lateral Entry – Cross" },
  { value: "workingProfessional", label: "Working Professional" },
];

const statuses = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
  { value: "passed", label: "Passed" },
  { value: "detained", label: "Detained" },
  { value: "discontinued", label: "Discontinued" },
  { value: "transferred", label: "Transferred" },
];

export default function AddStudent({
  onSuccess,
  onCancel,
}) {
  const { getToken } = useAuth();

  const [form, setForm] = useState({
    rollNumber: "",
    registerNumber: "",
    name: "",
    fatherName: "",
    motherName: "",
    dob: "",
    gender: "",
    email: "",
    phone: "",
    parentPhone: "",
    caste: "",
    category: "",
    aadhaarNumber: "",
    satsNumber: "",
    department: "",
    admissionYear: "",
    batch: "",
    batchNumber: "",
    admissionType: "",
    semester: "",
    status: "active",
  });

  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e) => {
    const { name, value } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Please select a valid image.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("Image size must be less than 5 MB.");
      return;
    }

    setError("");
    setImage(file);
    setPreview(URL.createObjectURL(file));
  };

  const removeImage = () => {
    setImage(null);
    setPreview("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setError("");

    // ------------------------------------------------------
    // REQUIRED FIELD VALIDATION
    // ------------------------------------------------------

    if (
      !form.rollNumber.trim() ||
      !form.registerNumber.trim() ||
      !form.name.trim() ||
      !form.fatherName.trim() ||
      !form.motherName.trim() ||
      !form.dob ||
      !form.gender ||
      !form.email.trim() ||
      !form.phone.trim() ||
      !form.department ||
      !form.admissionYear ||
      !form.batch.trim() ||
      !form.batchNumber ||
      !form.admissionType ||
      !form.semester
    ) {
      setError(
        "Please fill in all required fields."
      );
      return;
    }

    // ------------------------------------------------------
    // GENDER VALIDATION
    // ------------------------------------------------------

    if (
      !["male", "female", "other"].includes(
        form.gender
      )
    ) {
      setError(
        "Please select a valid gender."
      );
      return;
    }

    // ------------------------------------------------------
    // PHONE VALIDATION
    // ------------------------------------------------------

    if (!/^\d{10}$/.test(form.phone.trim())) {
      setError(
        "Student phone number must contain exactly 10 digits."
      );
      return;
    }

    // ------------------------------------------------------
    // PARENT PHONE VALIDATION
    // ------------------------------------------------------

    if (
      form.parentPhone.trim() &&
      !/^\d{10}$/.test(
        form.parentPhone.trim()
      )
    ) {
      setError(
        "Parent phone number must contain exactly 10 digits."
      );
      return;
    }

    // ------------------------------------------------------
    // AADHAAR VALIDATION
    // ------------------------------------------------------

    if (
      form.aadhaarNumber.trim() &&
      !/^\d{12}$/.test(
        form.aadhaarNumber.trim()
      )
    ) {
      setError(
        "Aadhaar number must contain exactly 12 digits."
      );
      return;
    }

    // ------------------------------------------------------
    // BATCH NUMBER VALIDATION
    // ------------------------------------------------------

    if (
      !["1", "2"].includes(
        String(form.batchNumber)
      )
    ) {
      setError(
        "Batch number must be either 1 or 2."
      );
      return;
    }

    // ------------------------------------------------------
    // SEMESTER VALIDATION
    // ------------------------------------------------------

    if (
      ![1, 2, 3, 4, 5, 6].includes(
        Number(form.semester)
      )
    ) {
      setError(
        "Semester must be between 1 and 6."
      );
      return;
    }

    try {
      setSaving(true);

      const token = await getToken();

      const formData = new FormData();

      // ----------------------------------------------------
      // BASIC INFORMATION
      // ----------------------------------------------------

      formData.append(
        "rollNumber",
        form.rollNumber.trim()
      );

      formData.append(
        "registerNumber",
        form.registerNumber.trim()
      );

      formData.append(
        "name",
        form.name.trim()
      );

      formData.append(
        "fatherName",
        form.fatherName.trim()
      );

      formData.append(
        "motherName",
        form.motherName.trim()
      );

      formData.append(
        "dob",
        form.dob
      );

      formData.append(
        "gender",
        form.gender
      );

      // ----------------------------------------------------
      // CONTACT INFORMATION
      // ----------------------------------------------------

      formData.append(
        "email",
        form.email.trim().toLowerCase()
      );

      formData.append(
        "phone",
        form.phone.trim()
      );

      formData.append(
        "parentPhone",
        form.parentPhone.trim()
      );

      // ----------------------------------------------------
      // SOCIAL / RESERVATION INFORMATION
      // ----------------------------------------------------

      formData.append(
        "caste",
        form.caste.trim()
      );

      formData.append(
        "category",
        form.category.trim()
      );

      // ----------------------------------------------------
      // GOVERNMENT / IDENTIFICATION INFORMATION
      // ----------------------------------------------------

      formData.append(
        "aadhaarNumber",
        form.aadhaarNumber.trim()
      );

      formData.append(
        "satsNumber",
        form.satsNumber.trim()
      );

      // ----------------------------------------------------
      // ACADEMIC INFORMATION
      // ----------------------------------------------------

      formData.append(
        "department",
        form.department
      );

      formData.append(
        "admissionYear",
        form.admissionYear
      );

      formData.append(
        "batch",
        form.batch.trim()
      );

      formData.append(
        "batchNumber",
        form.batchNumber
      );

      formData.append(
        "admissionType",
        form.admissionType
      );

      formData.append(
        "semester",
        form.semester
      );

      // ----------------------------------------------------
      // STATUS
      // ----------------------------------------------------

      formData.append(
        "status",
        form.status
      );

      // ----------------------------------------------------
      // PHOTO
      // ----------------------------------------------------

      if (image) {
        formData.append(
          "image",
          image
        );
      }

      // ----------------------------------------------------
      // SUBMIT
      // ----------------------------------------------------

      await axios.post(
        `${API_URL}/api/students`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      onSuccess?.();

    } catch (err) {
      console.error(
        "Add student error:",
        err
      );

      setError(
        err.response?.data?.message ||
          "Failed to add student."
      );

    } finally {
      setSaving(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border border-slate-200 bg-white shadow-sm"
    >

      {/* HEADER */}

      <div className="border-b border-slate-100 px-6 py-5">
        <h2 className="text-base font-semibold text-slate-900">
          Student Information
        </h2>

        <p className="mt-1 text-sm text-slate-500">
          Enter the student's academic and personal details.
        </p>
      </div>

      {/* FORM */}

      <div className="space-y-7 p-6">

        {/* PHOTO */}

        <div>
          <label className="text-sm font-medium text-slate-700">
            Student Photo
            <span className="ml-1 text-xs font-normal text-slate-400">
              (Optional)
            </span>
          </label>

          <div className="mt-3 flex items-center gap-5">

            <div className="relative">

              {preview ? (
                <img
                  src={preview}
                  alt="Student preview"
                  className="h-24 w-24 rounded-2xl object-cover ring-1 ring-slate-200"
                />
              ) : (
                <div className="flex h-24 w-24 items-center justify-center rounded-2xl bg-slate-100 ring-1 ring-slate-200">

                  <svg
                    className="h-9 w-9 text-slate-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="1.5"
                      d="M15 19a4 4 0 0 0-6 0m3-8a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm8 8v-2a4 4 0 0 0-3-3.87M18 3.13a3 3 0 0 1 0 5.74"
                    />
                  </svg>

                </div>
              )}

            </div>

            <div>

              <label className="inline-flex cursor-pointer rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50">

                Choose Photo

                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                />

              </label>

              {preview && (
                <button
                  type="button"
                  onClick={removeImage}
                  className="ml-2 text-sm text-red-600 hover:text-red-700"
                >
                  Remove
                </button>
              )}

              <p className="mt-2 text-xs text-slate-400">
                JPG, PNG or WebP. Maximum 5 MB.
              </p>

            </div>

          </div>
        </div>


        {/* BASIC INFORMATION */}

        <div>

          <h3 className="mb-4 text-sm font-semibold text-slate-900">
            Basic Information
          </h3>

          <div className="grid gap-5 md:grid-cols-2">

            {/* ROLL NUMBER */}

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Roll Number
                <span className="ml-1 text-red-500">
                  *
                </span>
              </label>

              <input
                name="rollNumber"
                value={form.rollNumber}
                onChange={handleChange}
                placeholder="Enter roll number"
                required
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-slate-400 focus:bg-white"
              />
            </div>


            {/* REGISTER NUMBER */}

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Register Number
                <span className="ml-1 text-red-500">
                  *
                </span>
              </label>

              <input
                name="registerNumber"
                value={form.registerNumber}
                onChange={handleChange}
                placeholder="e.g. 103CS26001"
                required
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-slate-400 focus:bg-white"
              />
            </div>


            {/* NAME */}

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Full Name
                <span className="ml-1 text-red-500">
                  *
                </span>
              </label>

              <input
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder="Enter student's full name"
                required
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-slate-400 focus:bg-white"
              />
            </div>


            {/* FATHER NAME */}

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Father Name
                <span className="ml-1 text-red-500">
                  *
                </span>
              </label>

              <input
                name="fatherName"
                value={form.fatherName}
                onChange={handleChange}
                placeholder="Enter father's name"
                required
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-slate-400 focus:bg-white"
              />
            </div>


            {/* MOTHER NAME */}

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Mother Name
                <span className="ml-1 text-red-500">
                  *
                </span>
              </label>

              <input
                name="motherName"
                value={form.motherName}
                onChange={handleChange}
                placeholder="Enter mother's name"
                required
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-slate-400 focus:bg-white"
              />
            </div>


            {/* DOB */}

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Date of Birth
                <span className="ml-1 text-red-500">
                  *
                </span>
              </label>

              <input
                type="date"
                name="dob"
                value={form.dob}
                onChange={handleChange}
                required
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-slate-400 focus:bg-white"
              />
            </div>


            {/* GENDER */}

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Gender
                <span className="ml-1 text-red-500">
                  *
                </span>
              </label>

              <select
                name="gender"
                value={form.gender}
                onChange={handleChange}
                required
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-slate-400 focus:bg-white"
              >
                <option value="">
                  Select gender
                </option>

                {genders.map((gender) => (
                  <option
                    key={gender.value}
                    value={gender.value}
                  >
                    {gender.label}
                  </option>
                ))}
              </select>
            </div>

          </div>

        </div>


        {/* CONTACT INFORMATION */}

        <div>

          <h3 className="mb-4 text-sm font-semibold text-slate-900">
            Contact Information
          </h3>

          <div className="grid gap-5 md:grid-cols-2">

            {/* EMAIL */}

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Email
                <span className="ml-1 text-red-500">
                  *
                </span>
              </label>

              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                placeholder="student@example.com"
                required
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-slate-400 focus:bg-white"
              />
            </div>


            {/* PHONE */}

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Student Phone
                <span className="ml-1 text-red-500">
                  *
                </span>
              </label>

              <input
                type="tel"
                name="phone"
                value={form.phone}
                onChange={handleChange}
                placeholder="10 digit mobile number"
                maxLength="10"
                required
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-slate-400 focus:bg-white"
              />
            </div>


            {/* PARENT PHONE */}

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Parent / Guardian Phone
                <span className="ml-1 text-xs font-normal text-slate-400">
                  (Optional)
                </span>
              </label>

              <input
                type="tel"
                name="parentPhone"
                value={form.parentPhone}
                onChange={handleChange}
                placeholder="10 digit mobile number"
                maxLength="10"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-slate-400 focus:bg-white"
              />
            </div>

          </div>

        </div>


        {/* SOCIAL / RESERVATION INFORMATION */}

        <div>

          <h3 className="mb-4 text-sm font-semibold text-slate-900">
            Social / Reservation Information
          </h3>

          <div className="grid gap-5 md:grid-cols-2">

            {/* CASTE */}

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Caste
                <span className="ml-1 text-xs font-normal text-slate-400">
                  (Optional)
                </span>
              </label>

              <input
                name="caste"
                value={form.caste}
                onChange={handleChange}
                placeholder="Enter caste"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-slate-400 focus:bg-white"
              />
            </div>


            {/* CATEGORY */}

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Category
                <span className="ml-1 text-xs font-normal text-slate-400">
                  (Optional)
                </span>
              </label>

              <input
                name="category"
                value={form.category}
                onChange={handleChange}
                placeholder="e.g. GM, SC, ST, OBC"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-slate-400 focus:bg-white"
              />
            </div>

          </div>

        </div>


        {/* GOVERNMENT / IDENTIFICATION INFORMATION */}

        <div>

          <h3 className="mb-4 text-sm font-semibold text-slate-900">
            Government / Student Identification
          </h3>

          <div className="grid gap-5 md:grid-cols-2">

            {/* AADHAAR */}

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Aadhaar Number
                <span className="ml-1 text-xs font-normal text-slate-400">
                  (Optional)
                </span>
              </label>

              <input
                type="text"
                name="aadhaarNumber"
                value={form.aadhaarNumber}
                onChange={handleChange}
                placeholder="12 digit Aadhaar number"
                maxLength="12"
                inputMode="numeric"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-slate-400 focus:bg-white"
              />
            </div>


            {/* SATS */}

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                SATS Number
                <span className="ml-1 text-xs font-normal text-slate-400">
                  (Optional)
                </span>
              </label>

              <input
                type="text"
                name="satsNumber"
                value={form.satsNumber}
                onChange={handleChange}
                placeholder="Enter SATS number"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-slate-400 focus:bg-white"
              />
            </div>

          </div>

        </div>


        {/* ACADEMIC INFORMATION */}

        <div>

          <h3 className="mb-4 text-sm font-semibold text-slate-900">
            Academic Information
          </h3>

          <div className="grid gap-5 md:grid-cols-3">

            {/* DEPARTMENT */}

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Department
                <span className="ml-1 text-red-500">
                  *
                </span>
              </label>

              <select
                name="department"
                value={form.department}
                onChange={handleChange}
                required
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none focus:border-slate-400 focus:bg-white"
              >
                <option value="">
                  Select department
                </option>

                {departments.map(
                  (department) => (
                    <option
                      key={department.value}
                      value={department.value}
                    >
                      {department.label}
                    </option>
                  )
                )}

              </select>
            </div>


            {/* ADMISSION YEAR */}

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Admission Year
                <span className="ml-1 text-red-500">
                  *
                </span>
              </label>

              <input
                type="number"
                name="admissionYear"
                value={form.admissionYear}
                onChange={handleChange}
                placeholder="e.g. 2025"
                min="2000"
                max="2100"
                required
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none focus:border-slate-400 focus:bg-white"
              />

              <p className="mt-1.5 text-xs text-slate-400">
                Example: 2025
              </p>
            </div>


            {/* CURRENT SEMESTER */}

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Current Semester
                <span className="ml-1 text-red-500">
                  *
                </span>
              </label>

              <select
                name="semester"
                value={form.semester}
                onChange={handleChange}
                required
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none focus:border-slate-400 focus:bg-white"
              >
                <option value="">
                  Select semester
                </option>

                {[1, 2, 3, 4, 5, 6].map(
                  (semester) => (
                    <option
                      key={semester}
                      value={semester}
                    >
                      Semester {semester}
                    </option>
                  )
                )}

              </select>
            </div>


            {/* BATCH */}

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Batch
                <span className="ml-1 text-red-500">
                  *
                </span>
              </label>

              <input
                name="batch"
                value={form.batch}
                onChange={handleChange}
                placeholder="e.g. 2025-2028"
                required
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-slate-400 focus:bg-white"
              />

              <p className="mt-1.5 text-xs text-slate-400">
                Example: 2025-2028
              </p>
            </div>


            {/* BATCH NUMBER */}

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Batch Number
                <span className="ml-1 text-red-500">
                  *
                </span>
              </label>

              <select
                name="batchNumber"
                value={form.batchNumber}
                onChange={handleChange}
                required
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none focus:border-slate-400 focus:bg-white"
              >
                <option value="">
                  Select batch
                </option>

                <option value="1">
                  Batch 1
                </option>

                <option value="2">
                  Batch 2
                </option>

              </select>

              <p className="mt-1.5 text-xs text-slate-400">
                Select Batch 1 or Batch 2
              </p>
            </div>


            {/* ADMISSION TYPE */}

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Admission Type
                <span className="ml-1 text-red-500">
                  *
                </span>
              </label>

              <select
                name="admissionType"
                value={form.admissionType}
                onChange={handleChange}
                required
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none focus:border-slate-400 focus:bg-white"
              >
                <option value="">
                  Select admission type
                </option>

                {admissionTypes.map(
                  (type) => (
                    <option
                      key={type.value}
                      value={type.value}
                    >
                      {type.label}
                    </option>
                  )
                )}

              </select>
            </div>

          </div>

        </div>


        {/* STUDENT STATUS */}

        <div>

          <h3 className="mb-4 text-sm font-semibold text-slate-900">
            Student Status
          </h3>

          <div className="grid gap-5 md:grid-cols-2">

            {/* STATUS */}

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Status
              </label>

              <select
                name="status"
                value={form.status}
                onChange={handleChange}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none focus:border-slate-400 focus:bg-white"
              >
                {statuses.map(
                  (status) => (
                    <option
                      key={status.value}
                      value={status.value}
                    >
                      {status.label}
                    </option>
                  )
                )}
              </select>
            </div>

          </div>

        </div>


        {/* ERROR */}

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3">
            <p className="text-sm text-red-600">
              {error}
            </p>
          </div>
        )}

      </div>


      {/* FOOTER */}

      <div className="flex items-center justify-end gap-3 border-t border-slate-100 bg-slate-50/50 px-6 py-4">

        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Cancel
        </button>

        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
        >

          {saving && (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
          )}

          {saving
            ? "Adding Student..."
            : "Add Student"}

        </button>

      </div>

    </form>
  );
}