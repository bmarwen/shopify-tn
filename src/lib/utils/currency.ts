// src/lib/utils/currency.ts
export const formatCurrency = (amount: number | string, currency: string = 'DT'): string => {
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(numAmount)) {
    return `0.00 ${currency}`;
  }
  return `${numAmount.toFixed(2)} ${currency}`;
};

export const formatDate = (date: Date | string, locale: string = 'fr-FR'): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return dateObj.toLocaleDateString(locale, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
};

export const formatDateTime = (date: Date | string, locale: string = 'fr-FR'): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return dateObj.toLocaleDateString(locale, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};
