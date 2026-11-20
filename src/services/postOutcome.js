const definitiveStatusesByOperation = new Map([
  ['productCreation', new Set([400, 401, 403])],
  ['inventoryRegistration', new Set([400, 401, 403, 404, 409])],
  ['inventoryEntry', new Set([400, 401, 403, 404, 409])],
  ['inventoryExit', new Set([400, 401, 403, 404, 409])],
  ['inventoryAdjustment', new Set([400, 401, 403, 404, 409])],
  ['inventoryThreshold', new Set([400, 401, 403, 404, 409])],
]);

export function isDefinitiveMutationStatus(status, operation) {
  return Number.isInteger(status) &&
    definitiveStatusesByOperation.get(operation)?.has(status) === true;
}

export function isDefinitivePostStatus(status, operation) {
  return isDefinitiveMutationStatus(status, operation);
}
