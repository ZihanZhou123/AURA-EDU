
// ==========================================
// AURA EDU V2.2
// CURRICULUM LEARNING MODULE
// ==========================================

// Original demonstration themes.
// These are not verified FLTRP textbook units.

const themes = {
  3: [
    "Greetings & Introductions",
    "Friends & Feelings",
    "Colours & Objects"
  ],

  4: [
    "My Family",
    "Daily Routines",
    "Food & Preferences"
  ],

  5: [
    "Hobbies & Free Time",
    "My School",
    "Places Around Me"
  ],

  6: [
    "Daily Life",
    "Travel & Directions",
    "Plans & Experiences"
  ],

  7: [
    "School Life & Identity",
    "Interests & Friendships",
    "Describing People"
  ],

  8: [
    "Communication & Culture",
    "Healthy Living",
    "Experiences & Opinions"
  ],

  9: [
    "Goals & Future Plans",
    "Community & Society",
    "Ideas & Arguments"
  ]
};


// ==========================================
// LEARNING DOMAINS
// ==========================================

const domains = [
  [
    "Listening",
    "Understand questions and short spoken exchanges."
  ],

  [
    "Speaking",
    "Communicate meaning in age-appropriate interactions."
  ],

  [
    "Reading",
    "Identify and interpret information in texts."
  ],

  [
    "Writing",
    "Compose and revise sentences and short texts."
  ],

  [
    "Language Knowledge",
    "Use vocabulary, structures and discourse appropriately."
  ],

  [
    "Learning Strategies",
    "Ask for help, monitor progress and transfer learning."
  ]
];


// ==========================================
// CURRENT UNIT
// ==========================================

let selectedUnit = 0;


// ==========================================
// DISPLAY CURRICULUM
// ==========================================

function renderUnits() {

  const grade = Number(
    $("curriculum-grade").value
  );

  const gradeThemes = themes[grade] || themes[3];

  $("unit-list").innerHTML = gradeThemes.map(
    (title, index) => {

      const active =
        selectedUnit === index ? "active" : "";

      return `
        <div class="unit ${active}">

          <span class="pill">
            DEMO UNIT ${index + 1}
          </span>

          <h3 class="section">
            ${escapeHTML(title)}
          </h3>

          <p class="small">
            Original illustrative tasks · Grade ${grade}
          </p>

          <button
            class="btn secondary"
            data-unit="${index}"
          >
            Explore unit
          </button>

        </div>
      `;
    }
  ).join("");


  // Unit selection

  $("unit-list")
    .querySelectorAll("[data-unit]")
    .forEach(button => {

      button.onclick = () => {

        selectedUnit = Number(
          button.dataset.unit
        );

        renderUnits();

        if (typeof resetQuiz === "function") {
          resetQuiz();
        }

        navigate("learn");
      };

    });


  // Learning domains

  $("domain-list").innerHTML = domains.map(
    ([name, description]) => {

      return `
        <div class="domain">

          <strong>
            ${escapeHTML(name)}
          </strong>

          <span class="small muted">
            ${escapeHTML(description)}
          </span>

        </div>
      `;
    }
  ).join("");

  updateUnitLabel();
}


// ==========================================
// GRADE SELECTION
// ==========================================

$("curriculum-grade").onchange = () => {

  selectedUnit = 0;

  renderUnits();

  if (typeof resetQuiz === "function") {
    resetQuiz();
  }
};


// ==========================================
// UPDATE CURRENT UNIT LABEL
// ==========================================

function updateUnitLabel() {

  const grade = Number(
    $("curriculum-grade").value
  );

  const gradeThemes = themes[grade] || themes[3];

  const title =
    gradeThemes[selectedUnit] || gradeThemes[0];

  $("learning-unit-name").textContent =
    `Grade ${grade} · ${title} (demonstration theme)`;
}
