
/* ============================================
   AURA EDU V2.2
   STAGE 23.3.8
   ADVENTURE PROGRESSION RULES

   Read-only progression interface.

   - Uses real Grammar evidence
   - Separates learner progress
   - Preserves existing map controls
   - Does not modify learning records
   - Does not award fictional progress
============================================ */

(function () {
  "use strict";

  const PANEL_ID = "aura-progression";
  const STYLE_ID = "aura-progression-style";

  function getReport() {
    const engine = window.AuraGrammarUnlock;

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
        "[AURA Progression]",
        error
      );
      return null;
    }
  }

  function make(tag, text, className) {
    const node = document.createElement(tag);

    if (text !== undefined) {
      node.textContent = text;
    }

    if (className) {
      node.className = className;
    }

    return node;
  }

  function addStyles() {
    if (document.getElementById(STYLE_ID)) {
      return;
    }

    const style = document.createElement("style");
    style.id = STYLE_ID;

    style.textContent = `
      #${PANEL_ID} {
        max-width: 1050px;
        margin: 22px auto;
        padding: 24px;
        border-radius: 22px;
        background: #fffdf4;
        border: 2px solid #eadfae;
        box-shadow: 0 8px 24px
          rgba(67, 74, 37, .08);
        font-family: Arial,
          "PingFang SC",
          "Microsoft YaHei",
          sans-serif;
        color: #24445a;
      }

      #${PANEL_ID} * {
        box-sizing: border-box;
      }

      #${PANEL_ID} h2 {
        margin: 0 0 8px;
        color: #17365d;
        font-size: 24px;
      }

      #${PANEL_ID} p {
        line-height: 1.6;
      }

      #${PANEL_ID} .ap-grid {
        display: grid;
        grid-template-columns:
          repeat(3, minmax(0, 1fr));
        gap: 14px;
        margin-top: 20px;
      }

      #${PANEL_ID} .ap-level {
        padding: 20px;
        border-radius: 17px;
        background: white;
        border: 2px solid #e0e6df;
      }

      #${PANEL_ID} .ap-level h3 {
        margin: 8px 0;
        color: #17365d;
      }

      #${PANEL_ID} .ap-icon {
        font-size: 30px;
      }

      #${PANEL_ID} .ap-open {
        border-color: #80c6a2;
      }

      #${PANEL_ID} .ap-eligible {
        border-color: #d8b653;
      }

      #${PANEL_ID} .ap-locked {
        background: #f5f6f7;
      }

      #${PANEL_ID} .ap-status {
        font-weight: bold;
        font-size: 14px;
      }

      #${PANEL_ID} .ap-action {
        display: inline-block;
        margin-top: 12px;
        padding: 10px 15px;
        border-radius: 10px;
        background: #218b83;
        color: white;
        text-decoration: none;
        font-size: 14px;
        font-weight: bold;
      }

      #${PANEL_ID} .ap-note {
        margin-top: 18px;
        padding: 13px;
        border-radius: 10px;
        background: #f4f0de;
        font-size: 13px;
      }

      #${PANEL_ID} .ap-refresh {
        padding: 10px 15px;
        border: 0;
        border-radius: 10px;
        background: #17365d;
        color: white;
        cursor: pointer;
      }

      @media(max-width:700px) {
        #${PANEL_ID} {
          margin: 14px 10px;
          padding: 16px;
        }

        #${PANEL_ID} .ap-grid {
          grid-template-columns: 1fr;
        }
      }
    `;

    document.head.appendChild(style);
  }

  function createLevel(
    title,
    icon,
    status,
    description,
    className,
    link
  ) {
    const card = make(
      "article",
      undefined,
      "ap-level " + className
    );

    card.appendChild(
      make("div", icon, "ap-icon")
    );

    card.appendChild(
      make("h3", title)
    );

    card.appendChild(
      make("p", status, "ap-status")
    );

    card.appendChild(
      make("p", description)
    );

    if (link) {
      const action = make(
        "a",
        "进入 Grammar Hub →",
        "ap-action"
      );

      action.href = link;
      card.appendChild(action);
    }

    return card;
  }

  function render() {
    addStyles();

    const report = getReport();

    let panel = document.getElementById(
      PANEL_ID
    );

    if (!panel) {
      panel = make("section");
      panel.id = PANEL_ID;

      const main = document.querySelector(
        "main"
      );

      (main || document.body).appendChild(
        panel
      );
    }

    panel.replaceChildren();

    panel.appendChild(
      make(
        "h2",
        "🗺️ Adventure Progression"
      )
    );

    panel.appendChild(
      make(
        "p",
        "冒险关卡进度 · 根据真实学习记录计算"
      )
    );

    const refresh = make(
      "button",
      "↻ Refresh Progress",
      "ap-refresh"
    );

    refresh.type = "button";
    refresh.addEventListener(
      "click",
      render
    );

    panel.appendChild(refresh);

    if (!report || !report.learnerId) {
      panel.appendChild(
        make(
          "p",
          "请先选择学习者，或检查 Grammar Unlock Engine 是否加载。"
        )
      );
      return;
    }

    panel.appendChild(
      make(
        "p",
        "Learner ID: " + report.learnerId
      )
    );

    const grid = make(
      "div",
      undefined,
      "ap-grid"
    );

    grid.appendChild(
      createLevel(
        "Level 1 · Grammar",
        "📚",
        "✓ 可进入 / Available",
        "可以随时学习或复习 G1、G2、G3。",
        "ap-open",
        "grammar-hub.html"
      )
    );

    if (report.spellingEligible === true) {
      grid.appendChild(
        createLevel(
          "Level 2 · Spelling",
          "🔤",
          "★ 已满足 Grammar 前置条件",
          "可以准备参加 Spelling 挑战。正式入口将在 Spelling 模块接入后开放。",
          "ap-eligible",
          null
        )
      );
    } else {
      grid.appendChild(
        createLevel(
          "Level 2 · Spelling",
          "🔒",
          "尚未满足前置条件",
          "需要 G1、G2、G3 均达到暂定掌握状态。",
          "ap-locked",
          null
        )
      );
    }

    grid.appendChild(
      createLevel(
        "Level 3 · Speaking",
        "🎤",
        "🔒 正式挑战尚未开放",
        "等待 Spelling 独立评估及 Speaking 模块接入。",
        "ap-locked",
        null
      )
    );

    panel.appendChild(grid);

    panel.appendChild(
      make(
        "p",
        "研究说明：关卡资格依据预设规则判断，不代表长期掌握，也不是正式教学效果验证。",
        "ap-note"
      )
    );

    console.info(
      "[AURA Progression] Updated",
      {
        learnerId: report.learnerId,
        grammarComplete:
          report.grammarComplete,
        spellingEligible:
          report.spellingEligible,
        speakingEligible:
          report.speakingEligible
      }
    );
  }

  window.AuraAdventureProgression =
    Object.freeze({
      render,
      refresh: render,
      getReport
    });

  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      render,
      { once: true }
    );
  } else {
    render();
  }

})();
