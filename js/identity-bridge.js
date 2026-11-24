
/* ============================================
   AURA EDU V2.2
   LEARNER IDENTITY BRIDGE
   STAGE 21.4.4

   Purpose:
   - Check identity service availability
   - Read active learner
   - Expose safe identity status
   - Do not modify existing learning data

   This module does not migrate records.
============================================ */

(function () {
  "use strict";

  const SERVICE_NAME = "AuraLearnerIdentity";

  function getService() {
    const service = window[SERVICE_NAME];

    if (
      !service ||
      typeof service.getActiveLearner !== "function" ||
      typeof service.getProfiles !== "function"
    ) {
      return null;
    }

    return service;
  }

  function getStatus() {
    const service = getService();

    if (!service) {
      return {
        ready: false,
        reason: "IDENTITY_SERVICE_NOT_LOADED"
      };
    }

    const learner = service.getActiveLearner();

    return {
      ready: true,
      activeLearnerFound: Boolean(learner),
      activeLearnerId: learner?.id || null,
      activeLearnerNickname:
        learner?.nickname || null,
      totalLearners: service.getProfiles().length
    };
  }

  function verifyConnection() {
    const status = getStatus();

    if (!status.ready) {
      console.warn(
        "[AURA Identity Bridge] Service unavailable."
      );

      return status;
    }

    console.info(
      "[AURA Identity Bridge] Connected.",
      {
        activeLearnerFound:
          status.activeLearnerFound,
        activeLearnerNickname:
          status.activeLearnerNickname,
        totalLearners:
          status.totalLearners
      }
    );

    return status;
  }

  window.AuraIdentityBridge = Object.freeze({
    version: "1.0",
    getStatus,
    verifyConnection
  });

  console.info(
    "[AURA EDU] Identity Bridge ready."
  );

})();
