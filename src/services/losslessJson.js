import { isInteger, isLosslessNumber, parse } from 'lossless-json';

export function parseJsonPreservingInt64(rawBody) {
  return parse(rawBody, (_key, value) => {
    if (!isLosslessNumber(value)) {
      return value;
    }

    const numericToken = value.toString();
    if (isInteger(numericToken)) {
      const numberValue = Number(numericToken);
      return Number.isSafeInteger(numberValue) ? numberValue : numericToken;
    }

    return Number(numericToken);
  });
}
