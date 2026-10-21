// src/utils/alert.js

import Swal from "sweetalert2";

export const showSuccess = (title, text = "") => {
  return Swal.fire({
    icon: "success",
    title,
    text,
    confirmButtonColor: "#283618",
  });
};

export const showError = (title, text = "") => {
  return Swal.fire({
    icon: "error",
    title,
    text,
    confirmButtonColor: "#283618",
  });
};

export const showWarning = (title, text = "") => {
  return Swal.fire({
    icon: "warning",
    title,
    text,
    confirmButtonColor: "#283618",
  });
};

export const showInfo = (title, text = "") => {
  return Swal.fire({
    icon: "info",
    title,
    text,
    confirmButtonColor: "#283618",
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
    confirmButtonColor: "#283618",
    cancelButtonColor: "#9a9474",
    reverseButtons: true,
  });
};