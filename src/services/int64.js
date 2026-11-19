export const MAX_INT64 = '9223372036854775807';

function normalizeInt64(value) {
  if (typeof value === 'number') {
    if (!Number.isSafeInteger(value) || value < 0) {
      return null;
    }
  } else if (typeof value !== 'string' || !/^\d+$/.test(value)) {
    return null;
  }

  const digits = String(value).replace(/^0+(?=\d)/, '');
  if (
    digits.length > MAX_INT64.length ||
    (digits.length === MAX_INT64.length && digits > MAX_INT64)
  ) {
    return null;
  }

  return digits;
}

export function normalizeNonNegativeInt64(value) {
  return normalizeInt64(value);
}

export function normalizePositiveInt64(value) {
  const normalized = normalizeInt64(value);
  return normalized && normalized !== '0' ? normalized : null;
}

export function isNonNegativeInt64(value) {
  return normalizeNonNegativeInt64(value) !== null;
}
