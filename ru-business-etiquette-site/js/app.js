/* ==========================================================================
   ДЕЛОВОЙ ЭТИКЕТ ПО-РУССКИ · 俄语商务交际礼仪
   Логика сайта: словарь, письма, диалог, тест, озвучивание.
   ========================================================================== */

(function () {
  "use strict";

  /* ---------- Утилиты ---------------------------------------------------- */

  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));

  function esc(value) {
    return String(value).replace(/[&<>"']/g, function (ch) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch];
    });
  }

  function stripStress(text) {
    return String(text).replace(/\u0301/g, "");
  }

  function norm(text) {
    return stripStress(text).toLowerCase().replace(/ё/g, "е").replace(/\s+/g, " ").trim();
  }

  function plural(n, one, few, many) {
    const abs = Math.abs(n) % 100;
    const last = abs % 10;
    if (abs > 10 && abs < 20) return many;
    if (last === 1) return one;
    if (last >= 2 && last <= 4) return few;
    return many;
  }

  function format(text) {
    return esc(text).replace(/\*\*(.+?)\*\*/g, function (_, inner) {
      return '<span class="formula" title="Формула речевого этикета · 礼仪套语">' + inner + "</span>";
    });
  }

  /* ---------- Озвучивание (Web Speech API) ------------------------------- */

  const synth = "speechSynthesis" in window ? window.speechSynthesis : null;
  let ruVoice = null;
  let speakingButton = null;
  let activeUtterance = null;

  function pickRuVoice() {
    if (!synth || typeof synth.getVoices !== "function") return;
    const voices = synth.getVoices();
    ruVoice = voices.find(function (v) {
      return /^ru([-_]|$)/i.test(v.lang);
    }) || null;
  }

  if (synth) {
    pickRuVoice();
    if (typeof synth.addEventListener === "function") {
      synth.addEventListener("voiceschanged", pickRuVoice);
    } else {
      synth.onvoiceschanged = pickRuVoice;
    }
  } else {
    document.documentElement.classList.add("no-tts");
  }

  let audioEl = null;

  function clearSpeaking() {
    if (speakingButton) {
      speakingButton.classList.remove("is-speaking");
      speakingButton = null;
    }
  }

  function stopMedia() {
    if (audioEl) {
      audioEl.pause();
      audioEl.currentTime = 0;
    }
    if (synth) synth.cancel();
    clearSpeaking();
  }

  function playAudio(src, fallbackText, button) {
    stopMedia();

    if (!audioEl) audioEl = new Audio();
    audioEl.src = src;
    audioEl.preload = "auto";

    let failed = false;
    function fallback() {
      if (failed) return;
      failed = true;
      audioEl.onerror = null;
      button.classList.remove("is-speaking");
      if (synth) speak(fallbackText, button);
    }

    audioEl.onended = clearSpeaking;
    audioEl.onerror = fallback;

    if (button) {
      button.classList.add("is-speaking");
      speakingButton = button;
    }

    const playback = audioEl.play();
    if (playback && typeof playback.catch === "function") {
      playback.catch(fallback);
    }
  }

  function speak(text, button) {
    if (!synth) return;
    if (audioEl) audioEl.pause();
    synth.cancel();
    clearSpeaking();

    const utterance = new SpeechSynthesisUtterance(stripStress(text));
    utterance.lang = "ru-RU";
    utterance.rate = 0.9;
    utterance.pitch = 1;
    if (ruVoice) utterance.voice = ruVoice;
    activeUtterance = utterance;

    if (button) {
      button.classList.add("is-speaking");
      speakingButton = button;
    }

    utterance.onend = function () {
      if (activeUtterance === utterance) clearSpeaking();
    };
    utterance.onerror = function () {
      if (activeUtterance === utterance) clearSpeaking();
    };
    synth.speak(utterance);
  }

  /* ---------- 1. СЛОВАРЬ ------------------------------------------------- */

  const vocabRoot = $("#vocab-root");
  const vocabFilters = $("#vocab-filters");
  const searchInput = $("#vocab-search");
  const searchClear = $("#vocab-search-clear");
  const vocabCount = $("#vocab-count");
  const vocabEmpty = $("#vocab-empty");

  const TOTAL_PHRASES = VOCAB_GROUPS.reduce(function (sum, group) {
    return sum + group.items.length;
  }, 0);

  const filterState = { group: "all", query: "" };

  function registerLabel(register) {
    const reg = REGISTERS[register] || REGISTERS.neutral;
    return { ru: reg.ru, zh: reg.zh, className: reg.className };
  }

  function renderChips() {
    if (!vocabFilters) return;

    const chips = [
      { id: "all", label: "Все", zh: "全部", count: TOTAL_PHRASES }
    ].concat(
      VOCAB_GROUPS.map(function (group) {
        return { id: group.id, label: group.titleRu, zh: group.titleZh, count: group.items.length };
      })
    );

    vocabFilters.innerHTML = chips.map(function (chip) {
      return (
        '<button class="chip" type="button" data-group="' + esc(chip.id) + '" aria-pressed="' +
        (chip.id === "all" ? "true" : "false") + '">' +
        "<span>" + esc(chip.label) + "</span>" +
        '<span class="chip-zh" lang="zh-CN">' + esc(chip.zh) + "</span>" +
        '<span class="chip-count">' + chip.count + "</span>" +
        "</button>"
      );
    }).join("");
  }

  function cardMarkup(item, group, index) {
    const reg = registerLabel(item.register);
    const searchText = norm([
      group.titleRu,
      group.titleZh,
      group.introRu,
      group.introZh,
      item.ru,
      item.zh,
      item.exRu,
      item.exZh,
      item.noteRu || "",
      item.noteZh || ""
    ].join(" "));

    const note = item.noteRu
      ? '<p class="card-note">' + esc(item.noteRu) +
        (item.noteZh ? ' <span lang="zh-CN">' + esc(item.noteZh) + "</span>" : "") +
        "</p>"
      : "";

    return (
      '<article class="vocab-card" style="--i:' + index + '" data-search="' + esc(searchText) + '">' +
        '<div class="card-top">' +
          '<span class="card-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><use href="#' + esc(item.icon) + '"></use></svg></span>' +
          '<span class="reg-badge ' + reg.className + '">' + esc(reg.ru) + " · " + esc(reg.zh) + "</span>" +
          '<button class="speak-btn" type="button" data-audio="assets/audio/vocab-' + esc(group.id) + "-" + (index + 1) + '.m4a" data-speak="' + esc(stripStress(item.ru)) + '" aria-label="Прослушать: ' + esc(item.ru) + '" title="Прослушать · 朗读">' +
            '<svg viewBox="0 0 24 24" aria-hidden="true"><use href="#i-sound"></use></svg>' +
          "</button>" +
        "</div>" +
        '<p class="card-phrase" lang="ru">' + esc(item.ru) + "</p>" +
        '<p class="card-zh" lang="zh-CN">' + esc(item.zh) + "</p>" +
        note +
        '<div class="card-example">' +
          '<span class="ex-label">Пример · 例句</span>' +
          '<span lang="ru">' + esc(item.exRu) + "</span><br>" +
          '<span lang="zh-CN">' + esc(item.exZh) + "</span>" +
        "</div>" +
      "</article>"
    );
  }

  function renderVocab() {
    if (!vocabRoot) return;

    vocabRoot.innerHTML = VOCAB_GROUPS.map(function (group) {
      return (
        '<section class="vocab-group" data-group="' + esc(group.id) + '" data-accent="' + esc(group.accent) + '">' +
          '<header class="group-head">' +
            '<div class="group-emblem">' +
              '<img src="' + esc(group.image) + '" width="320" height="220" alt="Иллюстрация к группе «' + esc(group.titleRu) + '»" loading="lazy">' +
            "</div>" +
            '<div class="group-heading">' +
              '<h3 class="group-title"><span>' + esc(group.number) + ". " + esc(group.titleRu) + "</span>" +
                '<span class="group-zh" lang="zh-CN">' + esc(group.titleZh) + "</span></h3>" +
              '<p class="group-intro">' + esc(group.introRu) +
                ' <span lang="zh-CN">' + esc(group.introZh) + "</span></p>" +
            "</div>" +
            '<span class="group-count" data-count>' + group.items.length + " " +
              plural(group.items.length, "фраза", "фразы", "фраз") + "</span>" +
          "</header>" +
          '<div class="cards">' +
            group.items.map(function (item, index) {
              return cardMarkup(item, group, index);
            }).join("") +
          "</div>" +
        "</section>"
      );
    }).join("");

    applyFilter();
  }

  renderVocab();

  function applyFilter() {
    if (!vocabRoot) return;

    const query = norm(filterState.query);
    let visibleTotal = 0;

    $$(".vocab-group", vocabRoot).forEach(function (groupEl) {
      let visibleInGroup = 0;
      const groupMatch = filterState.group === "all" || filterState.group === groupEl.dataset.group;

      $$(".vocab-card", groupEl).forEach(function (card) {
        const matches = groupMatch && (!query || card.dataset.search.indexOf(query) !== -1);
        card.hidden = !matches;
        if (matches) visibleInGroup += 1;
      });

      groupEl.hidden = visibleInGroup === 0;
      visibleTotal += visibleInGroup;

      const countEl = $("[data-count]", groupEl);
      if (countEl) {
        countEl.textContent = visibleInGroup + " " + plural(visibleInGroup, "фраза", "фразы", "фраз");
      }
    });

    if (vocabEmpty) {
      vocabEmpty.hidden = visibleTotal !== 0;
    }

    if (vocabCount) {
      if (!query && filterState.group === "all") {
        vocabCount.textContent = TOTAL_PHRASES + " фраз · " + VOCAB_GROUPS.length + " групп · 共 " + TOTAL_PHRASES + " 条";
      } else {
        vocabCount.textContent = "Найдено: " + visibleTotal + " из " + TOTAL_PHRASES + " · 找到 " + visibleTotal + " 条";
      }
    }
  }

  function setGroupFilter(groupId) {
    filterState.group = groupId;
    $$(".chip", vocabFilters).forEach(function (chip) {
      chip.setAttribute("aria-pressed", chip.dataset.group === groupId ? "true" : "false");
    });
    applyFilter();
  }

  if (vocabFilters) {
    renderChips();
    vocabFilters.addEventListener("click", function (event) {
      const chip = event.target.closest(".chip");
      if (chip) setGroupFilter(chip.dataset.group);
    });
  }

  if (searchInput) {
    searchInput.addEventListener("input", function () {
      filterState.query = searchInput.value;
      if (searchClear) searchClear.hidden = !searchInput.value;
      applyFilter();
    });
  }

  if (searchClear) {
    searchClear.addEventListener("click", function () {
      if (!searchInput) return;
      searchInput.value = "";
      filterState.query = "";
      searchClear.hidden = true;
      applyFilter();
      searchInput.focus();
    });
  }

  /* ---------- 2. ПИСЬМА -------------------------------------------------- */

  const emailsRoot = $("#emails-root");

  function emailMarkup(email, index) {
    const bodyId = "email-body-" + email.id + "-" + index;
    const emailSpeak = [email.greeting]
      .concat(email.paragraphs, email.closing)
      .join(" ")
      .replace(/\*\*/g, "");

    const meta = [
      { label: email.fromLabel, value: email.from },
      { label: email.toLabel, value: email.to },
      { label: email.subjectLabel, value: email.subject },
      { label: "Дата", value: email.date }
    ].map(function (row) {
      return "<div><dt>" + esc(row.label) + "</dt><dd>" + esc(row.value) + "</dd></div>";
    }).join("");

    return (
      '<article class="email-card" aria-labelledby="email-subject-' + index + '">' +
        '<div class="email-top">' +
          '<p class="email-label">' + esc(email.labelRu) + ' · <span lang="zh-CN">' + esc(email.labelZh) + "</span></p>" +
          '<h3 class="email-subject" id="email-subject-' + index + '">' + esc(email.subject) + "</h3>" +
          '<dl class="email-meta">' + meta + "</dl>" +
        "</div>" +
        '<div class="email-toolbar">' +
          '<button class="btn btn-small btn-ghost email-audio" type="button" data-audio="assets/audio/email-' + esc(email.id) + '.m4a" data-speak="' + esc(emailSpeak) + '" aria-label="Прослушать письмо · 朗读信件">' +
            '<svg viewBox="0 0 24 24" aria-hidden="true"><use href="#i-sound"></use></svg>' +
            "<span>Слушать письмо · 朗读</span>" +
          "</button>" +
          '<button class="btn btn-small btn-ghost email-toggle" type="button" data-target="' + bodyId + '" aria-pressed="true">' +
            '<svg viewBox="0 0 24 24" aria-hidden="true"><use href="#i-translate"></use></svg>' +
            "<span>Скрыть перевод · 隐藏翻译</span>" +
          "</button>" +
        "</div>" +
        '<div class="email-body" id="' + bodyId + '">' +
          '<div class="email-original" lang="ru">' +
            '<p class="email-greeting">' + format(email.greeting) + "</p>" +
            email.paragraphs.map(function (p) {
              return '<p class="email-paragraph">' + format(p) + "</p>";
            }).join("") +
            '<div class="email-closing">' +
              email.closing.map(function (line) { return "<span>" + format(line) + "</span>"; }).join("") +
            "</div>" +
          "</div>" +
          '<div class="email-translation" lang="zh-CN">' +
            '<p class="email-greeting">' + esc(email.greetingZh) + "</p>" +
            email.paragraphsZh.map(function (p) {
              return '<p class="email-paragraph">' + esc(p) + "</p>";
            }).join("") +
            '<div class="email-closing">' +
              email.closingZh.map(function (line) { return "<span>" + esc(line) + "</span>"; }).join("") +
            "</div>" +
          "</div>" +
        "</div>" +
      "</article>"
    );
  }

  function renderEmails() {
    if (!emailsRoot) return;
    emailsRoot.innerHTML = EMAILS.map(emailMarkup).join("");
  }

  if (emailsRoot) {
    renderEmails();
    emailsRoot.addEventListener("click", function (event) {
      const button = event.target.closest(".email-toggle");
      if (!button) return;
      const body = document.getElementById(button.dataset.target);
      if (!body) return;
      const hidden = body.classList.toggle("is-zh-hidden");
      button.setAttribute("aria-pressed", hidden ? "false" : "true");
      const label = $("span", button);
      if (label) label.textContent = hidden ? "Показать перевод · 显示翻译" : "Скрыть перевод · 隐藏翻译";
    });
  }

  /* ---------- 3. ДИАЛОГ -------------------------------------------------- */

  const dialogueRoot = $("#dialogue-root");
  const dialogueCard = $("#dialogue");
  const dialogueTitle = $("#dialogue-title");
  const dialogueIntro = $("#dialogue-intro");
  const dialogueFormulas = $("#dialogue-formulas");
  const dialogueTranslate = $("#dialogue-translate");

  function renderDialogue() {
    if (!dialogueRoot) return;

    if (dialogueTitle) {
      dialogueTitle.innerHTML = esc(DIALOGUE.titleRu) +
        ' <span class="group-zh" lang="zh-CN">' + esc(DIALOGUE.titleZh) + "</span>";
    }

    if (dialogueIntro) {
      dialogueIntro.innerHTML = esc(DIALOGUE.introRu) +
        ' <span lang="zh-CN">' + esc(DIALOGUE.introZh) + "</span>";
    }

    dialogueRoot.innerHTML = DIALOGUE.lines.map(function (line, index) {
      const speaker = DIALOGUE.speakers[line.who];
      const initials = line.who === "li" ? "李" : line.who === "anna" ? "А" : "С";
      const side = line.who === "li" ? " is-right" : "";
      const audioPath = "assets/audio/dialogue-" + String(index + 1).padStart(2, "0") + ".m4a";

      return (
        '<article class="dialogue-line ' + esc(speaker.className) + side + '">' +
          '<span class="avatar" aria-hidden="true">' + esc(initials) + "</span>" +
          '<div class="bubble">' +
            '<p class="speaker"><span>' + esc(speaker.ru) + '</span><span class="speaker-zh" lang="zh-CN">' + esc(speaker.zh) + "</span>" +
              '<button class="line-audio" type="button" data-audio="' + audioPath + '" data-speak="' + esc(stripStress(line.ru)) + '" aria-label="Прослушать реплику: ' + esc(line.ru) + '" title="Прослушать · 朗读">' +
                '<svg viewBox="0 0 24 24" aria-hidden="true"><use href="#i-sound"></use></svg>' +
              "</button>" +
            "</p>" +
            '<p class="line-ru" lang="ru">' + esc(line.ru) + "</p>" +
            '<p class="line-zh" lang="zh-CN">' + esc(line.zh) + "</p>" +
          "</div>" +
        "</article>"
      );
    }).join("");

    if (dialogueFormulas) {
      dialogueFormulas.innerHTML = DIALOGUE.formulas.map(function (formula) {
        return '<span class="formula-chip">' + esc(formula) + "</span>";
      }).join("");
    }
  }

  if (dialogueCard) {
    renderDialogue();

    if (dialogueTranslate) {
      dialogueTranslate.addEventListener("click", function () {
        const hidden = dialogueCard.classList.toggle("is-zh-hidden");
        dialogueTranslate.setAttribute("aria-pressed", hidden ? "false" : "true");
        const label = $("span", dialogueTranslate);
        if (label) label.textContent = hidden ? "Перевод выключен" : "Перевод включён";
      });
    }
  }

  /* ---------- 4. КУЛЬТУРА ------------------------------------------------ */

  const cultureBody = $("#culture-body");
  const mistakesRoot = $("#mistakes-root");

  if (cultureBody) {
    cultureBody.innerHTML = CULTURE_ROWS.map(function (row) {
      return (
        "<tr>" +
          "<td>" + esc(row.aspectRu) +
            '<span class="aspect-zh" lang="zh-CN">' + esc(row.aspectZh) + "</span></td>" +
          "<td>" + esc(row.ru) + "</td>" +
          '<td lang="zh-CN">' + esc(row.zh) + "</td>" +
        "</tr>"
      );
    }).join("");
  }

  if (mistakesRoot) {
    mistakesRoot.innerHTML = MISTAKES.map(function (mistake) {
      return (
        '<article class="mistake-card">' +
          '<p class="mistake-label">Так не говорят <span aria-hidden="true">✗</span></p>' +
          '<p class="mistake-wrong">' + esc(mistake.wrong) + "</p>" +
          '<p class="mistake-arrow">↓ лучше · 更好的说法</p>' +
          '<p class="mistake-right">' + esc(mistake.right) + "</p>" +
          '<p class="mistake-why">' + esc(mistake.whyRu) +
            '<span class="mistake-why-zh" lang="zh-CN">' + esc(mistake.whyZh) + "</span></p>" +
        "</article>"
      );
    }).join("");
  }

  /* ---------- 5. ТЕСТ ---------------------------------------------------- */

  const quizRoot = $("#quiz-root");
  const BEST_KEY = "de-etiquette-best-v1";
  const quizState = {
    screen: "intro",
    index: 0,
    score: 0,
    answers: [],
    answered: false,
    selected: null
  };

  function getBest() {
    try {
      const raw = window.localStorage.getItem(BEST_KEY);
      if (!raw) return null;
      const best = JSON.parse(raw);
      if (!best || typeof best.score !== "number") return null;
      return best;
    } catch (error) {
      return null;
    }
  }

  function saveBest(score) {
    const previous = getBest();
    const record = {
      score: score,
      total: QUIZ.length,
      date: new Date().toISOString()
    };
    const isNewBest = !previous || score > previous.score;
    if (isNewBest) {
      try {
        window.localStorage.setItem(BEST_KEY, JSON.stringify(record));
      } catch (error) {
        /* приватный режим — просто не сохраняем */
      }
    }
    return isNewBest;
  }

  function formatBestDate(iso) {
    try {
      return new Date(iso).toLocaleDateString("ru-RU", { day: "numeric", month: "long" });
    } catch (error) {
      return "";
    }
  }

  function renderQuizIntro() {
    if (!quizRoot) return;
    quizState.screen = "intro";

    const best = getBest();
    const bestBlock = best
      ? '<p class="quiz-best-label">Лучший результат · 最佳成绩</p>' +
        '<p class="quiz-best-value">' + best.score + "<small>/" + QUIZ.length + "</small></p>" +
        '<p class="quiz-best-note">' + Math.round((best.score / QUIZ.length) * 100) + "% · " +
          esc(formatBestDate(best.date)) + "</p>"
      : '<p class="quiz-best-label">Лучший результат · 最佳成绩</p>' +
        '<p class="quiz-best-empty">Пока нет результата. Пройдите тест — и он появится здесь. <span lang="zh-CN">还没有成绩，完成测试后会显示在这里。</span></p>';

    quizRoot.innerHTML =
      '<div class="quiz-intro">' +
        "<div>" +
          '<p class="card-kicker">Проверка · 测试</p>' +
          "<h3>Проверьте, как вы чувствуете стиль</h3>" +
          "<p>12 вопросов о формулах, структуре письма и культурных различиях. Отвечайте без словаря — так интереснее.</p>" +
          '<ul class="quiz-facts">' +
            '<li><svg viewBox="0 0 24 24" aria-hidden="true"><use href="#i-check"></use></svg> Мгновенная проверка после каждого ответа</li>' +
            '<li><svg viewBox="0 0 24 24" aria-hidden="true"><use href="#i-clock"></use></svg> Около 7 минут</li>' +
            '<li><svg viewBox="0 0 24 24" aria-hidden="true"><use href="#i-star"></use></svg> В конце — результат и разбор ошибок</li>' +
          "</ul>" +
          '<button class="btn btn-primary" id="quiz-start" type="button">Начать тест · 开始测试 ' +
            '<svg viewBox="0 0 24 24" aria-hidden="true"><use href="#i-arrow"></use></svg></button>' +
        "</div>" +
        '<aside class="quiz-best">' + bestBlock + "</aside>" +
      "</div>";

    const startButton = $("#quiz-start", quizRoot);
    if (startButton) {
      startButton.addEventListener("click", startQuiz);
    }
  }

  function startQuiz() {
    quizState.index = 0;
    quizState.score = 0;
    quizState.answers = [];
    quizState.answered = false;
    quizState.selected = null;
    renderQuestion();
  }

  function renderQuestion() {
    if (!quizRoot) return;

    quizState.screen = "question";
    quizState.answered = false;
    quizState.selected = null;

    const question = QUIZ[quizState.index];
    const isLast = quizState.index === QUIZ.length - 1;
    const letters = ["A", "B", "C", "D", "E"];

    quizRoot.innerHTML =
      '<div class="quiz-topbar">' +
        '<span class="quiz-progress-text">Вопрос ' + (quizState.index + 1) + " из " + QUIZ.length +
          " · 第 " + (quizState.index + 1) + " 题</span>" +
        '<span class="quiz-score-chip">' + quizState.score + " / " + QUIZ.length + " баллов</span>" +
      "</div>" +
      '<div class="progress-track" role="progressbar" aria-valuemin="0" aria-valuemax="' + QUIZ.length +
        '" aria-valuenow="' + quizState.index + '" aria-label="Прогресс теста">' +
        '<div class="progress-fill" style="width:' + (quizState.index / QUIZ.length) * 100 + '%"></div>' +
      "</div>" +
      '<span class="quiz-tag">' + esc(question.tagRu) + " · " + esc(question.tagZh) + "</span>" +
      '<h3 class="q-ru" id="quiz-question" tabindex="-1">' + esc(question.qRu) + "</h3>" +
      '<p class="q-zh" lang="zh-CN">' + esc(question.qZh) + "</p>" +
      '<div class="options" role="group" aria-labelledby="quiz-question">' +
        question.options.map(function (option, index) {
          return (
            '<button class="option" type="button" data-option="' + index + '">' +
              '<span class="option-letter" aria-hidden="true">' + letters[index] + "</span>" +
              '<span class="option-text">' +
                '<span class="option-ru">' + esc(option.ru) + "</span>" +
                '<span class="option-zh" lang="zh-CN">' + esc(option.zh) + "</span>" +
              "</span>" +
            "</button>"
          );
        }).join("") +
      "</div>" +
      '<div id="quiz-feedback" aria-live="polite"></div>' +
      '<div class="quiz-actions">' +
        '<span class="quiz-hint" id="quiz-hint">Выберите один ответ · 请选择一个答案</span>' +
        '<button class="btn btn-primary" id="quiz-next" type="button" disabled>' +
          (isLast ? "Показать результат · 查看结果" : "Следующий вопрос · 下一题") +
          ' <svg viewBox="0 0 24 24" aria-hidden="true"><use href="#i-arrow"></use></svg>' +
        "</button>" +
      "</div>";

    $$(".option", quizRoot).forEach(function (button) {
      button.addEventListener("click", function () {
        answerQuestion(Number(button.dataset.option));
      });
    });

    const nextButton = $("#quiz-next", quizRoot);
    if (nextButton) nextButton.addEventListener("click", nextQuestion);

    const heading = $("#quiz-question", quizRoot);
    if (heading) {
      heading.focus({ preventScroll: true });
    }
  }

  function answerQuestion(selectedIndex) {
    if (quizState.answered) return;

    const question = QUIZ[quizState.index];
    const isCorrect = selectedIndex === question.answer;
    quizState.answered = true;
    quizState.selected = selectedIndex;

    if (isCorrect) quizState.score += 1;

    quizState.answers.push({
      qIndex: quizState.index,
      chosen: selectedIndex,
      correct: isCorrect
    });

    $$(".option", quizRoot).forEach(function (button) {
      const index = Number(button.dataset.option);
      button.disabled = true;
      if (index === question.answer) {
        button.classList.add("is-correct");
      } else if (index === selectedIndex) {
        button.classList.add("is-wrong");
      } else {
        button.classList.add("is-muted");
      }
    });

    const scoreChip = $(".quiz-score-chip", quizRoot);
    if (scoreChip) {
      scoreChip.textContent = quizState.score + " / " + QUIZ.length + " баллов";
    }

    const feedback = $("#quiz-feedback", quizRoot);
    if (feedback) {
      feedback.innerHTML =
        '<div class="feedback ' + (isCorrect ? "is-correct" : "is-wrong") + '" role="status">' +
          '<span class="feedback-icon" aria-hidden="true">' + (isCorrect ? "✓" : "!") + "</span>" +
          "<div>" +
            "<strong>" + (isCorrect ? "Верно! · 回答正确" : "Не совсем. · 回答有误") + "</strong>" +
            "<p>" + esc(question.explainRu) + "</p>" +
            '<p lang="zh-CN">' + esc(question.explainZh) + "</p>" +
            (!isCorrect
              ? '<p><strong>Правильный ответ:</strong> ' + esc(question.options[question.answer].ru) + "</p>"
              : "") +
          "</div>" +
        "</div>";
    }

    const hint = $("#quiz-hint", quizRoot);
    if (hint) {
      hint.textContent = isCorrect ? "Верно! · 回答正确" : "Посмотрите разбор · 请看解析";
    }

    const nextButton = $("#quiz-next", quizRoot);
    if (nextButton) {
      nextButton.disabled = false;
      nextButton.focus({ preventScroll: true });
    }
  }

  function nextQuestion() {
    if (!quizState.answered) return;

    if (quizState.index >= QUIZ.length - 1) {
      renderResult();
      return;
    }

    quizState.index += 1;
    renderQuestion();

    if (quizRoot) {
      quizRoot.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  function resultMessage(score) {
    const total = QUIZ.length;
    const percent = Math.round((score / total) * 100);

    if (percent === 100) {
      return {
        title: "Отлично! · 太棒了！",
        ru: "Вы уверенно чувствуете деловой стиль: формулы, структура и культурные различия — всё на месте.",
        zh: "你已经很好地掌握了商务语体：套语、结构和文化差异都答对了。"
      };
    }
    if (percent >= 80) {
      return {
        title: "Очень хорошо! · 非常好！",
        ru: "Почти всё верно. Осталось отшлифовать несколько формул — загляните в словарь.",
        zh: "几乎全对。还有几个套语需要打磨，建议再看看词汇表。"
      };
    }
    if (percent >= 55) {
      return {
        title: "Хорошо, но есть над чем работать · 不错，但还需努力",
        ru: "База есть. Повторите группы «Просьба», «Отказ» и «Структура письма» — и результат вырастет.",
        zh: "基础已经有了。复习“请求”“拒绝”和“书信结构”三组，成绩会提高。"
      };
    }
    return {
      title: "Стоит начать со словаря · 建议从词汇开始",
      ru: "Не расстраивайтесь: вернитесь к словарю, прочитайте примеры и попробуйте снова.",
      zh: "别灰心：先复习词汇和例句，然后再试一次。"
    };
  }

  function renderResult() {
    if (!quizRoot) return;
    quizState.screen = "result";

    const total = QUIZ.length;
    const percent = Math.round((quizState.score / total) * 100);
    const message = resultMessage(quizState.score);
    const wrong = quizState.answers.filter(function (answer) { return !answer.correct; });
    const isNewBest = saveBest(quizState.score);

    const wrongBlock = wrong.length
      ? '<div class="result-review">' +
          "<h4>Разбор ошибок · 错题解析</h4>" +
          wrong.map(function (answer) {
            const question = QUIZ[answer.qIndex];
            return (
              '<div class="review-item">' +
                '<p class="review-q"><strong>' + (answer.qIndex + 1) + ".</strong> " + esc(question.qRu) + "</p>" +
                '<p class="review-answer">Правильно: ' + esc(question.options[question.answer].ru) +
                  ' <span>· 正确答案</span></p>' +
                '<p class="review-explain">Ваш ответ: ' + esc(question.options[answer.chosen].ru) + ". " +
                  esc(question.explainRu) + "</p>" +
                '<p class="review-explain" lang="zh-CN">' + esc(question.explainZh) + "</p>" +
              "</div>"
            );
          }).join("") +
        "</div>"
      : '<p class="result-perfect">Ни одной ошибки — отличная работа! · 全部答对，太棒了！</p>';

    quizRoot.innerHTML =
      '<div class="result">' +
        '<div class="result-ring" style="--pct:' + percent + '">' +
          '<div class="result-ring-inner">' +
            '<p class="result-score">' + quizState.score + "<small>/" + total + "</small></p>" +
            '<p class="result-percent">' + percent + "%</p>" +
          "</div>" +
        "</div>" +
        "<h3 tabindex=\"-1\">" + esc(message.title) + "</h3>" +
        '<p class="result-message">' + esc(message.ru) + "</p>" +
        '<p class="result-message-zh" lang="zh-CN">' + esc(message.zh) + "</p>" +
        (isNewBest
          ? '<p class="result-message" style="margin-top:12px;color:var(--gold-deep);font-weight:600">Новый лучший результат! · 新的最佳成绩！</p>'
          : "") +
        '<div class="result-actions">' +
          '<button class="btn btn-primary" id="quiz-restart" type="button">' +
            '<svg viewBox="0 0 24 24" aria-hidden="true"><use href="#i-refresh"></use></svg>' +
            "Пройти заново · 再试一次</button>" +
          '<a class="btn btn-ghost" href="#vocab">Вернуться к словарю · 回到词汇</a>' +
        "</div>" +
        wrongBlock +
      "</div>";

    const restart = $("#quiz-restart", quizRoot);
    if (restart) restart.addEventListener("click", startQuiz);

    const heading = $(".result h3", quizRoot);
    if (heading) heading.focus({ preventScroll: true });

    if (quizRoot) {
      quizRoot.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  if (quizRoot) {
    renderQuizIntro();
  }

  /* ---------- 6. ОЗВУЧИВАНИЕ: делегирование ------------------------------ */

  document.addEventListener("click", function (event) {
    const button = event.target.closest("[data-audio], [data-speak]");
    if (!button) return;

    if (button.dataset.audio) {
      playAudio(button.dataset.audio, button.dataset.speak || "", button);
    } else if (button.dataset.speak) {
      speak(button.dataset.speak, button);
    }
  });

  /* ---------- 7. АКТИВНАЯ СЕКЦИЯ В НАВИГАЦИИ ---------------------------- */

  const navLinks = $$(".main-nav a");
  const observedSections = ["about", "vocab", "letters", "quiz", "culture"]
    .map(function (id) { return document.getElementById(id); })
    .filter(Boolean);

  if ("IntersectionObserver" in window && navLinks.length && observedSections.length) {
    const observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        const id = entry.target.id;
        navLinks.forEach(function (link) {
          link.classList.toggle("is-active", link.getAttribute("href") === "#" + id);
        });
      });
    }, { rootMargin: "-35% 0px -55% 0px", threshold: 0 });

    observedSections.forEach(function (section) { observer.observe(section); });
  }

  /* ---------- 8. КЛАВИАТУРА В ТЕСТЕ -------------------------------------- */

  document.addEventListener("keydown", function (event) {
    if (quizState.screen !== "question") return;

    const tag = document.activeElement ? document.activeElement.tagName : "";
    if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
    if (event.metaKey || event.ctrlKey || event.altKey) return;

    if (/^[1-5]$/.test(event.key) && !quizState.answered) {
      const optionIndex = Number(event.key) - 1;
      const question = QUIZ[quizState.index];
      if (optionIndex < question.options.length) {
        event.preventDefault();
        answerQuestion(optionIndex);
      }
    }
  });
})();
