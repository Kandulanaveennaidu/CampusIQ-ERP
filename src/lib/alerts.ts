import Swal from "sweetalert2";

// ──── Theme-aware SweetAlert2 Utility ────
// Reusable alert functions with animations, dark mode support, and consistent styling.

/** Detect if dark mode is active */
const isDark = () =>
  typeof document !== "undefined" &&
  document.documentElement.classList.contains("dark");

/** Custom class sets for light/dark themes */
const getClasses = () => ({
  popup: `rounded-xl shadow-2xl border ${isDark() ? "!bg-gray-900 !text-gray-100 border-gray-700" : "!bg-white !text-gray-900 border-gray-200"}`,
  title: isDark() ? "!text-gray-100" : "!text-gray-900",
  htmlContainer: isDark() ? "!text-gray-300" : "!text-gray-600",
  confirmButton:
    "!bg-blue-600 hover:!bg-blue-700 !text-white !rounded-lg !px-5 !py-2.5 !font-medium !shadow-md !transition-all !duration-200",
  cancelButton:
    "!bg-gray-200 hover:!bg-gray-300 !text-gray-800 !rounded-lg !px-5 !py-2.5 !font-medium !shadow-md !transition-all !duration-200",
  denyButton:
    "!bg-red-600 hover:!bg-red-700 !text-white !rounded-lg !px-5 !py-2.5 !font-medium !shadow-md !transition-all !duration-200",
});

// ──── Success Alert ────
export const showSuccess = (title: string, message?: string) =>
  Swal.fire({
    icon: "success",
    title,
    text: message,
    timer: 3000,
    timerProgressBar: true,
    showConfirmButton: false,
    customClass: getClasses(),
    showClass: {
      popup: "animate__animated animate__fadeInDown animate__faster",
    },
    hideClass: {
      popup: "animate__animated animate__fadeOutUp animate__faster",
    },
  });

// ──── Error Alert ────
export const showError = (title: string, message?: string) =>
  Swal.fire({
    icon: "error",
    title,
    text: message,
    timer: 5000,
    timerProgressBar: true,
    showConfirmButton: true,
    confirmButtonText: "OK",
    customClass: getClasses(),
    showClass: { popup: "animate__animated animate__shakeX animate__faster" },
    hideClass: { popup: "animate__animated animate__fadeOut animate__faster" },
  });

// ──── Warning Alert ────
export const showWarning = (title: string, message?: string) =>
  Swal.fire({
    icon: "warning",
    title,
    text: message,
    timer: 5000,
    timerProgressBar: true,
    showConfirmButton: true,
    confirmButtonText: "OK",
    customClass: getClasses(),
    showClass: {
      popup: "animate__animated animate__fadeInDown animate__faster",
    },
    hideClass: { popup: "animate__animated animate__fadeOut animate__faster" },
  });

// ──── Info Alert ────
export const showInfo = (title: string, message?: string) =>
  Swal.fire({
    icon: "info",
    title,
    text: message,
    timer: 4000,
    timerProgressBar: true,
    showConfirmButton: false,
    customClass: getClasses(),
    showClass: {
      popup: "animate__animated animate__fadeInDown animate__faster",
    },
    hideClass: {
      popup: "animate__animated animate__fadeOutUp animate__faster",
    },
  });

// ──── Confirmation Dialog ────
export const confirmAlert = async (
  title: string,
  text: string,
  confirmText = "Yes, proceed",
  icon: "warning" | "question" | "info" = "warning",
) => {
  const result = await Swal.fire({
    icon,
    title,
    text,
    showCancelButton: true,
    confirmButtonText: confirmText,
    cancelButtonText: "Cancel",
    reverseButtons: true,
    customClass: getClasses(),
    showClass: { popup: "animate__animated animate__zoomIn animate__faster" },
    hideClass: { popup: "animate__animated animate__zoomOut animate__faster" },
  });
  return result.isConfirmed;
};

// ──── Delete Confirmation ────
export const confirmDelete = async (itemName: string) => {
  const result = await Swal.fire({
    icon: "warning",
    title: "Delete " + itemName + "?",
    text: "This action cannot be undone.",
    showCancelButton: true,
    confirmButtonText: "Yes, delete",
    cancelButtonText: "Cancel",
    reverseButtons: true,
    customClass: {
      ...getClasses(),
      confirmButton:
        "!bg-red-600 hover:!bg-red-700 !text-white !rounded-lg !px-5 !py-2.5 !font-medium !shadow-md !transition-all !duration-200",
    },
    showClass: { popup: "animate__animated animate__zoomIn animate__faster" },
    hideClass: { popup: "animate__animated animate__zoomOut animate__faster" },
  });
  return result.isConfirmed;
};

// ──── Prompt Dialog (text input) ────
export const promptAlert = async (title: string, placeholder = "") => {
  const result = await Swal.fire({
    title,
    input: "text",
    inputPlaceholder: placeholder,
    showCancelButton: true,
    confirmButtonText: "Submit",
    cancelButtonText: "Cancel",
    reverseButtons: true,
    customClass: getClasses(),
    inputValidator: (value) => {
      if (!value) return "This field is required";
    },
    showClass: {
      popup: "animate__animated animate__fadeInDown animate__faster",
    },
    hideClass: {
      popup: "animate__animated animate__fadeOutUp animate__faster",
    },
  });
  return result.isConfirmed ? (result.value as string) : null;
};

// ──── Password Prompt Dialog ────
export const promptPassword = async (title: string) => {
  const result = await Swal.fire({
    title,
    input: "password",
    inputPlaceholder: "Enter new password",
    showCancelButton: true,
    confirmButtonText: "Reset",
    cancelButtonText: "Cancel",
    reverseButtons: true,
    customClass: getClasses(),
    inputValidator: (value) => {
      if (!value) return "Password is required";
      if (value.length < 6) return "Password must be at least 6 characters";
    },
    showClass: {
      popup: "animate__animated animate__fadeInDown animate__faster",
    },
    hideClass: {
      popup: "animate__animated animate__fadeOutUp animate__faster",
    },
  });
  return result.isConfirmed ? (result.value as string) : null;
};

// ──── Loading popup ────
export const showLoading = (title = "Please wait...") => {
  Swal.fire({
    title,
    allowOutsideClick: false,
    allowEscapeKey: false,
    showConfirmButton: false,
    customClass: getClasses(),
    didOpen: () => Swal.showLoading(),
  });
};

export const hideLoading = () => Swal.close();

// ──── showConfirm (alias for confirmAlert) ────
export const showConfirm = confirmAlert;

// ──── Generic trigger (matches old project API) ────
export const triggerAlert = (
  icon: "success" | "error" | "warning" | "info",
  title: string,
  message?: string,
) =>
  Swal.fire({
    icon,
    title,
    text: message,
    timer: 5000,
    timerProgressBar: true,
    customClass: getClasses(),
    showClass: {
      popup: "animate__animated animate__fadeInDown animate__faster",
    },
    hideClass: {
      popup: "animate__animated animate__fadeOutUp animate__faster",
    },
  });
