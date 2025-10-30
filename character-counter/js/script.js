const toggleBtn = document.getElementById("themeToggle");
const logo = document.getElementById("logo");
const root = document.documentElement;

if (toggleBtn) {
  toggleBtn.addEventListener("click", () => {
    const currentTheme = root.getAttribute("data-theme");
    if (currentTheme === "light") {
      root.setAttribute("data-theme", "dark-theme");
      if (logo) logo.src = "./assets/images/logo-dark-theme.svg";
      toggleBtn.src = "./assets/images/icon-sun.svg";
    } else {
      root.setAttribute("data-theme", "light");
      if (logo) logo.src = "./assets/images/logo-light-theme.svg";
      toggleBtn.src = "./assets/images/icon-moon.svg";
    }
  });
}

// add next to ensureLimitUI()
function hideLimitUI() {
  activeLimit = null; // stop enforcing
  if (limitWrap) {
    limitWrap.hidden = true; // or: limitWrap.remove();
  }
  if (limitRemain) limitRemain.textContent = "";
}

(() => {
  const els = {
    text: document.getElementById("text-input"),
    excludeSpaces: document.getElementById("exclude-spaces"),
    setLimit: document.getElementById("set-limit"),
    charCount: document.getElementById("char-count"),
    wordCount: document.getElementById("word-count"),
    sentenceCount: document.getElementById("sentence-count"),
    readingTime: document.getElementById("reading-time"),
    ldList: document.getElementById("letter-density-list"),
    ldToggle: document.getElementById("ld-toggle"),
  };
  if (!els.text) return;

  // Paragraph message shown when no characters are typed
  const noCharsMsg = document.querySelector(".letter-density p");

  let limitWrap = null,
    limitInput = null,
    limitRemain = null;
  let activeLimit = null;

  function ensureLimitUI() {
    if (limitWrap) return;
    const options = document.querySelector(".controls__options");

    limitWrap = document.createElement("div");
    limitWrap.style.display = "flex";
    limitWrap.style.alignItems = "center";
    limitWrap.style.gap = "0.5rem";

    const label = document.createElement("span");
    label.textContent = "Limit:";

    limitInput = document.createElement("input");
    limitInput.type = "number";
    limitInput.min = "1";
    limitInput.step = "1";
    limitInput.value = "100";
    limitInput.style.width = "6rem";

    limitRemain = document.createElement("span");
    limitRemain.setAttribute("aria-live", "polite");

    limitWrap.append(label, limitInput, limitRemain);
    (options?.parentNode || document.body).insertBefore(
      limitWrap,
      options?.nextSibling || null
    );

    limitInput.addEventListener("input", () => {
      const v = parseInt(limitInput.value, 10);
      activeLimit = Number.isFinite(v) && v > 0 ? v : 1;
      // enforce immediately if over
      const trimmed = enforceLimit(els.text.value, activeLimit);
      if (trimmed !== els.text.value) {
        const pos = els.text.selectionStart;
        els.text.value = trimmed;
        els.text.selectionStart = els.text.selectionEnd = Math.min(
          trimmed.length,
          pos
        );
      }
      updateLimitRemain();
      scheduleUpdate();
    });
  }

  const TOP_N = 5;
  let ldShowAll = false;
  let lastLD = { entries: [], totalLetters: 0 };

  const pad2 = (n) => String(n).padStart(2, "0");

  const countWords = (str) => {
    const m = str.trim().match(/\b\S+\b/g);
    return m ? m.length : 0;
  };

  const countSentences = (str) => {
    if (!str.trim()) return 0;
    const parts = (str.match(/[^.!?]+([.!?]+|$)/g) || [])
      .map((s) => s.trim())
      .filter(Boolean);
    return parts.length;
  };

  const readingMinutes = (words, wpm = 200) =>
    words ? Math.max(1, Math.ceil(words / wpm)) : 0;

  const modeCount = (str) =>
    els.excludeSpaces && els.excludeSpaces.checked
      ? str.replace(/\s+/g, "").length
      : str.length;

  function enforceLimit(str, limit) {
    if (limit == null) return str;
    if (!els.excludeSpaces || !els.excludeSpaces.checked) {
      return str.slice(0, limit);
    }
    let used = 0,
      out = "";
    for (const ch of str) {
      if (/\s/.test(ch)) {
        out += ch;
        continue;
      }
      if (used >= limit) break;
      out += ch;
      used++;
    }
    return out;
  }

  function updateLimitRemain() {
    if (!limitRemain || activeLimit == null) return;
    const used = Math.min(modeCount(els.text.value), activeLimit);
    limitRemain.textContent = `${used}/${activeLimit}`;
  }

  function update() {
    // Hide or show the "no characters found" message
    if (noCharsMsg) {
      if (els.text.value.trim().length > 0) {
        noCharsMsg.style.display = "none";
      } else {
        noCharsMsg.style.display = "block";
      }
    }

    if (activeLimit != null) {
      const used = modeCount(els.text.value);
      if (used > activeLimit) {
        const trimmed = enforceLimit(els.text.value, activeLimit);
        if (trimmed !== els.text.value) {
          const pos = els.text.selectionStart;
          els.text.value = trimmed;
          els.text.selectionStart = els.text.selectionEnd = Math.min(
            trimmed.length,
            pos
          );
        }
      }
      updateLimitRemain();
    }

    const raw = els.text.value;

    const charSource =
      els.excludeSpaces && els.excludeSpaces.checked
        ? raw.replace(/\s+/g, "")
        : raw;
    const totalChars = charSource.length;

    const words = countWords(raw);
    const sentences = countSentences(raw);
    const minutes = readingMinutes(words);

    if (els.charCount) els.charCount.textContent = pad2(totalChars);
    if (els.wordCount) els.wordCount.textContent = pad2(words);
    if (els.sentenceCount) els.sentenceCount.textContent = pad2(sentences);
    if (els.readingTime) {
      els.readingTime.textContent = minutes
        ? `Approx. reading time: ${minutes} minute${minutes > 1 ? "s" : ""}`
        : "Approx. reading time: 0 minute";
    }

    computeLetterDensity(raw);
  }

  // ---- Letter Density
  function computeLetterDensity(text) {
    const letters = text
      .replace(/[^a-zA-Z]/g, "")
      .toUpperCase()
      .split("");
    const total = letters.length;

    const freq = new Map();
    for (const ch of letters) freq.set(ch, (freq.get(ch) || 0) + 1);

    const entries = [...freq.entries()].sort((a, b) =>
      b[1] === a[1] ? a[0].localeCompare(b[0]) : b[1] - a[1]
    );

    lastLD = { entries, totalLetters: total };

    const labelEl = els.ldToggle?.querySelector(".ld-label");

    if (els.ldToggle) {
      const needToggle = entries.length > TOP_N;
      els.ldToggle.style.display = needToggle ? "inline-flex" : "none";
      if (!needToggle) {
        ldShowAll = false;
        els.ldToggle.setAttribute("aria-expanded", "false");
        if (labelEl) labelEl.textContent = "See more";
      }
    }
    renderLetterDensity();
  }

  function renderLetterDensity() {
    if (!els.ldList) return;

    const { entries, totalLetters } = lastLD;
    els.ldList.innerHTML = "";
    if (!totalLetters || !entries.length) return;

    const toShow = ldShowAll ? entries : entries.slice(0, TOP_N);

    for (const [letter, count] of toShow) {
      const pct = (count / totalLetters) * 100;
      const li = document.createElement("li");

      const left = document.createElement("span");
      left.className = "ld-letter";
      left.textContent = letter;

      const rail = document.createElement("div");
      rail.className = "ld-bar-rail";

      const fill = document.createElement("div");
      fill.className = "ld-bar-fill";
      fill.style.width = pct + "%";
      fill.setAttribute("aria-label", `${letter} ${pct.toFixed(2)}%`);
      rail.appendChild(fill);

      const right = document.createElement("span");
      right.className = "ld-count";
      right.textContent = `${count} (${pct.toFixed(2)}%)`;

      li.append(left, rail, right);
      els.ldList.appendChild(li);
    }
  }

  let rafId = 0;
  const scheduleUpdate = () => {
    cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(update);
  };

  els.text.addEventListener("input", scheduleUpdate);
  els.text.addEventListener("paste", () => setTimeout(scheduleUpdate, 0));

  if (els.excludeSpaces)
    els.excludeSpaces.addEventListener("change", () => {
      if (activeLimit != null) {
        els.text.value = enforceLimit(els.text.value, activeLimit);
      }
      scheduleUpdate();
    });

  if (els.ldToggle) {
    const labelEl = els.ldToggle.querySelector(".ld-label");

    els.ldToggle.addEventListener("click", () => {
      ldShowAll = !ldShowAll;
      if (labelEl) labelEl.textContent = ldShowAll ? "See less" : "See more";
      els.ldToggle.setAttribute("aria-expanded", String(ldShowAll));
      renderLetterDensity();
    });
  }

  if (els.setLimit) {
    els.setLimit.addEventListener("change", () => {
      if (els.setLimit.checked) {
        ensureLimitUI();
        const v = parseInt(limitInput.value, 10);
        activeLimit = Number.isFinite(v) && v > 0 ? v : 280;
        limitWrap.hidden = false;
        els.text.value = enforceLimit(els.text.value, activeLimit);
        updateLimitRemain();
      } else {
        hideLimitUI();
      }
      scheduleUpdate();
    });
  }

  update();
})();
