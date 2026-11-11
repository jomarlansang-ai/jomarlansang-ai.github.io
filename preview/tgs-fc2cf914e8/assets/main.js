(function () {
  "use strict";

  var WEEKLY_CAP = 200;
  var UNIT_PRICE = 130;
  var STORAGE_KEY = "tgs-demo-cookies-remaining";

  var counter = document.getElementById("capacity-counter");
  var counterNum = document.getElementById("capacity-num");
  var resetButton = document.getElementById("reset-counter");
  var preorderForm = document.getElementById("preorder-form");
  var wholesaleForm = document.getElementById("wholesale-form");
  var estimate = document.getElementById("box-estimate");
  var navToggle = document.querySelector(".nav-toggle");
  var navLinks = document.getElementById("nav-links");
  var navBackdrop = document.getElementById("nav-backdrop");

  function peso(amount) {
    return "₱" + String(amount).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  }

  function readRemaining() {
    try {
      var raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw === null) {
        return WEEKLY_CAP;
      }
      var value = Number(raw);
      if (!Number.isInteger(value) || value < 0 || value > WEEKLY_CAP) {
        return WEEKLY_CAP;
      }
      return value;
    } catch (err) {
      return WEEKLY_CAP;
    }
  }

  function writeRemaining(value) {
    try {
      window.localStorage.setItem(STORAGE_KEY, String(value));
    } catch (err) {
      /* Private mode can block storage. The on-screen number still updates. */
    }
  }

  function renderRemaining(value) {
    if (!counter || !counterNum) {
      return;
    }
    counterNum.textContent = String(value);
    counter.setAttribute("data-remaining", String(value));
  }

  var remaining = readRemaining();
  renderRemaining(remaining);

  if (resetButton) {
    resetButton.addEventListener("click", function () {
      remaining = WEEKLY_CAP;
      writeRemaining(remaining);
      renderRemaining(remaining);
    });
  }

  function checkedValue(form, name) {
    var field = form.querySelector('input[name="' + name + '"]:checked');
    return field ? field.value : "";
  }

  function updateEstimate() {
    if (!estimate || !preorderForm) {
      return;
    }
    var size = Number(checkedValue(preorderForm, "box"));
    if (!size) {
      estimate.textContent = "Select a box to see an est. total.";
      return;
    }
    estimate.textContent =
      peso(size * UNIT_PRICE) + " est. for " + size + " cookies, at ₱130 each.";
  }

  function showStatus(id, message) {
    var status = document.getElementById(id);
    if (!status) {
      return;
    }
    status.textContent = message;
  }

  if (preorderForm) {
    preorderForm.addEventListener("change", function (event) {
      if (event.target && event.target.name === "box") {
        updateEstimate();
      }
    });
    updateEstimate();

    preorderForm.addEventListener("submit", function (event) {
      event.preventDefault();
      var missing = [];
      if (!checkedValue(preorderForm, "box")) {
        missing.push("a box size");
      }
      if (!preorderForm.querySelector('input[name="flavor"]:checked')) {
        missing.push("at least one flavor");
      }
      if (!checkedValue(preorderForm, "pickup")) {
        missing.push("Thursday or Friday pickup");
      }
      if (missing.length) {
        showStatus(
          "preorder-status",
          "Demo only, nothing was sent. Add " + missing.join(", ") + "."
        );
        return;
      }

      var size = Number(checkedValue(preorderForm, "box"));
      if (size > remaining) {
        showStatus(
          "preorder-status",
          "Demo only, nothing was sent. That box is larger than the " +
            remaining +
            " cookies left on this demo counter."
        );
        return;
      }

      remaining -= size;
      writeRemaining(remaining);
      renderRemaining(remaining);
      showStatus("preorder-status", "Demo only, nothing was sent.");
    });
  }

  if (wholesaleForm) {
    wholesaleForm.addEventListener("submit", function (event) {
      event.preventDefault();
      var missing = [];
      var name = wholesaleForm.querySelector("#wholesale-name");
      var email = wholesaleForm.querySelector("#wholesale-email");
      var organization = wholesaleForm.querySelector("#wholesale-organization");
      var kind = wholesaleForm.querySelector("#wholesale-kind");
      var message = wholesaleForm.querySelector("#wholesale-message");

      if (!name || !name.value.trim()) {
        missing.push("your name");
      }
      if (!email || !email.value.trim() || email.value.indexOf("@") === -1) {
        missing.push("an email");
      }
      if (!organization || !organization.value.trim()) {
        missing.push("an organization");
      }
      if (!kind || !kind.value) {
        missing.push("wholesale or corporate gifts");
      }
      if (!message || !message.value.trim()) {
        missing.push("a message");
      }

      if (missing.length) {
        showStatus(
          "wholesale-status",
          "Demo only, nothing was sent. Add " + missing.join(", ") + "."
        );
        return;
      }

      showStatus("wholesale-status", "Demo only, nothing was sent.");
    });
  }

  function setNavOpen(open) {
    if (!navToggle || !navLinks) {
      return;
    }
    navToggle.setAttribute("aria-expanded", open ? "true" : "false");
    navLinks.classList.toggle("is-open", open);
    if (navBackdrop) {
      navBackdrop.hidden = !open;
    }
    document.body.style.overflow = open ? "hidden" : "";
  }

  if (navToggle && navLinks) {
    navToggle.addEventListener("click", function () {
      setNavOpen(navToggle.getAttribute("aria-expanded") !== "true");
    });

    navLinks.addEventListener("click", function (event) {
      if (event.target.closest("a")) {
        setNavOpen(false);
      }
    });

    if (navBackdrop) {
      navBackdrop.addEventListener("click", function () {
        setNavOpen(false);
        navToggle.focus();
      });
    }

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && navToggle.getAttribute("aria-expanded") === "true") {
        setNavOpen(false);
        navToggle.focus();
      }
    });
  }

  var seeAll = document.getElementById("see-all-flavors");
  var allFlavors = document.getElementById("all-flavors");
  if (seeAll && allFlavors) {
    seeAll.addEventListener("click", function () {
      var open = seeAll.getAttribute("aria-expanded") === "true";
      seeAll.setAttribute("aria-expanded", open ? "false" : "true");
      allFlavors.hidden = open;
      seeAll.textContent = open ? "See all flavors" : "Hide flavors";
    });
  }

  var carousel = document.getElementById("featured-flavors");
  if (carousel) {
    carousel.addEventListener("keydown", function (event) {
      if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") {
        return;
      }
      var card = carousel.querySelector(".flavor-card");
      var width = card ? card.getBoundingClientRect().width : 240;
      var gap = 12;
      var delta = event.key === "ArrowLeft" ? -(width + gap) : width + gap;
      var motion = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
      carousel.scrollBy({ left: delta, behavior: motion });
      event.preventDefault();
    });
  }

  var stepItems = document.querySelectorAll("#preorder-steps .step");
  var stepPanels = document.querySelectorAll("#preorder-form .step-panel");

  function filledThrough() {
    if (!preorderForm) {
      return 1;
    }
    var box = checkedValue(preorderForm, "box");
    var flavor = preorderForm.querySelector('input[name="flavor"]:checked');
    var pickup = checkedValue(preorderForm, "pickup");
    if (box && flavor && pickup) {
      return 4;
    }
    if (box && flavor) {
      return 3;
    }
    if (box) {
      return 2;
    }
    return 1;
  }

  function paintSteps(current) {
    var reached = filledThrough();
    for (var i = 0; i < stepItems.length; i += 1) {
      var item = stepItems[i];
      var number = Number(item.getAttribute("data-step"));
      var isCurrent = number === current;
      item.classList.toggle("is-current", isCurrent);
      item.classList.toggle("is-done", number < reached);
      if (isCurrent) {
        item.setAttribute("aria-current", "step");
      } else {
        item.removeAttribute("aria-current");
      }
    }
    for (var j = 0; j < stepPanels.length; j += 1) {
      var panel = stepPanels[j];
      panel.classList.toggle("is-current", Number(panel.getAttribute("data-step-panel")) === current);
    }
  }

  if (preorderForm && stepItems.length) {
    paintSteps(1);
    preorderForm.addEventListener("focusin", function (event) {
      var panel = event.target.closest("[data-step-panel]");
      if (!panel) {
        return;
      }
      paintSteps(Number(panel.getAttribute("data-step-panel")));
    });
    preorderForm.addEventListener("change", function () {
      var active = preorderForm.querySelector(".step-panel.is-current");
      var focused = document.activeElement && document.activeElement.closest
        ? document.activeElement.closest("[data-step-panel]")
        : null;
      if (focused && preorderForm.contains(focused)) {
        paintSteps(Number(focused.getAttribute("data-step-panel")));
        return;
      }
      paintSteps(active ? Number(active.getAttribute("data-step-panel")) : filledThrough());
    });
  }
})();
