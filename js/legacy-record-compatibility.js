
/* ============================================
   AURA EDU
   STEP 19.7 — LEGACY RECORD COMPATIBILITY
   VERSION 1.0

   Research-oriented read-only compatibility.

   IMPORTANT:
   - Never modify original learning records
   - Never assign unknown learners automatically
   - Never fabricate identity bindings
   - Preserve G1 / G2 / G3 data
   - Support Learning Analytics

   This is NOT authentication.
============================================ */

(function () {
  "use strict";

  const VERSION = "1.0";

  const PROFILE_KEY = "aura_learner_profiles_v2";

  const MODULE_KEYS = Object.freeze({
    G1: "aura_g1_learning_records_v1",
    G2: "aura_g2_learning_records_v1",
    G3: "aura_g3_learning_records_v1"
  });

  const REQUIRED_FIELDS = [
    "sessionId",
    "learnerId",
    "module",
    "startedAt",
    "completedAt"
  ];

  function readArray(key) {
    try {
      const raw = localStorage.getItem(key);

      if (raw === null) {
        return {
          ok: true,
          records: [],
          missingStore: true
        };
      }

      const parsed = JSON.parse(raw);

      if (!Array.isArray(parsed)) {
        return {
          ok: false,
          error: "INVALID_ARRAY",
          key: key
        };
      }

      return {
        ok: true,
        records: parsed,
        missingStore: false
      };

    } catch (error) {
      return {
        ok: false,
        error: "INVALID_JSON",
        key: key,
        message: error.message
      };
    }
  }

  function hasValue(value) {
    return (
      value !== undefined &&
      value !== null &&
      value !== ""
    );
  }

  function getProfiles() {
    return readArray(PROFILE_KEY);
  }

  function getModuleRecords(moduleId) {
    const key = MODULE_KEYS[moduleId];

    if (!key) {
      return {
        ok: false,
        error: "INVALID_MODULE"
      };
    }

    return readArray(key);
  }

  function classifyRecord(
    record,
    moduleId,
    index,
    learnerIds,
    seenSessions
  ) {
    const issues = [];

    if (
      !record ||
      typeof record !== "object" ||
      Array.isArray(record)
    ) {
      return {
        module: moduleId,
        index: index + 1,
        format: "INVALID",
        identityStatus: "UNRESOLVED",
        qualityStatus: "REVIEW",
        issues: ["INVALID_RECORD"]
      };
    }

    REQUIRED_FIELDS.forEach(function (field) {
      if (!hasValue(record[field])) {
        issues.push("MISSING_" + field.toUpperCase());
      }
    });

    const learnerId = record.learnerId;

    const learnerExists =
      hasValue(learnerId) &&
      learnerIds.has(learnerId);

    if (!learnerExists) {
      issues.push("UNRESOLVED_LEARNER");
    }

    if (record.module !== moduleId) {
      issues.push("MODULE_MISMATCH");
    }

    const sessionId = record.sessionId;

    if (hasValue(sessionId)) {
      if (seenSessions.has(sessionId)) {
        issues.push("DUPLICATE_SESSION");
      } else {
        seenSessions.add(sessionId);
      }
    }

    const binding = record.identityBinding;

    const hasBinding =
      binding &&
      typeof binding === "object" &&
      !Array.isArray(binding);

    if (!hasBinding) {
      issues.push("LEGACY_BINDING_MISSING");
    } else if (binding.authenticated !== false) {
      issues.push("INVALID_BINDING_FLAG");
    }

    const format = !hasBinding
      ? "LEGACY"
      : "CURRENT";

    const identityStatus =
      learnerExists && hasBinding &&
      binding.authenticated === false
        ? "LOCALLY_BOUND"
        : "UNRESOLVED";

    const qualityStatus =
      issues.length === 0
        ? "PASS"
        : "REVIEW";

    return {
      module: moduleId,
      index: index + 1,
      format: format,
      identityStatus: identityStatus,
      qualityStatus: qualityStatus,
      learnerExists: Boolean(learnerExists),
      hasSessionId: hasValue(sessionId),
      hasStartedAt: hasValue(record.startedAt),
      hasCompletedAt: hasValue(record.completedAt),
      hasIdentityBinding: Boolean(hasBinding),
      issues: issues
    };
  }

  function analyze() {
    const profilesResult = getProfiles();

    if (!profilesResult.ok) {
      return {
        ok: false,
        error: "PROFILE_STORE_ERROR",
        details: profilesResult
      };
    }

    const learnerIds = new Set(
      profilesResult.records
        .filter(function (profile) {
          return (
            profile &&
            typeof profile.id === "string" &&
            profile.id.length > 0
          );
        })
        .map(function (profile) {
          return profile.id;
        })
    );

    const seenSessions = new Set();

    const report = [];

    const counts = {
      G1: 0,
      G2: 0,
      G3: 0
    };

    for (const moduleId of ["G1", "G2", "G3"]) {
      const result = getModuleRecords(moduleId);

      if (!result.ok) {
        return {
          ok: false,
          error: "MODULE_STORE_ERROR",
          module: moduleId,
          details: result
        };
      }

      counts[moduleId] = result.records.length;

      result.records.forEach(function (record, index) {
        report.push(
          classifyRecord(
            record,
            moduleId,
            index,
            learnerIds,
            seenSessions
          )
        );
      });
    }

    const summary = {
      total: report.length,

      current: report.filter(
        r => r.format === "CURRENT"
      ).length,

      legacy: report.filter(
        r => r.format === "LEGACY"
      ).length,

      invalid: report.filter(
        r => r.format === "INVALID"
      ).length,

      passed: report.filter(
        r => r.qualityStatus === "PASS"
      ).length,

      review: report.filter(
        r => r.qualityStatus === "REVIEW"
      ).length,

      locallyBound: report.filter(
        r => r.identityStatus === "LOCALLY_BOUND"
      ).length,

      unresolved: report.filter(
        r => r.identityStatus === "UNRESOLVED"
      ).length
    };

    return {
      ok: true,
      version: VERSION,
      generatedAt: new Date().toISOString(),
      readOnly: true,
      counts: counts,
      profileCount: profilesResult.records.length,
      summary: summary,
      report: report
    };
  }

  function getResearchDataset() {
    const analysis = analyze();

    if (!analysis.ok) {
      return analysis;
    }

    const dataset = analysis.report.map(function (item) {
      return {
        module: item.module,
        recordIndex: item.index,
        recordFormat: item.format,
        identityStatus: item.identityStatus,
        qualityStatus: item.qualityStatus,
        issues: [...item.issues]
      };
    });

    return {
      ok: true,
      dataset: dataset,
      summary: analysis.summary,
      readOnly: true,
      note:
        "Quality metadata only. Original records unchanged."
    };
  }

  function diagnostic() {
    const result = analyze();

    if (!result.ok) {
      console.error(
        "[AURA Legacy] Diagnostic failed:",
        result
      );

      return result;
    }

    console.table(result.report);

    console.info(
      "[AURA Legacy] Summary:",
      result.summary
    );

    return result;
  }

  window.AuraLegacyCompatibility = Object.freeze({
    version: VERSION,
    analyze: analyze,
    diagnostic: diagnostic,
    getProfiles: getProfiles,
    getModuleRecords: getModuleRecords,
    getResearchDataset: getResearchDataset
  });

  console.info(
    "[AURA EDU] Legacy Compatibility Service ready."
  );

})();
