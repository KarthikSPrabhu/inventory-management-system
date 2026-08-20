const AuditLog = require('../models/AuditLog');
const AUDIT_ACTIONS = require('../utils/auditActions');

// Keys that must NEVER be saved into audit state snapshots
const SENSITIVE_KEYS = new Set([
  'password',
  'passwordhash',
  'token',
  'jwt',
  'secret',
  'currentpassword',
  'newpassword',
  'confirmPassword',
  'authorization'
]);

/**
 * Recursively strips sensitive fields from state snapshots
 */
const sanitizeState = (obj) => {
  if (obj === null || obj === undefined) return null;
  if (typeof obj !== 'object') return obj;

  if (Array.isArray(obj)) {
    return obj.map(sanitizeState);
  }

  const cleanObj = {};
  for (const [key, val] of Object.entries(obj)) {
    if (SENSITIVE_KEYS.has(key.toLowerCase())) {
      cleanObj[key] = '[REDACTED]';
    } else if (typeof val === 'object' && val !== null) {
      cleanObj[key] = sanitizeState(val);
    } else {
      cleanObj[key] = val;
    }
  }
  return cleanObj;
};

/**
 * Log an audit event to MongoDB Atlas
 */
const log = async ({
  req = null,
  user = null,
  action,
  resourceType,
  resourceId = null,
  resourceName = 'N/A',
  description,
  previousState = null,
  newState = null,
  metadata = {}
}) => {
  try {
    const activeUser = user || (req ? req.user : null);

    const userId = activeUser ? (activeUser._id || activeUser.id) : null;
    const userName = activeUser ? activeUser.name : 'System / Guest';
    const userEmail = activeUser ? activeUser.email : 'system@inventory.local';

    let ipAddress = '';
    let userAgent = '';

    if (req) {
      ipAddress = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || req.ip || '';
      userAgent = req.headers['user-agent'] || '';
    }

    const sanitizedPrev = sanitizeState(previousState);
    const sanitizedNew = sanitizeState(newState);
    const sanitizedMeta = sanitizeState(metadata);

    const auditEntry = new AuditLog({
      user: userId,
      userName,
      userEmail,
      action,
      resourceType,
      resourceId,
      resourceName,
      description,
      previousState: sanitizedPrev,
      newState: sanitizedNew,
      metadata: sanitizedMeta || {},
      ipAddress,
      userAgent
    });

    await auditEntry.save();
    return auditEntry;
  } catch (error) {
    console.error('Audit Logging Failed (Non-blocking):', error.message);
    return null;
  }
};

module.exports = {
  log,
  sanitizeState,
  AUDIT_ACTIONS
};
