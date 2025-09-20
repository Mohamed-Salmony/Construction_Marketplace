import Swal from 'sweetalert2';

function withDir(opts: any, rtl: boolean) {
  if (!rtl) return opts;
  return {
    ...opts,
    didOpen: (el: HTMLElement) => {
      el.setAttribute('dir', 'rtl');
      if (typeof opts.didOpen === 'function') opts.didOpen(el);
    },
  };
}

// Unified toast helpers
const baseToast = (icon: 'success' | 'error' | 'info' | 'warning', message: string, rtl = false) =>
  Swal.fire(withDir({
    toast: true,
    position: 'top-end',
    icon,
    title: message,
    showConfirmButton: false,
    timer: 2500,
    timerProgressBar: true,
  }, rtl));

export const toastSuccess = (message: string, rtl = false) => baseToast('success', message, rtl);
export const toastError = (message: string, rtl = false) => baseToast('error', message, rtl);
export const toastInfo = (message: string, rtl = false) => baseToast('info', message, rtl);
export const toastWarning = (message: string, rtl = false) => baseToast('warning', message, rtl);

// Keep confirmation dialog as a modal (not toast)
export async function confirmDialog(message: string, confirmText = 'Yes', cancelText = 'Cancel', rtl = false): Promise<boolean> {
  const res = await Swal.fire(withDir({
    title: message,
    icon: 'question',
    showCancelButton: true,
    confirmButtonText: confirmText,
    cancelButtonText: cancelText,
    reverseButtons: true,
  }, rtl));
  return !!res.isConfirmed;
}

// Aliases to maintain backwards compatibility with older imports across the app
// Simple toast aliases
export const success = toastSuccess;
export const error = toastError;
export const warning = toastWarning;
export const info = toastInfo;

// Alert-style modal (non-toast) helpers
function alertDialog(icon: 'success' | 'error' | 'warning' | 'info', message: string, rtl = false) {
  return Swal.fire(withDir({ icon, title: message, confirmButtonText: 'OK' }, rtl));
}

export const successAlert = (message: string, rtl = false) => alertDialog('success', message, rtl);
export const warningAlert = (message: string, rtl = false) => alertDialog('warning', message, rtl);
export const errorAlert = (message: string, rtl = false) => alertDialog('error', message, rtl);

// Dialog aliases expected by some screens
export const successDialog = (message: string, rtl = false) => alertDialog('success', message, rtl);
export const errorDialog = (message: string, rtl = false) => alertDialog('error', message, rtl);
export const warningDialog = (message: string, rtl = false) => alertDialog('warning', message, rtl);
