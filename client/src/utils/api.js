// Single entry point for every /api/ call: injects the session token the server
// now requires, and treats a 401 as "this token is dead" -> drop it and bounce
// the user back to the login screen (main.jsx renders <AuthPage/> when there is
// no auth_token in localStorage).
//
// Same signature as fetch(), so call sites only change name.

let redirecting = false;

export function apiFetch(url, options = {}) {
  const token = localStorage.getItem('auth_token');
  const headers = new Headers(options.headers || {});
  if (token) headers.set('Authorization', `Bearer ${token}`);

  return fetch(url, { ...options, headers }).then((res) => {
    if (res.status === 401 && !redirecting) {
      redirecting = true;
      localStorage.removeItem('auth_token');
      window.location.assign('/');
    }
    return res;
  });
}

export default apiFetch;
