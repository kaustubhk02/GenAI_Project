function notFound(req, res) {
  res.status(404).json({ message: `Route not found: ${req.method} ${req.originalUrl}` });
}

function errorHandler(err, req, res, next) { // eslint-disable-line no-unused-vars
  let status = err.status || 500;
  let message = err.message;
  if (err.name === 'CastError') { status = 400; message = 'Invalid id'; }
  if (err.code === 11000) { status = 409; message = 'Already exists'; }
  if (err.code === 'LIMIT_FILE_SIZE') { status = 400; message = 'File is too large'; }
  else if (err.name === 'MulterError') status = 400;
  if (status >= 500) { console.error(err); message = 'Internal server error'; }
  res.status(status).json({ message, details: err.details });
}

module.exports = { notFound, errorHandler };
