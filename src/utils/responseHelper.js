// Standard API response format
const sendResponse = (
  res,
  statusCode,
  success,
  message,
  data = null,
  pagination = null
) => {
  const response = {
    success,
    message,
  };

  if (data !== null) {
    response.data = data;
  }

  if (pagination !== null) {
    response.pagination = pagination;
  }

  return res.status(statusCode).json(response);
};

// Success responses
const sendSuccess = (res, message, data = null, statusCode = 200) => {
  return sendResponse(res, statusCode, true, message, data);
};

const sendCreated = (res, message, data = null) => {
  return sendResponse(res, 201, true, message, data);
};

// Error responses
const sendError = (res, message, statusCode = 400) => {
  return sendResponse(res, statusCode, false, message);
};

const sendNotFound = (res, message = "Resource not found") => {
  return sendResponse(res, 404, false, message);
};

const sendUnauthorized = (res, message = "Unauthorized") => {
  return sendResponse(res, 401, false, message);
};

const sendForbidden = (res, message = "Forbidden") => {
  return sendResponse(res, 403, false, message);
};

const sendServerError = (res, message = "Internal server error") => {
  return sendResponse(res, 500, false, message);
};

// Paginated response
const sendPaginated = (res, message, data, pagination, statusCode = 200) => {
  return sendResponse(res, statusCode, true, message, data, pagination);
};

module.exports = {
  sendResponse,
  sendSuccess,
  sendCreated,
  sendError,
  sendNotFound,
  sendUnauthorized,
  sendForbidden,
  sendServerError,
  sendPaginated,
};
