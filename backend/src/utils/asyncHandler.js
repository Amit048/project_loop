// Wraps an async controller so any thrown/rejected error is forwarded to
// the global errorHandler instead of crashing the process.
export const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

export default asyncHandler;
