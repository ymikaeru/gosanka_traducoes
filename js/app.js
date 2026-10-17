(function () {
  "use strict";

  var D = window.GOSANKA;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  var store = {
    get: function (k, d) { try { var v = localStorage.getItem("gosanka." + k); return v === null ? d : v; } catch (e) { return d; } },
    set: function (k, v) { try { localStorage.setItem("gosanka." + k, v); } catch (e) {} }
  };

  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; });
  }

  // Original japonês: cada bloco separado por espaço vira uma linha; 〔variantes〕 em destaque discreto
  function jpHTML(s) {
    // uma linha só, com espaço ideográfico entre os 3 blocos
    return s.trim().split(/[\s　]+/).map(function (part) {
      return esc(part).replace(/〔([^〕]*)〕/g, '<span class="var">〔$1〕</span>');
    }).join("　");
  }

  // Nota de tradução: `conta do ideograma` vira destaque; *romaji* vira itálico
  function noteHTML(text) {
    return esc(text)
      .replace(/`([^`]+)`/g, '<span class="kf" lang="ja">$1</span>')
      .replace(/\*([^*]+)\*/g, "<i>$1</i>");
  }
  function typeClass(t) {
    return "nt-" + t.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z]+/g, "-");
  }

  // ---------- dados ----------
  var POEMS = {}, ALL = [];
  D.sections.forEach(function (sec, i) {
    sec.id = "s" + i;
    sec.poems.forEach(function (p) {
      p.oldTxt = p.old.join("\n");
      p.newTxt = p.new.join("\n");
      p.sec = sec;
      POEMS[p.n] = p; ALL.push(p);
    });
  });

  // escolhas para o livro: { n: { c: "fiel" | "antiga" | "editada", t: "texto editado" } }
  var book = {};
  try { book = JSON.parse(store.get("book", "{}")) || {}; } catch (e) { book = {}; }
  function saveBook() { store.set("book", JSON.stringify(book)); }

  // ---------- render ----------
  var poemsEl = $("#poems"), tocEl = $("#toc");
  var html = [], toc = [];
  $("#hero-dates").textContent = D.dates;

  D.sections.forEach(function (sec) {
    if (sec.intro && !sec.poems.length) {
      $("#preface").innerHTML = '<summary><span class="jp">' + esc(sec.jp) + "</span>" + esc(sec.pt) +
        " — palavras do autor</summary><div class=\"body\">" + esc(sec.intro) + "</div>";
      return;
    }
    if (!sec.poems.length) {
      html.push('<div class="sec-div" id="' + sec.id + '">' + esc(sec.jp) + "</div>");
      toc.push('<div class="t-div">' + esc(sec.pt) + "</div>");
      return;
    }
    var first = sec.poems[0].n, last = sec.poems[sec.poems.length - 1].n;
    toc.push('<a href="#' + sec.id + '" data-sec="' + sec.id + '"><span class="t-jp">' + esc(sec.jp) +
      '</span><span class="t-pt">' + esc(sec.pt) + '</span><span class="t-n">' + first + "–" + last +
      '<b data-cnt="' + sec.id + '"></b></span></a>');
    html.push('<section class="sec" id="' + sec.id + '"><div class="sec-head"><span class="jp">' + esc(sec.jp) +
      '</span><span class="pt">' + esc(sec.pt) + '</span><span class="cnt" data-cnt-head="' + sec.id + '"></span></div>');

    sec.poems.forEach(function (p) {
      html.push(
        '<article class="poem" id="p' + p.n + '" data-n="' + p.n + '">' +
          '<div class="p-grid">' +
            '<a class="p-num" href="#p' + p.n + '" title="Link para este poema"><b>' + p.n + "</b>" +
              (p.mk ? "<i>" + esc(p.mk) + "</i>" : "") + '<span class="st"></span></a>' +
            '<div class="p-body">' +
              '<div class="col-jp"><p class="p-ro">' + p.ro.map(function (l) { return "<span>" + esc(l) + "</span>"; }).join("") +
                '</p><p class="p-jp" lang="ja">' + jpHTML(p.jp) + "</p></div>" +
              '<div class="p-cmp">' +
                '<div class="tr fiel"><div class="tr-label">Fiel</div><p>' + p.new.map(function (l) { return "<span>" + esc(l) + "</span>"; }).join("") + "</p></div>" +
                '<div class="tr antiga"><div class="tr-label">Antiga</div><p>' + p.old.map(function (l) { return "<span>" + esc(l) + "</span>"; }).join("") + "</p></div>" +
              "</div>" +
              (p.nt ? '<div class="p-nota"><div class="nt-head"><b>Nota de tradução</b>' +
                p.nt.t.map(function (t) { return '<span class="nt-tag ' + typeClass(t) + '">' + esc(t) + "</span>"; }).join("") +
                "</div><p>" + noteHTML(p.nt.x) + "</p></div>" : "") +
            "</div>" +
          "</div>" +
          '<div class="decide"><span class="lbl">Para o livro:</span>' +
            '<button data-c="fiel">Fiel</button><button data-c="antiga">Antiga</button><button data-c="editada">Editar</button>' +
            '<button class="clear" data-c="" title="Desfazer a escolha">desfazer</button>' +
            '<span class="note"></span>' +
          "</div>" +
          '<div class="edit" hidden><textarea spellcheck="true" lang="pt-BR" aria-label="Texto editado para o livro"></textarea>' +
            '<div class="hint">Uma linha por verso. Recomeçar a partir da <button data-copy="fiel">Fiel</button>·<button data-copy="antiga">Antiga</button></div></div>' +
        "</article>"
      );
    });
    html.push("</section>");
  });
  poemsEl.innerHTML = html.join("");
  tocEl.innerHTML = toc.join("");

  var cards = {};
  $$(".poem").forEach(function (c) { cards[c.dataset.n] = c; });

  // ---------- escolha para o livro ----------
  function paint(n) {
    var c = cards[n], b = book[n], ch = b ? b.c : "";
    if (ch) c.setAttribute("data-choice", ch); else c.removeAttribute("data-choice");
    $$(".decide button[data-c]", c).forEach(function (btn) {
      if (btn.dataset.c) btn.setAttribute("aria-pressed", btn.dataset.c === ch);
    });
    $(".clear", c).hidden = !ch;
    $(".tr.fiel", c).classList.toggle("chosen", ch === "fiel");
    $(".tr.antiga", c).classList.toggle("chosen", ch === "antiga");
    var ed = $(".edit", c);
    ed.hidden = ch !== "editada";
    if (ch === "editada") {
      var ta = $("textarea", c);
      if (document.activeElement !== ta) ta.value = b.t || "";
      autosize(ta);
    }
    $(".note", c).textContent = ch === "editada" ? "versão editada" : "";
  }

  function choose(n, ch) {
    if (!ch) delete book[n];
    else if (ch === "editada") {
      var prev = book[n];
      book[n] = { c: "editada", t: prev && prev.t ? prev.t : (prev && prev.c === "antiga" ? POEMS[n].oldTxt : POEMS[n].newTxt) };
    } else book[n] = { c: ch, t: book[n] && book[n].t };
    if (book[n] && !book[n].t) delete book[n].t;
    saveBook(); paint(n); progress();
    if (ch === "editada") $("textarea", cards[n]).focus();
    if (filterVal !== "all") applyFilter();
  }

  function autosize(ta) { ta.style.height = "auto"; ta.style.height = (ta.scrollHeight + 4) + "px"; }

  poemsEl.addEventListener("click", function (e) {
    var card = e.target.closest(".poem"); if (!card) return;
    var n = card.dataset.n;
    var b = e.target.closest(".decide button");
    if (b) { choose(n, b.dataset.c); return; }
    var cp = e.target.closest("[data-copy]");
    if (cp) {
      book[n].t = cp.dataset.copy === "antiga" ? POEMS[n].oldTxt : POEMS[n].newTxt;
      saveBook(); var ta = $("textarea", card); ta.value = book[n].t; autosize(ta); ta.focus();
    }
  });
  var saveT;
  poemsEl.addEventListener("input", function (e) {
    if (e.target.tagName !== "TEXTAREA") return;
    var n = e.target.closest(".poem").dataset.n;
    autosize(e.target);
    book[n] = { c: "editada", t: e.target.value };
    clearTimeout(saveT); saveT = setTimeout(saveBook, 300);
  });

  function progress() {
    var done = Object.keys(book).length;
    $("#prog-txt").textContent = done + " / " + ALL.length + " definidos";
    $("#prog-fill").style.width = (100 * done / ALL.length) + "%";
    D.sections.forEach(function (sec) {
      if (!sec.poems.length) return;
      var k = sec.poems.filter(function (p) { return book[p.n]; }).length;
      var t = $('[data-cnt="' + sec.id + '"]'), h = $('[data-cnt-head="' + sec.id + '"]');
      if (t) { t.textContent = k ? k + "/" + sec.poems.length : ""; t.classList.toggle("done", k === sec.poems.length); }
      if (h) h.textContent = k + " de " + sec.poems.length + " definidos";
    });
  }

  ALL.forEach(function (p) { paint(p.n); });
  progress();

  // ---------- visualização ----------
  var mode = store.get("view", "ambas");
  function setMode(m) {
    mode = m; store.set("view", m);
    document.body.setAttribute("data-mode", m);
    $$(".seg button").forEach(function (b) { b.setAttribute("aria-checked", b.dataset.mode === m); });
  }
  $$(".seg button").forEach(function (b) { b.addEventListener("click", function () { setMode(b.dataset.mode); }); });
  setMode(mode);

  // o romaji é o texto principal; o japonês fica como referência e pode ser ocultado
  var showJp = store.get("jp", "1") === "1";
  function setJp(on) {
    showJp = on; store.set("jp", on ? "1" : "0");
    document.body.classList.toggle("no-jp", !on);
    $("#btn-jp").setAttribute("aria-pressed", on);
  }
  $("#btn-jp").addEventListener("click", function () { setJp(!showJp); });
  setJp(showJp);

  var theme = store.get("theme", "");
  if (theme) document.documentElement.setAttribute("data-theme", theme);
  $("#btn-theme").addEventListener("click", function () {
    var dark = getComputedStyle(document.documentElement).colorScheme.indexOf("dark") > -1;
    theme = dark ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", theme);
    store.set("theme", theme);
  });

  // seção atual destacada no índice
  var tocLinks = {};
  $$("a[data-sec]", tocEl).forEach(function (a) { tocLinks[a.dataset.sec] = a; });
  var current = null;
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        var a = tocLinks[en.target.id];
        if (!a || a === current) return;
        if (current) current.classList.remove("on");
        a.classList.add("on"); current = a;
        var r = a.getBoundingClientRect(), tr = tocEl.getBoundingClientRect();
        if (r.top < tr.top || r.bottom > tr.bottom) a.scrollIntoView({ block: "nearest" });
      });
    }, { rootMargin: "-20% 0px -70% 0px" });
    $$(".sec").forEach(function (s) { io.observe(s); });
  }

  // ---------- busca + filtro ----------
  var norm = function (s) { return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, ""); };
  var index = {};
  ALL.forEach(function (p) { index[p.n] = norm([p.jp, p.ro.join(" "), p.oldTxt, p.newTxt, p.nt ? p.nt.t.join(" ") + " " + p.nt.x : ""].join(" ")); });
  var qEl = $("#q"), filterEl = $("#filter"), filterVal = "all", timer;
  var ntypeEl = $("#ntype"), ntypeVal = "all";
  ntypeEl.innerHTML = '<option value="all">Todas as notas</option><option value="any">Só poemas com nota</option>' +
    D.note_types.map(function (t) { return '<option value="' + esc(t) + '">Nota: ' + esc(t) + "</option>"; }).join("") +
    '<option value="none">Sem nota</option>';
  ntypeEl.addEventListener("change", function () { ntypeVal = ntypeEl.value; applyFilter(); });
  qEl.addEventListener("input", function () { clearTimeout(timer); timer = setTimeout(applyFilter, 120); });
  qEl.addEventListener("keydown", function (e) {
    if (e.key === "Enter" && /^\d+$/.test(qEl.value.trim())) { e.preventDefault(); go(+qEl.value.trim()); }
    if (e.key === "Escape") { qEl.value = ""; applyFilter(); }
  });
  filterEl.addEventListener("change", function () { filterVal = filterEl.value; applyFilter(); });

  function applyFilter() {
    var q = norm(qEl.value.trim()), any = false, isNum = /^\d+$/.test(q);
    var active = !!q || filterVal !== "all" || ntypeVal !== "all";
    ALL.forEach(function (p) {
      var hit = !q || (isNum ? String(p.n) === q : index[p.n].indexOf(q) > -1);
      if (hit && filterVal !== "all") {
        var ch = book[p.n] ? book[p.n].c : "";
        hit = filterVal === "pending" ? !ch : ch === filterVal;
      }
      if (hit && ntypeVal !== "all") {
        hit = ntypeVal === "any" ? !!p.nt : ntypeVal === "none" ? !p.nt : !!p.nt && p.nt.t.indexOf(ntypeVal) > -1;
      }
      cards[p.n].hidden = !hit; any = any || hit;
    });
    $$(".sec").forEach(function (s) { s.hidden = active && !$(".poem:not([hidden])", s); });
    $$(".sec-div").forEach(function (s) { s.hidden = active; });
    $(".hero").hidden = active;
    $("#empty").hidden = any;
  }
  function go(n) {
    var el = cards[n];
    if (!el) return;
    if (el.hidden) { qEl.value = ""; filterEl.value = filterVal = "all"; ntypeEl.value = ntypeVal = "all"; applyFilter(); }
    el.scrollIntoView({ block: "start" });
    el.classList.remove("flash"); void el.offsetWidth; el.classList.add("flash");
  }
  window.addEventListener("hashchange", function () {
    var m = location.hash.match(/^#p(\d+)$/); if (m) go(+m[1]);
  });
  var m0 = location.hash.match(/^#p(\d+)$/);
  if (m0) setTimeout(function () { go(+m0[1]); }, 50);

  // ---------- exportar / importar ----------
  function download(name, text, type) {
    var url = URL.createObjectURL(new Blob([text], { type: type }));
    var a = document.createElement("a");
    a.href = url; a.download = name; document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(url); a.remove(); }, 500);
  }
  function stamp() { return new Date().toISOString().slice(0, 10); }
  function textFor(p) {
    var b = book[p.n];
    if (!b) return null;
    return b.c === "antiga" ? p.oldTxt : b.c === "editada" ? (b.t || "").trim() : p.newTxt;
  }

  $("#exp-md").addEventListener("click", function () {
    var out = ["# " + D.title_jp + " — Livro de Oração", "", "_" + D.title_pt + " · rascunho gerado em " + stamp() + "_", ""];
    var pend = 0;
    D.sections.forEach(function (sec) {
      if (!sec.poems.length) { if (!sec.intro) out.push("", "---", "", "# " + sec.jp + " — " + sec.pt, ""); return; }
      out.push("", "## " + sec.jp + " — " + sec.pt, "");
      sec.poems.forEach(function (p) {
        var t = textFor(p), src = book[p.n] ? book[p.n].c : "";
        if (t === null) { pend++; t = p.newTxt; src = "pendente — fiel provisória"; }
        out.push("### " + p.n + (p.mk ? " " + p.mk.replace(/\*/g, "\\*") : "") + "  ·  _" + src + "_", "",
          p.ro.map(function (l) { return "*" + l + "*"; }).join("  \n"), "", p.jp.replace(/[\s　]+/g, "　"), "",
          t.split("\n").map(function (l) { return l.trim(); }).filter(Boolean).join("  \n"), "");
        if (p.nt) out.push("> **Nota de tradução (" + p.nt.t.join(", ") + "):** " + p.nt.x, "");
      });
    });
    if (pend) out.splice(4, 0, "> " + pend + " poema(s) ainda sem escolha — incluídos com a tradução fiel provisória.", "");
    download("Livro_de_Oracao_Gosanka_" + stamp() + ".md", out.join("\n"), "text/markdown;charset=utf-8");
    $(".menu").open = false;
  });

  $("#exp-json").addEventListener("click", function () {
    download("gosanka_escolhas_" + stamp() + ".json",
      JSON.stringify({ app: "gosanka-livro", version: 1, date: stamp(), book: book }, null, 1), "application/json");
    $(".menu").open = false;
  });

  $("#imp-json").addEventListener("change", function (e) {
    var f = e.target.files[0]; if (!f) return;
    f.text().then(function (txt) {
      var data = JSON.parse(txt);
      var nb = data && data.book;
      if (!nb || typeof nb !== "object") throw new Error("formato");
      var clean = {};
      Object.keys(nb).forEach(function (k) {
        var v = nb[k];
        if (POEMS[k] && v && /^(fiel|antiga|editada)$/.test(v.c)) clean[k] = v.t ? { c: v.c, t: String(v.t) } : { c: v.c };
      });
      var n = Object.keys(clean).length;
      if (!confirm("Importar " + n + " escolha(s)? As escolhas atuais deste navegador serão substituídas.")) return;
      book = clean; saveBook();
      ALL.forEach(function (p) { paint(p.n); }); progress(); applyFilter();
    }).catch(function () { alert("Não foi possível ler este arquivo de backup."); })
      .then(function () { e.target.value = ""; $(".menu").open = false; });
  });
  document.addEventListener("click", function (e) {
    var m = $(".menu"); if (m.open && !m.contains(e.target)) m.open = false;
  });
})();
