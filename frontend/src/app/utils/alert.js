// src/utils/alert.js

import Swal from "sweetalert2";

export const showSuccess = (title, text = "") => {
  return Swal.fire({
    icon: "success",
    title,
    text,
    confirmButtonColor: "#0f172a",
  });
};

export const showError = (title, text = "") => {
  return Swal.fire({
    icon: "error",
    title,
    text,
    confirmButtonColor: "#0f172a",
  });
};

export const showWarning = (title, text = "") => {
  return Swal.fire({
    icon: "warning",
    title,
    text,
    confirmButtonColor: "#0f172a",
  });
};

export const showInfo = (title, text = "") => {
  return Swal.fire({
    icon: "info",
    title,
    text,
    confirmButtonColor: "#0f172a",
  });
};

export const showConfirm = (
  title,
  text = "",
  confirmText = "Yes"
) => {
  return Swal.fire({
    icon: "question",
    title,
    text,
    showCancelButton: true,
    confirmButtonText: confirmText,
    cancelButtonText: "Cancel",
    confirmButtonColor: "#0f172a",
    cancelButtonColor: "#94a3b8",
    reverseButtons: true,
  });
};