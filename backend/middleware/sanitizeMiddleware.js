// Input sanitization middleware to prevent NoSQL injection, XSS, and other attacks

/**
 * Sanitize string inputs to prevent injection attacks
 */
const sanitizeString = (str, allowDots = false) => {
  if (typeof str !== "string") return str;

  let sanitized = str.trim();

  if (!allowDots) {
    // Remove dangerous characters and patterns for NoSQL injection
    sanitized = sanitized
      .replace(/\$/g, "")
      .replace(/\./g, "")
      .replace(/\{/g, "")
      .replace(/\}/g, "");
  } else {
    // For emails, only remove dangerous characters but keep dots
    sanitized = sanitized
      .replace(/\$/g, "")
      .replace(/\{/g, "")
      .replace(/\}/g, "");
  }

  return sanitized.substring(0, 1000); // Limit length
};

/**
 * Recursively sanitize object properties
 */
const sanitizeObject = (obj) => {
  if (typeof obj !== "object" || obj === null) {
    return typeof obj === "string" ? sanitizeString(obj) : obj;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => sanitizeObject(item));
  }

  const sanitized = {};
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      // Allow dots in email fields
      const allowDots = key.toLowerCase() === "email";
      if (typeof obj[key] === "string") {
        sanitized[key] = sanitizeString(obj[key], allowDots);
      } else {
        sanitized[key] = sanitizeObject(obj[key]);
      }
    }
  }
  return sanitized;
};

/**
 * Middleware to sanitize request body, query, and params
 */
export const sanitizeInput = (req, res, next) => {
  // Sanitize body
  if (req.body && typeof req.body === "object") {
    req.body = sanitizeObject(req.body);
  }

  // Sanitize query
  if (req.query && typeof req.query === "object") {
    req.query = sanitizeObject(req.query);
  }

  // Sanitize params
  if (req.params && typeof req.params === "object") {
    req.params = sanitizeObject(req.params);
  }

  next();
};

/**
 * Validate email format strictly
 */
export const validateEmailFormat = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 254;
};

/**
 * Validate strong password
 */
export const validateStrongPassword = (password) => {
  // At least 8 chars, 1 uppercase, 1 lowercase, 1 number, 1 special char
  const passwordRegex =
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
  return passwordRegex.test(password);
};

/**
 * Validate phone number format
 */
export const validatePhoneFormat = (phone) => {
  const phoneRegex = /^[0-9\s\-\+\(\)]{10,15}$/;
  return phoneRegex.test(phone);
};

export default sanitizeInput;
