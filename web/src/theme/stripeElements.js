export function getStripeCardElementOptions(theme) {
  const isDark = theme !== 'light'

  // Stripe Elements styles are applied inside an iframe; avoid CSS variables here.
  const colors = isDark
    ? {
      bg: 'transparent', // slate-900
      fg: '#e2e8f0', // slate-200
      muted: '#94a3b8', // slate-400
      accent: '#38bdf8', // sky-400
      invalid: '#fda4af', // rose-300
    }
    : {
      bg: 'transparent',
      fg: '#0f172a', // slate-900
      muted: '#64748b', // slate-500
      accent: '#0284c7', // sky-600
      invalid: '#e11d48', // rose-600
    }

  return {
    hidePostalCode: true,
    style: {
      base: {
        backgroundColor: colors.bg,
        color: colors.fg,
        '::placeholder': { color: colors.muted },
        iconColor: colors.accent,
        fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif",
        fontSize: '14px',
        fontSmoothing: 'antialiased',
      },
      invalid: {
        color: colors.invalid,
      },
    },
  }
}
