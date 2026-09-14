import Swal, { SweetAlertIcon } from 'sweetalert2';

// Base customized SweetAlert mixin with project design system
const customSwal = Swal.mixin({
  customClass: {
    popup: 'rounded-2xl border border-slate-200 shadow-2xl font-sans',
    title: 'text-slate-900 font-bold text-lg sm:text-xl',
    htmlContainer: 'text-slate-600 text-xs sm:text-sm leading-relaxed',
    confirmButton: 'px-4 py-2 bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs sm:text-sm rounded-xl shadow-sm transition-all mx-1 cursor-pointer',
    cancelButton: 'px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs sm:text-sm rounded-xl transition-all mx-1 cursor-pointer',
    denyButton: 'px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs sm:text-sm rounded-xl transition-all mx-1 cursor-pointer'
  },
  buttonsStyling: false
});

// Toast notification mixin
const Toast = Swal.mixin({
  toast: true,
  position: 'top-end',
  showConfirmButton: false,
  timer: 3000,
  timerProgressBar: true,
  didOpen: (toast) => {
    toast.onmouseenter = Swal.stopTimer;
    toast.onmouseleave = Swal.resumeTimer;
  },
  customClass: {
    popup: 'rounded-xl shadow-lg border border-slate-200/80 text-xs sm:text-sm font-semibold font-sans'
  }
});

export const showAlert = {
  // 1. Success Notification
  success: (title: string, text?: string, timer: number = 2500) => {
    return customSwal.fire({
      icon: 'success',
      title,
      text,
      timer,
      timerProgressBar: true,
      confirmButtonText: 'Selesai'
    });
  },

  // 2. Error Alert
  error: (title: string, text?: string) => {
    return customSwal.fire({
      icon: 'error',
      title,
      text,
      confirmButtonText: 'Mengerti'
    });
  },

  // 3. Warning Alert
  warning: (title: string, text?: string) => {
    return customSwal.fire({
      icon: 'warning',
      title,
      text,
      confirmButtonText: 'Mengerti'
    });
  },

  // 4. Info Alert
  info: (title: string, text?: string) => {
    return customSwal.fire({
      icon: 'info',
      title,
      text,
      confirmButtonText: 'Tutup'
    });
  },

  // 5. Toast Popup (Non-blocking)
  toast: (title: string, icon: SweetAlertIcon = 'success', timer: number = 3000) => {
    return Toast.fire({
      icon,
      title
    });
  },

  // 6. Confirmation Dialog (Returns true if confirmed)
  confirm: async ({
    title,
    text,
    confirmButtonText = 'Ya, Lanjutkan',
    cancelButtonText = 'Batal',
    icon = 'warning',
    confirmButtonClass = 'px-4 py-2 bg-rose-700 hover:bg-rose-600 text-white font-bold text-xs sm:text-sm rounded-xl shadow-sm transition-all mx-1 cursor-pointer'
  }: {
    title: string;
    text?: string;
    confirmButtonText?: string;
    cancelButtonText?: string;
    icon?: SweetAlertIcon;
    confirmButtonClass?: string;
  }): Promise<boolean> => {
    const result = await customSwal.fire({
      title,
      text,
      icon,
      showCancelButton: true,
      confirmButtonText,
      cancelButtonText,
      reverseButtons: true,
      customClass: {
        popup: 'rounded-2xl border border-slate-200 shadow-2xl font-sans',
        title: 'text-slate-900 font-bold text-base sm:text-lg',
        htmlContainer: 'text-slate-600 text-xs sm:text-sm',
        confirmButton: confirmButtonClass,
        cancelButton: 'px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs sm:text-sm rounded-xl transition-all mx-1 cursor-pointer'
      }
    });

    return result.isConfirmed;
  }
};

export default showAlert;
