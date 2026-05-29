// ========================================
// Main Page — Birthday Girl's View
// ========================================

(function () {
  "use strict";

  var BIRTHDAY = new Date(2026, 7, 2); // Aug 2, 2026 (month is 0-indexed)
  var TOTAL_SLOTS = 19;

  var countdownEl = document.getElementById("countdown");
  var cdGridEl = document.getElementById("cd-grid");
  var lockedGridEl = document.getElementById("locked-grid");
  var modalEl = document.getElementById("modal");

  // --- Countdown Timer ---

  function updateCountdown() {
    var now = new Date();
    var diff = BIRTHDAY - now;

    if (diff <= 0) {
      countdownEl.classList.add("countdown--done");
      document.getElementById("countdown-days").textContent = "00";
      document.getElementById("countdown-hours").textContent = "00";
      document.getElementById("countdown-mins").textContent = "00";
      document.getElementById("countdown-secs").textContent = "00";
      unlockAlbums();
      return;
    }

    var days = Math.floor(diff / (1000 * 60 * 60 * 24));
    var hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    var mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    var secs = Math.floor((diff % (1000 * 60)) / 1000);

    document.getElementById("countdown-days").textContent = pad(days);
    document.getElementById("countdown-hours").textContent = pad(hours);
    document.getElementById("countdown-mins").textContent = pad(mins);
    document.getElementById("countdown-secs").textContent = pad(secs);
  }

  function pad(n) {
    return n < 10 ? "0" + n : String(n);
  }

  // --- Locked Grid (before birthday) ---

  function renderLockedGrid() {
    var html = "";
    for (var i = 0; i < TOTAL_SLOTS; i++) {
      html +=
        '<div class="cd-case cd-case--locked">' +
          '<div class="cd-case__spine"></div>' +
          '<span class="cd-case__question">?</span>' +
          '<span class="cd-case__placeholder-text">album ' + (i + 1) + '</span>' +
        '</div>';
    }
    lockedGridEl.innerHTML = html;
  }

  // --- Unlocked Albums ---

  function unlockAlbums() {
    lockedGridEl.style.display = "none";
    cdGridEl.style.display = "grid";

    if (typeof supabaseClient === "undefined") {
      renderDemoAlbums();
      return;
    }

    getLetters()
      .then(function (letters) {
        renderAlbums(letters);
      })
      .catch(function (err) {
        console.error("Failed to load letters:", err);
        renderDemoAlbums();
      });
  }

  function renderDemoAlbums() {
    // Demo mode — shows placeholder albums when Firebase isn't configured
    var placeholders = [];
    for (var i = 0; i < TOTAL_SLOTS; i++) {
      placeholders.push({
        id: "demo-" + i,
        name: "Demo " + (i + 1),
        message: "This is a demo letter. Configure Supabase to see real letters!",
        songTitle: "Demo Song",
        songArtist: "Demo Artist",
        songUrl: "",
        photoUrl: "",
        relationship: "Friend"
      });
    }
    renderAlbums(placeholders);
  }

  function renderAlbums(letters) {
    var html = "";

    for (var i = 0; i < TOTAL_SLOTS; i++) {
      if (i < letters.length) {
        var letter = letters[i];
        html += renderCdCase(letter, i);
      } else {
        html += renderEmptySlot(i);
      }
    }

    cdGridEl.innerHTML = html;

    // Attach click handlers
    var cases = cdGridEl.querySelectorAll(".cd-case:not(.cd-case--empty)");
    for (var j = 0; j < cases.length; j++) {
      cases[j].addEventListener("click", makeClickHandler(letters[j]));
    }
  }

  function renderCdCase(letter, index) {
    var photoHtml = letter.photoUrl
      ? '<img class="cd-case__art" src="' + escapeHtml(letter.photoUrl) + '" alt="" loading="lazy">'
      : '<div class="cd-case__art" style="background:linear-gradient(135deg, #2a2a40, #1a1a2e);display:flex;align-items:center;justify-content:center;font-size:2rem;color:#3a3a50;">&#9835;</div>';

    return (
      '<div class="cd-case" data-index="' + index + '">' +
        '<div class="cd-case__spine"></div>' +
        photoHtml +
        '<div class="cd-case__gloss"></div>' +
        '<div class="cd-case__info">' +
          '<div class="cd-case__name">' + escapeHtml(letter.name) + '</div>' +
          '<div class="cd-case__song">' + escapeHtml(letter.songTitle) + '</div>' +
        '</div>' +
      '</div>'
    );
  }

  function renderEmptySlot(index) {
    return (
      '<div class="cd-case cd-case--empty" style="opacity:0.3;cursor:default;">' +
        '<div class="cd-case__spine"></div>' +
        '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#3a3a50;font-size:1.5rem;">?</div>' +
        '<div class="cd-case__gloss" style="opacity:0.3;"></div>' +
      '</div>'
    );
  }

  function makeClickHandler(letter) {
    return function () {
      openModal(letter);
    };
  }

  // --- Modal ---

  function openModal(letter) {
    document.getElementById("modal-photo").src = letter.photoUrl || "";
    document.getElementById("modal-photo").style.display = letter.photoUrl ? "block" : "none";
    document.getElementById("modal-name").textContent = letter.name;
    document.getElementById("modal-relationship").textContent = letter.relationship || "";
    document.getElementById("modal-message").textContent = letter.message;
    document.getElementById("modal-song-title").textContent = letter.songTitle || "";
    document.getElementById("modal-song-artist").textContent = letter.songArtist || "";

    var songLink = document.getElementById("modal-song-link");
    if (letter.songUrl) {
      songLink.href = letter.songUrl;
      songLink.style.display = "inline-block";
    } else {
      songLink.style.display = "none";
    }

    renderPlayer(letter.songUrl);

    // Reset scroll position
    var content = modalEl.querySelector(".modal__content");
    if (content) content.scrollTop = 0;

    modalEl.classList.add("modal--open");
    document.body.style.overflow = "hidden";
  }

  function renderPlayer(url) {
    var playerEl = document.getElementById("modal-player");
    playerEl.innerHTML = "";

    if (!url) return;

    // YouTube
    var ytId = parseYouTubeId(url);
    if (ytId) {
      playerEl.innerHTML =
        '<div class="player-wrapper">' +
          '<iframe src="https://www.youtube.com/embed/' + ytId + '" ' +
            'frameborder="0" allow="autoplay; encrypted-media" allowfullscreen ' +
            'class="player-iframe">' +
          '</iframe>' +
        '</div>';
      return;
    }

    // Spotify
    var spotifyUri = parseSpotifyUri(url);
    if (spotifyUri) {
      playerEl.innerHTML =
        '<div class="player-wrapper player-wrapper--spotify">' +
          '<iframe src="https://open.spotify.com/embed/' + spotifyUri + '" ' +
            'frameborder="0" allowtransparency="true" allow="encrypted-media" ' +
            'class="player-iframe player-iframe--spotify">' +
          '</iframe>' +
        '</div>';
    }
  }

  function parseYouTubeId(url) {
    var match;
    // youtu.be/VIDEO_ID
    match = url.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
    if (match) return match[1];
    // youtube.com/watch?v=VIDEO_ID
    match = url.match(/youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/);
    if (match) return match[1];
    // youtube.com/embed/VIDEO_ID
    match = url.match(/youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/);
    if (match) return match[1];
    // m.youtube.com/watch?v=VIDEO_ID
    match = url.match(/m\.youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/);
    if (match) return match[1];
    return null;
  }

  function parseSpotifyUri(url) {
    var match;
    // open.spotify.com/track/ID
    match = url.match(/open\.spotify\.com\/track\/([a-zA-Z0-9]+)/);
    if (match) return "track/" + match[1];
    // open.spotify.com/album/ID
    match = url.match(/open\.spotify\.com\/album\/([a-zA-Z0-9]+)/);
    if (match) return "album/" + match[1];
    return null;
  }

  function closeModal() {
    modalEl.classList.remove("modal--open");
    document.body.style.overflow = "";
  }

  // --- Event Listeners ---

  modalEl.querySelector(".modal__overlay").addEventListener("click", closeModal);
  modalEl.querySelector(".modal__close").addEventListener("click", closeModal);

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && modalEl.classList.contains("modal--open")) {
      closeModal();
    }
  });

  // --- Init ---

  function init() {
    var now = new Date();
    if (now >= BIRTHDAY) {
      // Birthday or after — show albums
      countdownEl.style.display = "none";
      lockedGridEl.style.display = "none";
      cdGridEl.style.display = "grid";

      if (typeof supabaseClient !== "undefined") {
        getLetters()
          .then(function (letters) {
            renderAlbums(letters);
          })
          .catch(function () {
            renderDemoAlbums();
          });
      } else {
        renderDemoAlbums();
      }
    } else {
      // Before birthday — show countdown + locked grid
      renderLockedGrid();
      updateCountdown();
      setInterval(updateCountdown, 1000);
    }
  }

  // --- Utility ---

  function escapeHtml(str) {
    var div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  init();
})();
