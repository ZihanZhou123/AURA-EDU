
/* ============================================
   AURA EDU — JSON EXPORT SERVICE
   STEP 19.2 / VERSION 1.0

   Purpose:
   - Export valid JSON files
   - Support Safari / Chrome / Edge
   - Export G1 / G2 / G3 learning records
   - Export learner profiles
   - Preserve existing localStorage data
   - Provide export diagnostics

   This service does not modify learning records.
============================================ */

(function () {
  "use strict";

  const VERSION = "1.0";

  const STORAGE_KEYS = {
    G1: "aura_g1_learning_records_v1",
    G2: "aura_g2_learning_records_v1",
    G3: "aura_g3_learning_records_v1",
    PROFILES: "aura_learner_profiles_v2"
  };

  function makeFilename(name) {
    const safe = String(name || "aura-export")
      .replace(/\.json$/i, "")
      .replace(/[^a-zA-Z0-9_-]/g, "-");

    return safe + ".json";
  }

  function readStorage(key) {
    try {
      const raw = localStorage.getItem(key);

      if (raw === null) {
        return {
          ok: true,
          data: [],
          empty: true
        };
      }

      return {
        ok: true,
        data: JSON.parse(raw),
        empty: false
      };

    } catch (error) {
      return {
        ok: false,
        error: "INVALID_JSON",
        message: error.message
      };
    }
  }

  function downloadJSON(data, filename) {
    let url = null;
    let anchor = null;

    try {
      const json = JSON.stringify(data, null, 2);

      if (json === undefined) {
        throw new Error(
          "Data cannot be converted to JSON."
        );
      }

      const blob = new Blob(
        [json],
        {
          type: "application/json;charset=utf-8"
        }
      );

      url = URL.createObjectURL(blob);

      anchor = document.createElement("a");

      anchor.href = url;
      anchor.download = makeFilename(filename);
      anchor.style.display = "none";

      document.body.appendChild(anchor);

      anchor.click();

      // Keep the Blob URL alive briefly for Safari.
      setTimeout(function () {
        if (anchor && anchor.parentNode) {
          anchor.parentNode.removeChild(anchor);
        }

        if (url) {
          URL.revokeObjectURL(url);
        }
      }, 60000);

      console.info(
        "[AURA Export] Download requested:",
        anchor.download
      );

      return {
        ok: true,
        filename: anchor.download,
        bytes: blob.size,
        message: "已向浏览器发送 JSON 下载请求。"
      };

    } catch (error) {
      if (anchor && anchor.parentNode) {
        anchor.parentNode.removeChild(anchor);
      }

      if (url) {
        URL.revokeObjectURL(url);
      }

      console.error(
        "[AURA Export] Failed:",
        error
      );

      return {
        ok: false,
        error: "EXPORT_FAILED",
        message: error.message
      };
    }
  }

  function exportStorage(key, filename) {
    const result = readStorage(key);

    if (!result.ok) {
      return result;
    }

    return downloadJSON(
      result.data,
      filename
    );
  }

  function exportModule(moduleId) {
    const id = String(moduleId).toUpperCase();

    if (!["G1", "G2", "G3"].includes(id)) {
      return {
        ok: false,
        error: "INVALID_MODULE",
        message: "Unsupported grammar module."
      };
    }

    return exportStorage(
      STORAGE_KEYS[id],
      "aura-" + id.toLowerCase() + "-records.json"
    );
  }

  function exportProfiles() {
    return exportStorage(
      STORAGE_KEYS.PROFILES,
      "aura-learner-profiles.json"
    );
  }

  function exportAll() {
    const result = {};

    for (const moduleId of ["G1", "G2", "G3"]) {
      const storage = readStorage(
        STORAGE_KEYS[moduleId]
      );

      if (!storage.ok) {
        return {
          ok: false,
          error: "INVALID_MODULE_DATA",
          module: moduleId,
          message: storage.message
        };
      }

      result[moduleId] = storage.data;
    }

    const profiles = readStorage(
      STORAGE_KEYS.PROFILES
    );

    if (!profiles.ok) {
      return profiles;
    }

    result.profiles = profiles.data;

    result.exportMetadata = {
      system: "AURA EDU",
      version: VERSION,
      exportedAt: new Date().toISOString(),
      source: "localStorage",
      authenticated: false
    };

    return downloadJSON(
      result,
      "aura-all-learning-data.json"
    );
  }

  function diagnostic() {
    const report = {
      version: VERSION,
      browser: navigator.userAgent,
      blobSupported:
        typeof Blob !== "undefined",
      objectURLSupported:
        typeof URL.createObjectURL === "function",
      downloadAttributeSupported:
        "download" in document.createElement("a"),
      storage: {}
    };

    Object.keys(STORAGE_KEYS).forEach(function (key) {
      const storageKey = STORAGE_KEYS[key];

      const result = readStorage(storageKey);

      report.storage[key] = {
        valid: result.ok,
        empty: result.empty === true,
        count: result.ok &&
          Array.isArray(result.data)
          ? result.data.length
          : null
      };
    });

    console.table(report.storage);
    console.info("[AURA Export] Diagnostic:", report);

    return report;
  }

  window.AuraJSONExport = Object.freeze({
    version: VERSION,
    downloadJSON,
    exportStorage,
    exportModule,
    exportProfiles,
    exportAll,
    diagnostic
  });

  console.info(
    "[AURA EDU] JSON Export Service ready."
  );

})();
