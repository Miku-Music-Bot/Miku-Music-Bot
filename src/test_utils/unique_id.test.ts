import crypto from 'crypto';

/**
 * uniqueID() - Returns a unique string each time
 */
export default function uniqueID() {
  const id = crypto.randomUUID();
  return `Test-File-${id}`;
}
