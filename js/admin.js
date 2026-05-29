// ========================================
// Admin Panel — Manage Letters
// ========================================

(function () {
  "use strict";

  var ADMIN_PASSWORD = "admin2026"; // CHANGE THIS
  var TOTAL_SLOTS = 19;

  var gate = document.getElementById("admin-gate");
  var app = document.getElementById("admin-app");
  var passwordInput = document.getElementById("admin-password-input");
  var passwordSubmit = document.getElementById("admin-password-submit");
  var passwordError = document.getElementById("admin-password-error");

  var confirmModal = document.getElementById("confirm-modal");
  var confirmName = document.getElementById("confirm-name");
  var confirmDeleteBtn = document.getElementById("confirm-delete-btn");
  var confirmCancelBtn = document.getElementById("confirm-cancel-btn");
  var pendingDeleteId = null;

  // --- Password Gate ---

  if (sessionStorage.getItem("admin-auth") === "true") {
    showApp();
  }

  passwordSubmit.addEventListener("click", function () {
    if (passwordInput.value === ADMIN_PASSWORD) {
      sessionStorage.setItem("admin-auth", "true");
      showApp();
    } else {
      passwordError.style.display = "block";
      passwordInput.value = "";
      passwordInput.focus();
    }
  });

  passwordInput.addEventListener("keydown", function (e) {
    if (e.key === "Enter") passwordSubmit.click();
  });

  function showApp() {
    gate.style.display = "none";
    app.style.display = "block";
    loadData();
  }

  // --- Load & Render ---

  function loadData() {
    if (typeof supabaseClient === "undefined") {
      document.getElementById("admin-empty").style.display = "block";
      document.getElementById("admin-empty").textContent =
        "Supabase not connected. Check your configuration.";
      return;
    }

    getLetters()
      .then(function (letters) {
        renderStats(letters);
        renderTable(letters);
      })
      .catch(function (err) {
        console.error("Failed to load letters:", err);
        document.getElementById("admin-empty").style.display = "block";
        document.getElementById("admin-empty").textContent =
          "Failed to load letters. Check the console for details.";
      });
  }

  // --- Stats ---

  function renderStats(letters) {
    var withPhotos = letters.filter(function (l) {
      return l.photoUrls && l.photoUrls.length > 0;
    }).length;
    var withAudio = letters.filter(function (l) {
      return l.audioUrl;
    }).length;
    var remaining = TOTAL_SLOTS - letters.length;

    var html =
      '<div class="stat-card">' +
        '<div class="stat-card__number">' + letters.length + '</div>' +
        '<div class="stat-card__label">Letters Placed</div>' +
      '</div>' +
      '<div class="stat-card">' +
        '<div class="stat-card__number">' + remaining + '</div>' +
        '<div class="stat-card__label">Slots Remaining</div>' +
      '</div>' +
      '<div class="stat-card">' +
        '<div class="stat-card__number">' + withPhotos + '</div>' +
        '<div class="stat-card__label">With Photos</div>' +
      '</div>' +
      '<div class="stat-card">' +
        '<div class="stat-card__number">' + withAudio + '</div>' +
        '<div class="stat-card__label">With Voice Notes</div>' +
      '</div>';

    document.getElementById("admin-stats").innerHTML = html;
  }

  // --- Table ---

  function renderTable(letters) {
    var tbody = document.getElementById("letters-tbody");
    var empty = document.getElementById("admin-empty");

    if (letters.length === 0) {
      tbody.innerHTML = "";
      empty.style.display = "block";
      return;
    }

    empty.style.display = "none";
    var html = "";

    for (var i = 0; i < letters.length; i++) {
      var l = letters[i];
      var photoCount = l.photoUrls ? l.photoUrls.length : 0;
      var hasAudio = l.audioUrl ? "🎙️" : "—";
      var date = l.createdAt
        ? new Date(l.createdAt).toLocaleDateString("en-US", {
            month: "short", day: "numeric", hour: "2-digit", minute: "2-digit"
          })
        : "—";

      html +=
        '<tr class="letter-row" data-id="' + l.id + '">' +
          '<td>' + (i + 1) + '</td>' +
          '<td class="letter-name">' + esc(l.name) + '</td>' +
          '<td>' + esc(l.relationship) + '</td>' +
          '<td class="letter-song">' + esc(l.songTitle) +
            (l.songArtist ? ' <span class="text-muted">by ' + esc(l.songArtist) + '</span>' : '') +
          '</td>' +
          '<td>' + (photoCount > 0 ? photoCount + ' 📸' : '—') + '</td>' +
          '<td>' + hasAudio + '</td>' +
          '<td class="text-muted">' + date + '</td>' +
          '<td><button class="btn--icon delete-btn" data-id="' + l.id + '" data-name="' + escAttr(l.name) + '">🗑️</button></td>' +
        '</tr>' +
        '<tr class="letter-detail" id="detail-' + l.id + '" style="display:none;">' +
          '<td colspan="8">' +
            '<div class="letter-detail__content">' +
              '<div class="letter-detail__message">' + esc(l.message) + '</div>' +
              (l.songUrl
                ? '<div class="letter-detail__meta">🔗 <a href="' + escAttr(l.songUrl) + '" target="_blank">' + esc(l.songUrl) + '</a></div>'
                : '') +
              (l.photoUrls && l.photoUrls.length > 0
                ? '<div class="letter-detail__meta">📸 ' + l.photoUrls.length + ' photo(s)</div>'
                : '') +
              (l.audioUrl
                ? '<div class="letter-detail__meta">🎙️ Voice note: <audio controls src="' + escAttr(l.audioUrl) + '" style="height:28px;margin-top:0.25rem;"></audio></div>'
                : '') +
            '</div>' +
          '</td>' +
        '</tr>';
    }

    tbody.innerHTML = html;

    // Click row to expand
    var rows = tbody.querySelectorAll(".letter-row");
    for (var r = 0; r < rows.length; r++) {
      rows[r].addEventListener("click", function () {
        var detail = document.getElementById("detail-" + this.getAttribute("data-id"));
        if (detail) {
          detail.style.display = detail.style.display === "none" ? "" : "none";
        }
      });
    }

    // Delete buttons
    var delBtns = tbody.querySelectorAll(".delete-btn");
    for (var d = 0; d < delBtns.length; d++) {
      delBtns[d].addEventListener("click", function (e) {
        e.stopPropagation();
        pendingDeleteId = this.getAttribute("data-id");
        confirmName.textContent = this.getAttribute("data-name");
        confirmModal.style.display = "block";
      });
    }
  }

  // --- Delete ---

  function deleteLetter(id) {
    if (typeof supabaseClient === "undefined") return;

    supabaseClient.from("letters").delete().eq("id", id).then(function (result) {
      if (result.error) {
        alert("Failed to delete: " + result.error.message);
        return;
      }
      loadData();
    });
  }

  confirmDeleteBtn.addEventListener("click", function () {
    if (pendingDeleteId) {
      deleteLetter(pendingDeleteId);
      pendingDeleteId = null;
      confirmModal.style.display = "none";
    }
  });

  confirmCancelBtn.addEventListener("click", function () {
    pendingDeleteId = null;
    confirmModal.style.display = "none";
  });

  confirmModal.querySelector(".modal__overlay").addEventListener("click", function () {
    pendingDeleteId = null;
    confirmModal.style.display = "none";
  });

  // --- Actions ---

  document.getElementById("btn-refresh").addEventListener("click", loadData);

  document.getElementById("btn-copy-reminder").addEventListener("click", function () {
    var msg =
      "Hi! 🎂\n\n" +
      "We're putting together a surprise birthday album for İrem's 19th birthday (August 2nd). " +
      "We'd love for you to be part of it!\n\n" +
      "Just go to this link: https://enfesenes.github.io/birthday-albums/upload.html\n" +
      "Password: birthday2026\n\n" +
      "You can upload a photo, write a letter, and pick a song that reminds you of her. " +
      "It only takes a few minutes and it'll mean the world to her. 💛\n\n" +
      "There are only " + TOTAL_SLOTS + " slots, so please submit soon!\n\n" +
      "Thank you! 🐴";

    navigator.clipboard.writeText(msg).then(function () {
      var btn = document.getElementById("btn-copy-reminder");
      btn.textContent = "✅ Copied!";
      setTimeout(function () { btn.textContent = "📋 Copy Reminder Message"; }, 2000);
    }).catch(function () {
      alert("Couldn't copy automatically. Here's the message:\n\n" + msg);
    });
  });

  document.getElementById("btn-export").addEventListener("click", function () {
    if (typeof supabaseClient === "undefined") return;

    getLetters().then(function (letters) {
      var text = "İrem's Birthday Album — All Letters\n";
      text += "=================================\n\n";

      for (var i = 0; i < letters.length; i++) {
        var l = letters[i];
        text += "--- Letter " + (i + 1) + " ---\n";
        text += "From: " + l.name + " (" + l.relationship + ")\n";
        text += "Song: " + l.songTitle + " by " + l.songArtist + "\n";
        if (l.songUrl) text += "Link: " + l.songUrl + "\n";
        text += "Photos: " + (l.photoUrls ? l.photoUrls.length : 0) + "\n";
        if (l.audioUrl) text += "Voice note: " + l.audioUrl + "\n";
        text += "\n" + l.message + "\n\n\n";
      }

      var blob = new Blob([text], { type: "text/plain" });
      var a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "irem-birthday-letters.txt";
      a.click();
      URL.revokeObjectURL(a.href);
    }).catch(function () {
      alert("Failed to export. Try again.");
    });
  });

  // --- Helpers ---

  function esc(str) {
    if (!str) return "";
    var div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  function escAttr(str) {
    if (!str) return "";
    return str.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }
})();
