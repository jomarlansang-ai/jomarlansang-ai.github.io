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

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && navToggle.getAttribute("aria-expanded") === "true") {
        setNavOpen(false);
        navToggle.focus();
      }
    });
  }
})();
