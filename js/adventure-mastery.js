
/* ============================================
   AURA EDU V2.2
   STAGE 27.3J

   ADVENTURE MASTERY PANEL
   + PERSONALIZED LEARNING GUIDANCE

   - Display real G1/G2/G3 evidence
   - Respect active learner identity
   - Explain Spelling eligibility
   - Provide evidence-based next steps
   - Preserve existing adventure map
   - Never modify learning records

   Depends on:
   js/grammar-unlock.js
============================================ */

(function () {
  "use strict";

  const PANEL_ID = "aura-mastery-panel";
  const STYLE_ID = "aura-mastery-styles";

  const MODULE_NAMES = {
    G1: "Verb to Be",
    G2: "Subject–Verb Agreement",
    G3: "Sentence Construction"
  };

  function getEngine() {
    return window.AuraGrammarUnlock || null;
  }

  function getReport() {
    const engine = getEngine();

    if (
      !engine ||
      typeof engine.evaluateGrammar !== "function"
    ) {
      return null;
    }

    try {
      return engine.evaluateGrammar();
    } catch (error) {
      console.error(
        "[AURA Mastery] Evaluation failed:",
        error
      );
      return null;
    }
  }

  function createStyles() {
    if (document.getElementById(STYLE_ID)) {
      return;
    }

    const style = document.createElement("style");
    style.id = STYLE_ID;

    style.textContent = `
      #${PANEL_ID} {
        max-width: 1050px;
        margin: 22px auto;
        padding: 22px;
        border: 2px solid #cde9df;
        border-radius: 22px;
        background: linear-gradient(
          135deg, #ffffff, #effbf5
        );
        color: #24445a;
        font-family: Arial, "PingFang SC",
          "Microsoft YaHei", sans-serif;
        box-shadow:
          0 8px 28px rgba(28,85,68,.08);
      }

      #${PANEL_ID} * {
        box-sizing: border-box;
      }

      #${PANEL_ID} .am-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        flex-wrap: wrap;
        gap: 14px;
        margin-bottom: 18px;
      }

      #${PANEL_ID} h2 {
        margin: 0 0 7px;
        font-size: 24px;
        color: #17365d;
      }

      #${PANEL_ID} p {
        margin: 6px 0;
        line-height: 1.6;
      }

      #${PANEL_ID} .am-subtitle {
        font-size: 14px;
        color: #607486;
      }

      #${PANEL_ID} .am-grid {
        display: grid;
        grid-template-columns:
          repeat(3, minmax(0,1fr));
        gap: 12px;
      }

      #${PANEL_ID} .am-card {
        padding: 16px;
        background: white;
        border: 1px solid #dcebe5;
        border-radius: 15px;
      }

      #${PANEL_ID} .am-card h3 {
        margin: 0 0 8px;
        font-size: 17px;
        color: #17365d;
      }

      #${PANEL_ID} .am-status {
        font-weight: bold;
        margin: 9px 0;
        font-size: 14px;
      }

      #${PANEL_ID} .am-success {
        color: #18704c;
      }

      #${PANEL_ID} .am-pending {
        color: #a46b24;
      }

      #${PANEL_ID} .am-error {
        color: #a63c3c;
      }

      #${PANEL_ID} .am-metric {
        font-size: 13px;
        color: #52667a;
      }

      #${PANEL_ID} .am-footer {
        margin-top: 18px;
        padding: 16px;
        background: #e9f4f0;
        border-radius: 13px;
      }

      #${PANEL_ID} .am-button {
        padding: 10px 16px;
        border: 0;
        border-radius: 11px;
        background: #218b83;
        color: white;
        cursor: pointer;
        font-size: 14px;
        font-weight: bold;
      }

      #${PANEL_ID} .am-button:hover {
        background: #176e68;
      }

      #${PANEL_ID} .am-note {
        margin-top: 12px;
        font-size: 12px;
        color: #667b89;
      }

      #${PANEL_ID} .am-guidance {
        margin-top: 18px;
        padding: 18px;
        border: 1px solid #c8dff2;
        border-radius: 15px;
        background: #f3f9ff;
      }

      #${PANEL_ID} .am-guidance h3 {
        margin: 0 0 8px;
        font-size: 19px;
        color: #17365d;
      }

      #${PANEL_ID} .am-guidance-item {
        padding: 12px 0;
        border-top: 1px solid #d9e7f2;
      }

      #${PANEL_ID} .am-guidance-item h4 {
        margin: 0 0 6px;
        font-size: 15px;
        color: #214c72;
      }

      #${PANEL_ID} .am-guidance-item p {
        margin: 5px 0;
        font-size: 14px;
      }

      #${PANEL_ID} .am-guidance-small {
        font-size: 12px;
        color: #607486;
      }

      @media (max-width: 700px) {
        #${PANEL_ID} {
          margin: 14px 10px;
          padding: 16px;
        }

        #${PANEL_ID} .am-grid {
          grid-template-columns: 1fr;
        }
      }
    `;

    document.head.appendChild(style);
  }

  function element(tag, className, text) {
    const node = document.createElement(tag);

    if (className) {
      node.className = className;
    }

    if (text !== undefined) {
      node.textContent = String(text);
    }

    return node;
  }

  function getStatusInfo(data) {
    if (!data) {
      return {
        label: "暂无数据",
        className: "am-pending"
      };
    }

    if (data.provisionalMastery === true) {
      return {
        label: "✓ 暂定掌握",
        className: "am-success"
      };
    }

    switch (data.status) {
      case "NO_RECORD":
        return {
          label: "尚无学习记录",
          className: "am-pending"
        };

      case "NO_COMPLETED_SESSION":
        return {
          label: "尚未完成学习",
          className: "am-pending"
        };

      case "INVALID_EVIDENCE":
        return {
          label: "记录需要核验",
          className: "am-error"
        };

      case "STORAGE_ERROR":
        return {
          label: "记录读取失败",
          className: "am-error"
        };

      default:
        return {
          label: "继续学习",
          className: "am-pending"
        };
    }
  }

  function createModuleCard(id, data) {
    const card = element("div", "am-card");

    const title = element(
      "h3",
      "",
      id + " · " + MODULE_NAMES[id]
    );

    const info = getStatusInfo(data);

    const status = element(
      "div",
      "am-status " + info.className,
      info.label
    );

    const diagnostic =
      data &&
      Number.isFinite(data.diagnosticPercent)
        ? data.diagnosticPercent + "%"
        : "—";

    const reassessment =
      data &&
      Number.isFinite(data.reassessmentPercent)
        ? data.reassessmentPercent + "%"
        : "—";

    const sessions =
      data &&
      Number.isInteger(data.sessionCount)
        ? data.sessionCount
        : 0;

    card.appendChild(title);
    card.appendChild(status);

    card.appendChild(
      element(
        "p",
        "am-metric",
        "Diagnostic: " + diagnostic
      )
    );

    card.appendChild(
      element(
        "p",
        "am-metric",
        "Independent Reassessment: " +
          reassessment
      )
    );

    card.appendChild(
      element(
        "p",
        "am-metric",
        "Learning Sessions: " + sessions
      )
    );

    return card;
  }

  // =========================================
  // PERSONALIZED LEARNING GUIDANCE
  // =========================================

  function createGuidanceItem(id, data) {
    const item = element(
      "div",
      "am-guidance-item"
    );

    item.appendChild(
      element(
        "h4",
        "",
        id + " · " + MODULE_NAMES[id]
      )
    );

    if (
      !data ||
      data.status === "NO_RECORD" ||
      data.status === "NO_COMPLETED_SESSION"
    ) {
      item.appendChild(
        element(
          "p",
          "",
          "还没有完整的学习证据。先完成诊断、练习和独立复测。"
        )
      );
      return item;
    }

    if (
      data.status === "INVALID_EVIDENCE" ||
      data.status === "STORAGE_ERROR"
    ) {
      item.appendChild(
        element(
          "p",
          "am-error",
          "学习记录暂时无法核验。请联系教师检查记录，不要为了修复而删除历史数据。"
        )
      );
      return item;
    }

    if (data.provisionalMastery === true) {
      item.appendChild(
        element(
          "p",
          "am-success",
          "你已经满足这个模块的暂定掌握条件！可以继续巩固，也可以探索其他模块。"
        )
      );
      return item;
    }

    const conditions = data.conditions;

    if (
      !conditions ||
      typeof conditions !== "object"
    ) {
      item.appendChild(
        element(
          "p",
          "",
          "当前还需要继续学习。请进入这个模块查看反馈并尝试独立练习。"
        )
      );
      return item;
    }

    const diagnostic =
      Number.isFinite(data.diagnosticPercent)
        ? data.diagnosticPercent
        : null;

    const reassessment =
      Number.isFinite(data.reassessmentPercent)
        ? data.reassessmentPercent
        : null;

    if (
      reassessment !== null &&
      reassessment >= 75
    ) {
      item.appendChild(
        element(
          "p",
          "am-success",
          "做得不错！最近一次独立复测达到 " +
            reassessment + "% 。"
        )
      );
    }

    if (conditions.diagnostic === false) {
      item.appendChild(
        element(
          "p",
          "",
          "最近一次诊断成绩" +
          (
            diagnostic === null
              ? ""
              : "为 " + diagnostic + "%"
          ) +
          "，尚未达到当前规则的 75% 门槛。建议先复习基础知识，再进行新一轮学习。"
        )
      );
    }

    if (conditions.reassessment === false) {
      item.appendChild(
        element(
          "p",
          "",
          "最近一次独立复测尚未达到 75%。请先根据反馈练习，再独立完成复测。"
        )
      );
    }

    if (
      conditions.lowHint === false ||
      conditions.noHighSupport === false
    ) {
      const level =
        Number.isInteger(data.highestHintLevel)
          ? "（最高使用 H" +
              data.highestHintLevel + "）"
          : "";

      item.appendChild(
        element(
          "p",
          "",
          "最近一次练习使用的帮助超过当前暂定掌握规则允许的范围" +
            level +
            "。下一次可以尝试自己完成，或最多使用 Hint 1。"
        )
      );
    }

    const unmet =
      Object.values(conditions).some(
        value => value === false
      );

    if (!unmet) {
      item.appendChild(
        element(
          "p",
          "",
          "本次成绩与提示条件已达到门槛，但原教学模块尚未判定为 Provisional Mastery。请查看该模块的学习反馈；本面板不会覆盖原判定。"
        )
      );
    }

    item.appendChild(
      element(
        "p",
        "am-guidance-small",
        "以上建议依据最近一次完成且通过核验的学习会话，不代表长期掌握度。"
      )
    );

    return item;
  }

  function createGuidance(report) {
    const section = element(
      "section",
      "am-guidance"
    );

    section.appendChild(
      element(
        "h3",
        "",
        "✨ Your Next Learning Step · 下一步学习建议"
      )
    );

    section.appendChild(
      element(
        "p",
        "am-subtitle",
        "根据当前学生最近一次完成的学习会话生成，不会改变成绩或解锁规则。"
      )
    );

    let needsGuidance = false;

    for (const id of ["G1", "G2", "G3"]) {
      const data =
        report.modules &&
        report.modules[id];

      if (
        !data ||
        data.provisionalMastery !== true
      ) {
        needsGuidance = true;

        section.appendChild(
          createGuidanceItem(id, data)
        );
      }
    }

    if (!needsGuidance) {
      section.appendChild(
        element(
          "p",
          "am-success",
          "G1、G2、G3 都已达到当前规则的暂定掌握条件。可以继续复习，并查看 Spelling 关卡的开放状态。"
        )
      );
    }

    return section;
  }

  // =========================================
  // PANEL CREATION
  // =========================================

  function createPanel() {
    let panel = document.getElementById(
      PANEL_ID
    );

    if (!panel) {
      panel = document.createElement("section");
      panel.id = PANEL_ID;

      const main = document.querySelector("main");

      if (main) {
        main.appendChild(panel);
      } else {
        document.body.appendChild(panel);
      }
    }

    return panel;
  }

  function render() {
    createStyles();

    const panel = createPanel();
    const report = getReport();

    panel.replaceChildren();

    const header = element(
      "div",
      "am-header"
    );

    const heading = element("div");

    heading.appendChild(
      element(
        "h2",
        "",
        "📚 Grammar Mastery Journey"
      )
    );

    heading.appendChild(
      element(
        "p",
        "am-subtitle",
        "语法学习进度 · 真实学习证据"
      )
    );

    const refresh = element(
      "button",
      "am-button",
      "↻ Refresh Evidence"
    );

    refresh.type = "button";
    refresh.addEventListener(
      "click",
      render
    );

    header.appendChild(heading);
    header.appendChild(refresh);

    panel.appendChild(header);

    if (!report) {
      panel.appendChild(
        element(
          "p",
          "am-error",
          "Grammar Unlock Engine 尚未加载。"
        )
      );
      return;
    }

    if (!report.learnerId) {
      panel.appendChild(
        element(
          "p",
          "am-error",
          "请先在 Learner Manager 选择学生。"
        )
      );
      return;
    }

    panel.appendChild(
      element(
        "p",
        "am-subtitle",
        "当前学习者 ID：" + report.learnerId
      )
    );

    const grid = element(
      "div",
      "am-grid"
    );

    for (const id of ["G1", "G2", "G3"]) {
      grid.appendChild(
        createModuleCard(
          id,
          report.modules[id]
        )
      );
    }

    panel.appendChild(grid);

    // Personalized learning guidance
    panel.appendChild(
      createGuidance(report)
    );

    const footer = element(
      "div",
      "am-footer"
    );

    if (report.spellingEligible) {
      footer.appendChild(
        element(
          "p",
          "am-success",
          "✓ Grammar 暂定掌握条件已满足"
        )
      );

      footer.appendChild(
        element(
          "p",
          "",
          "该学生已具备进入 Spelling 正式挑战的资格。"
        )
      );
    } else {
      footer.appendChild(
        element(
          "p",
          "am-pending",
          "🔒 Spelling 正式挑战尚未开放"
        )
      );

      footer.appendChild(
        element(
          "p",
          "",
          "请查看上方的个性化建议，了解哪些模块仍需练习。"
        )
      );
    }

    footer.appendChild(
      element(
        "p",
        "",
        "Speaking：等待 Spelling 独立评估。"
      )
    );

    panel.appendChild(footer);

    panel.appendChild(
      element(
        "p",
        "am-note",
        "Research prototype: Provisional Mastery " +
        "is based on predefined rules and " +
        "does not establish durable mastery."
      )
    );

    console.info(
      "[AURA Mastery] Panel updated",
      report
    );
  }

  function init() {
    if (!document.body) {
      document.addEventListener(
        "DOMContentLoaded",
        render,
        { once: true }
      );
      return;
    }

    render();
  }

  window.AuraAdventureMastery =
    Object.freeze({
      render,
      refresh: render,
      getReport
    });

  init();

})();
