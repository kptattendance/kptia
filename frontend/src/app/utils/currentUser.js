// =====================================================
// CURRENT USER, FETCHED ONCE
//
// The layouts, the sign-in guard and several pages all
// need /api/users/me. The answer is kept for a minute
// per signed-in account, so moving between pages does
// not ask the server again each time.
// =====================================================

import axios from "axios";

const CACHE_MS = 60 * 1000;

// account id -> { promise, at }
const cache = new Map();

// The account id (Clerk "sub") inside the sign-in token.
const accountOf = (token) => {
  try {
    const payload = token.split(".")[1]
      .replace(/-/g, "+")
      .replace(/_/g, "/");

    return JSON.parse(atob(payload)).sub || token;
  } catch {
    return token;
  }
};

// Same shape as axios.get(...): use response.data.data
export const fetchCurrentUser = (token) => {
  const account = accountOf(token);
  const cached = cache.get(account);

  if (cached && Date.now() - cached.at < CACHE_MS) {
    return cached.promise;
  }

  const promise = axios
    .get(`${process.env.NEXT_PUBLIC_API_URL}/api/users/me`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
    .catch((error) => {
      // A failed answer is not kept.
      cache.delete(account);
      throw error;
    });

  cache.set(account, { promise, at: Date.now() });

  return promise;
};
