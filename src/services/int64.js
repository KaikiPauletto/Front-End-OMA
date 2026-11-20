export const MAX_INT64 = '9223372036854775807';
export const MIN_INT64 = '-9223372036854775808';

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

export function normalizeSignedInt64(value) {
  if (typeof value === 'number') {
    if (!Number.isSafeInteger(value)) {
      return null;
    }
  } else if (typeof value !== 'string' || !/^-?\d+$/.test(value)) {
    return null;
  }

  const stringValue = String(value);
  const isNegative = stringValue.startsWith('-');
  const digits = stringValue.replace(/^-/, '').replace(/^0+(?=\d)/, '');
  const maximumMagnitude = isNegative ? MIN_INT64.slice(1) : MAX_INT64;
  if (
    digits.length > maximumMagnitude.length ||
    (digits.length === maximumMagnitude.length && digits > maximumMagnitude)
  ) {
    return null;
  }

  return digits === '0' ? '0' : `${isNegative ? '-' : ''}${digits}`;
}

export function isSignedInt64(value) {
  return normalizeSignedInt64(value) !== null;
}

export function compareNonNegativeInt64(left, right) {
  const normalizedLeft = normalizeNonNegativeInt64(left);
  const normalizedRight = normalizeNonNegativeInt64(right);
  if (normalizedLeft === null || normalizedRight === null) {
    return null;
  }
  if (normalizedLeft.length !== normalizedRight.length) {
    return normalizedLeft.length < normalizedRight.length ? -1 : 1;
  }
  if (normalizedLeft === normalizedRight) {
    return 0;
  }
  return normalizedLeft < normalizedRight ? -1 : 1;
}

export function addNonNegativeInt64(left, right) {
  const normalizedLeft = normalizeNonNegativeInt64(left);
  const normalizedRight = normalizeNonNegativeInt64(right);
  if (normalizedLeft === null || normalizedRight === null) {
    return null;
  }

  let carry = 0;
  let result = '';
  let leftIndex = normalizedLeft.length - 1;
  let rightIndex = normalizedRight.length - 1;
  while (leftIndex >= 0 || rightIndex >= 0 || carry > 0) {
    const leftDigit = leftIndex >= 0 ? Number(normalizedLeft[leftIndex]) : 0;
    const rightDigit = rightIndex >= 0 ? Number(normalizedRight[rightIndex]) : 0;
    const sum = leftDigit + rightDigit + carry;
    result = `${sum % 10}${result}`;
    carry = Math.floor(sum / 10);
    leftIndex -= 1;
    rightIndex -= 1;
  }

  return normalizeNonNegativeInt64(result);
}
