export const formatApiError = (details: unknown): string => {
  if (!details) {
    return 'An error occurred. Please try again.'
  }

  if (typeof details === 'string') {
    return details
  }

  if (Array.isArray(details)) {
    return details.map((item) => String(item)).join(', ')
  }

  if (typeof details === 'object') {
    return Object.values(details as Record<string, unknown>)
      .map((value) => formatApiError(value))
      .join(', ')
  }

  return String(details)
}


