/* TGS motion layer. Load after main.js. Adds entrance, scroll and
   interaction animation on top of the existing page. Does nothing
   when the visitor has "reduce motion" turned on. */
(function () {
  "use strict";

  var root = document.documentElement;
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
  if (reduce.matches) {
    root.classList.remove("motion-ok");
    return;
  }
  root.classList.add("motion-ok");

  function $(sel, ctx) { return (ctx || document).querySelector(sel); }
  function $$(sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); }

  /* ---------- Hero: split the wordmark into letters ---------- */
  var wordmark = $(".wordmark-hero");
  if (wordmark) {
    var i = 0;
    Array.prototype.slice.call(wordmark.childNodes).forEach(function (node) {
      if (node.nodeType !== 3 || !node.textContent.trim()) { return; }
      var frag = document.createDocumentFragment();
      var holder = document.createElement("span");
      holder.setAttribute("aria-hidden", "true");
      node.textContent.split("").forEach(function (ch) {
        var s = document.createElement("span");
        s.className = "tgs-letter";
        s.style.setProperty("--i", i++);
        s.textContent = ch;
        holder.appendChild(s);
      });
      frag.appendChild(holder);
      var label = document.createElement("span");
      label.className = "visually-hidden";
      label.textContent = node.textContent;
      frag.appendChild(label);
      wordmark.replaceChild(frag, node);
    });
    wordmark.classList.add("is-split");
  }

  /* Beating heart after the tagline */
  var tagline = $(".hero .tagline");
  if (tagline) {
    Array.prototype.slice.call(tagline.childNodes).forEach(function (node) {
      if (node.nodeType === 3 && node.textContent.indexOf("🤎") !== -1) {
        var parts = node.textContent.split("🤎");
        var frag = document.createDocumentFragment();
        frag.appendChild(document.createTextNode(parts[0]));
        var heart = document.createElement("span");
        heart.className = "tgs-heart";
        heart.textContent = "🤎";
        frag.appendChild(heart);
        frag.appendChild(document.createTextNode(parts.slice(1).join("🤎")));
        tagline.replaceChild(frag, node);
      }
    });
  }

  /* Price ticket: settle after the stamp, crumbs on click */
  var ticket = $(".price-ticket");
  if (ticket) {
    var settle = function () { ticket.classList.add("is-stamped"); };
    ticket.addEventListener("animationend", function (e) {
      if (e.animationName === "tgs-stamp") { settle(); }
    });
    setTimeout(settle, 2200); // safety net
    var colors = ["#4a3426", "#c4923a", "#f5c55a", "#7a5236"];
    ticket.addEventListener("click", function (e) {
      var box = ticket.getBoundingClientRect();
      var x = e.clientX || box.left + box.width / 2;
      var y = e.clientY || box.top + box.height / 2;
      for (var n = 0; n < 14; n++) {
        var c = document.createElement("span");
        var angle = Math.random() * Math.PI * 2;
        var dist = 40 + Math.random() * 70;
        c.className = "tgs-crumb";
        c.style.left = x + "px";
        c.style.top = y + "px";
        c.style.setProperty("--dx", Math.cos(angle) * dist + "px");
        c.style.setProperty("--dy", Math.sin(angle) * dist + 30 + "px");
        c.style.setProperty("--rot", (Math.random() * 360 - 180) + "deg");
        c.style.setProperty("--size", (5 + Math.random() * 7) + "px");
        c.style.setProperty("--c", colors[n % colors.length]);
        c.setAttribute("aria-hidden", "true");
        c.addEventListener("animationend", function () { this.remove(); });
        document.body.appendChild(c);
      }
    });
  }

  /* ---------- Scroll reveals ---------- */
  var groups = [
    { sel: ".tan-layout > figure", mode: "left" },
    { sel: ".tan-layout > div", mode: "right" },
    { sel: "main .section:not(.hero) > .wrap > .kicker" },
    { sel: "main .section:not(.hero) > .wrap > h2" },
    { sel: "main .section:not(.hero) > .wrap > .lede" },
    { sel: ".featured-heading" },
    { sel: ".flavor-card", stagger: true },
    { sel: ".compare-note", mode: "zoom" },
    { sel: ".bundle-featured", mode: "zoom" },
    { sel: ".est-grid > .card", stagger: true },
    { sel: ".store-card", stagger: true },
    { sel: ".map-figure", mode: "zoom" },
    { sel: ".closed-banner", mode: "zoom" },
    { sel: ".order-layout > *", stagger: true },
    { sel: ".event", stagger: true },
    { sel: ".career-card", stagger: true },
    { sel: ".past-list" }
  ];

  var targets = [];
  groups.forEach(function (g) {
    var seen = new Map();
    $$(g.sel).forEach(function (el) {
      if (el.hasAttribute("data-reveal")) { return; }
      el.setAttribute("data-reveal", g.mode || "up");
      if (g.stagger) {
        var parent = el.parentElement;
        var idx = seen.get(parent) || 0;
        el.style.setProperty("--stagger", Math.min(idx, 5));
        seen.set(parent, idx + 1);
      }
      targets.push(el);
    });
  });

  function finishReveal(el) {
    var stagger = Number(el.style.getPropertyValue("--stagger")) || 0;
    setTimeout(function () {
      el.removeAttribute("data-reveal");
      el.classList.remove("is-visible");
      el.style.removeProperty("--stagger");
    }, 800 + stagger * 90);
  }

  var rules = $$(".rule");

  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) { return; }
        var el = entry.target;
        io.unobserve(el);
        // The carousel reveals all its cards at once, so cards that are
        // scrolled sideways out of view never get stuck hidden.
        var batch = el.classList.contains("flavor-carousel")
          ? $$("[data-reveal]", el)
          : [el];
        batch.forEach(function (item) {
          item.classList.add("is-visible");
          if (item.hasAttribute("data-reveal")) { finishReveal(item); }
        });
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.12 });
    targets.filter(function (el) { return !el.closest(".flavor-carousel"); })
      .concat(rules, $$(".flavor-carousel"))
      .forEach(function (el) { io.observe(el); });
  } else {
    targets.forEach(function (el) { el.removeAttribute("data-reveal"); });
    rules.forEach(function (el) { el.classList.add("is-visible"); });
  }

  /* ---------- Header: shadow, progress bar, current section ---------- */
  var navBar = $(".nav-bar");
  var bar = null;
  if (navBar) {
    bar = document.createElement("span");
    bar.className = "tgs-progress";
    bar.setAttribute("aria-hidden", "true");
    navBar.appendChild(bar);
  }

  var ticking = false;
  function onScroll() {
    if (ticking) { return; }
    ticking = true;
    requestAnimationFrame(function () {
      var y = window.scrollY || window.pageYOffset;
      root.classList.toggle("is-scrolled", y > 8);
      if (bar) {
        var max = document.documentElement.scrollHeight - window.innerHeight;
        bar.style.setProperty("--progress", max > 0 ? Math.min(1, y / max) : 0);
      }
      ticking = false;
    });
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll);
  onScroll();

  var navLinks = $$(".nav-links a[href^='#']");
  navLinks.forEach(function (a, n) {
    if (a.parentElement) { a.parentElement.style.setProperty("--i", n); }
  });

  if ("IntersectionObserver" in window && navLinks.length) {
    var byId = {};
    navLinks.forEach(function (a) { byId[a.getAttribute("href").slice(1)] = a; });
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) { return; }
        navLinks.forEach(function (a) { a.removeAttribute("aria-current"); });
        var link = byId[entry.target.id];
        if (link) { link.setAttribute("aria-current", "location"); }
      });
    }, { rootMargin: "-45% 0px -50% 0px" });
    Object.keys(byId).forEach(function (id) {
      var section = document.getElementById(id);
      if (section) { spy.observe(section); }
    });
    var hero = $(".hero");
    if (hero) {
      new IntersectionObserver(function (entries) {
        if (entries[0].isIntersecting) {
          navLinks.forEach(function (a) { a.removeAttribute("aria-current"); });
        }
      }, { rootMargin: "-45% 0px -50% 0px" }).observe(hero);
    }
  }

  /* ---------- Flavor list cascade ---------- */
  $$("#all-flavors .flavor").forEach(function (el, n) {
    el.style.setProperty("--i", Math.min(n, 20));
  });

  /* ---------- Counter: count to the new number ---------- */
  function replay(el, cls) {
    el.classList.remove(cls);
    void el.offsetWidth;
    el.classList.add(cls);
  }

  var num = $("#capacity-num");
  if (num && "MutationObserver" in window) {
    var shown = Number(num.textContent) || 0;
    var animating = false;
    var counterObs = new MutationObserver(function () {
      if (animating) { return; }
      var target = Number(num.textContent);
      if (!isFinite(target) || target === shown || document.hidden) { shown = target; return; }
      var from = shown;
      var start = null;
      var dur = 600;
      animating = true;
      replay(num, "is-bumping");
      function step(ts) {
        if (start === null) { start = ts; }
        var p = Math.min(1, (ts - start) / dur);
        var eased = 1 - Math.pow(1 - p, 3);
        num.textContent = String(Math.round(from + (target - from) * eased));
        if (p < 1) {
          requestAnimationFrame(step);
        } else {
          num.textContent = String(target);
          shown = target;
          // let this last write's mutation record go by before listening again
          setTimeout(function () { animating = false; }, 0);
        }
      }
      requestAnimationFrame(step);
    });
    counterObs.observe(num, { childList: true, characterData: true, subtree: true });
  }

  /* Estimate and form messages slide in when they change */
  ["#box-estimate", "#preorder-status", "#wholesale-status"].forEach(function (sel) {
    var el = $(sel);
    if (!el || !("MutationObserver" in window)) { return; }
    new MutationObserver(function () {
      if (el.textContent.trim()) { replay(el, "is-updating"); }
    }).observe(el, { childList: true, characterData: true, subtree: true });
  });

  /* If the visitor turns on reduce motion mid-visit, stop everything */
  var stop = function (e) {
    if (e.matches) {
      root.classList.remove("motion-ok");
      $$("[data-reveal]").forEach(function (el) { el.removeAttribute("data-reveal"); });
      if (bar) { bar.remove(); }
    }
  };
  if (reduce.addEventListener) { reduce.addEventListener("change", stop); }
  else if (reduce.addListener) { reduce.addListener(stop); }
})();
