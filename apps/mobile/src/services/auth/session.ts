let sessionToken: string | null = null;

export function getSessionToken() {
  return sessionToken;
}

export function setSessionToken(token: string | null) {
  sessionToken = token;
}

export function clearSessionToken() {
  sessionToken = null;
}
