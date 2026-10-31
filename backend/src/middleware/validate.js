import { AppError } from '../utils/http.js';

export function validate(schema, source = 'body') {
  return (req, _res, next) => {
    const parsed = schema.safeParse(req[source]);
    if (!parsed.success) {
      return next(
        new AppError('Please review the submitted information', {
          status: 400,
          code: 'VALIDATION_ERROR',
        }),
      );
    }
    req[source] = parsed.data;
    next();
  };
}
