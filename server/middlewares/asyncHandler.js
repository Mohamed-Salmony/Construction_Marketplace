export default function asyncHandler(fn) {
  return function wrapped(req, res, next) {
    Promise.resolve(fn(req, res, next)).catch((err) => {
      // Ensure we always pass through Express error pipeline instead of crashing
      if (!err) {
        err = new Error('Unknown error');
      }
      // Attach a default status if missing to avoid undefined responses
      if (!err.status && !err.statusCode) {
        err.status = 500;
      }
      return next(err);
    });
  };
}
