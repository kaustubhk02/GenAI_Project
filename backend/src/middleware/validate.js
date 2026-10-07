const HttpError = require('./httpError');

module.exports = (schema) => (req, res, next) => {
  const { value, error } = schema.validate(req.body, { abortEarly: false, stripUnknown: true });
  if (error) {
    return next(new HttpError(400, 'Validation failed', error.details.map((d) => d.message)));
  }
  req.body = value;
  next();
};
