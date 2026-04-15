import { clsx, type ClassValue } from 'clsx';
import axios from 'axios';
import { twMerge } from 'tailwind-merge';

export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));

export const formatCurrency = (value: number, currency = 'PKR') =>
  new Intl.NumberFormat(currency === 'AED' ? 'en-AE' : 'en-PK', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(value);

export const formatDate = (value: string | Date) =>
  new Intl.DateTimeFormat('en-PK', {
    dateStyle: 'medium',
  }).format(new Date(value));

export const toLocalDateTimeInputValue = (value: string | Date) => {
  const date = new Date(value);
  const offset = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - offset * 60 * 1000);
  return localDate.toISOString().slice(0, 16);
};

export const toIsoDateTime = (value: string) => new Date(value).toISOString();

export const getApiErrorMessage = (error: unknown, fallback = 'Something went wrong.') => {
  if (axios.isAxiosError(error)) {
    return (error.response?.data as { message?: string } | undefined)?.message ?? error.message ?? fallback;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return fallback;
};

export const triggerBrowserDownload = (blob: Blob, filename: string) => {
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  window.URL.revokeObjectURL(url);
};
