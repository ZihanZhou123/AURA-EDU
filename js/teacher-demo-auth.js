
/* =========================================
   AURA EDU V2.2
   STAGE 25.2.1 — TEACHER DEMO AUTH

   DEMONSTRATION ONLY
   NOT real authentication or authorization.
   Never use with identifiable student data.
========================================= */

(function () {
  "use strict";

  const KEY = "aura_teacher_demo_session_v1";

  // Public demonstration credentials only.
  // These are NOT secrets.
  const DEMO_ID = "AURA-DEMO";
  const DEMO_PASSWORD = "Demo2026";

  function login(id, password) {
    const valid =
      String(id).trim() === DEMO_ID &&
      String(password) === DEMO_PASSWORD;

    if (!valid) {
      return {
        ok: false,
        message: "Incorrect demo ID or password."
      };
    }

    try {
      sessionStorage.setItem(
        KEY,
        JSON.stringify({
          mode: "TEACHER_DEMO",
          signedInAt: new Date().toISOString()
        })
      );

      return {
        ok: true,
        message: "Demo login successful."
      };
    } catch (error) {
      return {
        ok: false,
        message: "Browser session storage unavailable."
      };
    }
  }

  function isLoggedIn() {
    try {
      const raw = sessionStorage.getItem(KEY);
      if (!raw) return false;

      const session = JSON.parse(raw);

      return Boolean(
        session &&
        session.mode === "TEACHER_DEMO"
      );
    } catch (error) {
      return false;
    }
  }

  function logout() {
    try {
      sessionStorage.removeItem(KEY);
    } catch (error) {
      console.warn(
        "[AURA Teacher Demo] Logout storage error",
        error
      );
    }
  }

  window.AuraTeacherDemoAuth = Object.freeze({
    login: login,
    logout: logout,
    isLoggedIn: isLoggedIn
  });
})();
