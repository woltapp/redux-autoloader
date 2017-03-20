/* eslint-disable import/prefer-default-export */
export function assert(condition, message = 'Assertion failed') {
  if (!condition) {
    if (typeof Error !== 'undefined') {
      throw new Error(message);
    }

    throw message; // fallback if Error not supported
  }
}
