// ========================================
// Main Page — Birthday Girl's View
// ========================================

(function () {
  "use strict";

  var BIRTHDAY = new Date(2026, 7, 2); // Aug 2, 2026 (month is 0-indexed)
  var TOTAL_SLOTS = 19;

  var SECRET_ALBUM = {
    id: "secret-track",
    name: "Your Secret Admirer",
    relationship: "The one who built this",
    message: "Surprise! You opened all 19 albums... so here's a 20th, just for you.\n\nEvery album here was placed with love, and each one represents someone who thinks the world of you. Happy 19th birthday, İrem — the most highly intelligent horse.\n\n🐴💛",
    songTitle: "Secret Track",
    songArtist: "Just for You",
    songUrl: "",
    photoUrls: [],
    audioUrl: ""
  };

  var OPENED_KEY = "birthday-opened-albums";

  function getOpenedAlbums() {
    try {
      var raw = localStorage.getItem(OPENED_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  }

  function trackOpenedAlbum(id) {
    var opened = getOpenedAlbums();
    if (opened.indexOf(id) === -1) {
      opened.push(id);
      localStorage.setItem(OPENED_KEY, JSON.stringify(opened));
    }
    if (opened.length >= TOTAL_SLOTS) {
      renderSecretAlbum();
    }
  }

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
        photoUrls: [],
        audioUrl: "",
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

    // Check if secret album should be revealed
    if (getOpenedAlbums().length >= TOTAL_SLOTS) {
      renderSecretAlbum();
    }
  }

  function renderCdCase(letter, index) {
    var firstPhoto = letter.photoUrls && letter.photoUrls.length > 0 ? letter.photoUrls[0] : null;
    var photoHtml = firstPhoto
      ? '<img class="cd-case__art" src="' + escapeHtml(firstPhoto) + '" alt="" loading="lazy">'
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

  var currentCarouselIndex = 0;
  var currentPhotoUrls = [];

  function openModal(letter) {
    // Photos carousel
    currentPhotoUrls = letter.photoUrls || [];
    currentCarouselIndex = 0;
    setupCarousel(currentPhotoUrls);

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
    renderAudioPlayer(letter.audioUrl);

    // Reset scroll position
    var content = modalEl.querySelector(".modal__content");
    if (content) content.scrollTop = 0;

    modalEl.classList.add("modal--open");
    document.body.style.overflow = "hidden";

    // Track opened album
    trackOpenedAlbum(letter.id);
  }

  function setupCarousel(photoUrls) {
    var carousel = document.querySelector(".carousel");
    var stageImg = document.getElementById("modal-photo");
    var prevBtn = carousel.querySelector(".carousel__prev");
    var nextBtn = carousel.querySelector(".carousel__next");
    var dotsEl = document.getElementById("carousel-dots");

    if (!photoUrls || photoUrls.length === 0) {
      stageImg.src = "";
      stageImg.style.display = "none";
      prevBtn.style.display = "none";
      nextBtn.style.display = "none";
      dotsEl.innerHTML = "";
      return;
    }

    if (photoUrls.length === 1) {
      stageImg.src = photoUrls[0];
      stageImg.style.display = "block";
      prevBtn.style.display = "none";
      nextBtn.style.display = "none";
      dotsEl.innerHTML = "";
      return;
    }

    // Multiple photos — show controls
    prevBtn.style.display = "";
    nextBtn.style.display = "";
    updateCarouselSlide(0);
    renderCarouselDots(photoUrls, dotsEl);
  }

  function updateCarouselSlide(index) {
    currentCarouselIndex = index;
    var stageImg = document.getElementById("modal-photo");
    stageImg.src = currentPhotoUrls[index];
    stageImg.style.display = "block";
    updateCarouselDots();
  }

  function renderCarouselDots(photoUrls, dotsEl) {
    var html = "";
    for (var i = 0; i < photoUrls.length; i++) {
      html += '<span class="carousel__dot' + (i === currentCarouselIndex ? ' carousel__dot--active' : '') + '" data-index="' + i + '"></span>';
    }
    dotsEl.innerHTML = html;

    var dots = dotsEl.querySelectorAll(".carousel__dot");
    for (var j = 0; j < dots.length; j++) {
      dots[j].addEventListener("click", function () {
        updateCarouselSlide(parseInt(this.getAttribute("data-index")));
      });
    }
  }

  function updateCarouselDots() {
    var dots = document.getElementById("carousel-dots").querySelectorAll(".carousel__dot");
    for (var i = 0; i < dots.length; i++) {
      if (i === currentCarouselIndex) {
        dots[i].classList.add("carousel__dot--active");
      } else {
        dots[i].classList.remove("carousel__dot--active");
      }
    }
  }

  function carouselPrev() {
    if (currentPhotoUrls.length === 0) return;
    var newIndex = currentCarouselIndex === 0 ? currentPhotoUrls.length - 1 : currentCarouselIndex - 1;
    updateCarouselSlide(newIndex);
  }

  function carouselNext() {
    if (currentPhotoUrls.length === 0) return;
    var newIndex = currentCarouselIndex === currentPhotoUrls.length - 1 ? 0 : currentCarouselIndex + 1;
    updateCarouselSlide(newIndex);
  }

  function renderAudioPlayer(audioUrl) {
    var container = document.getElementById("modal-audio-player");
    container.innerHTML = "";

    if (!audioUrl) return;

    container.innerHTML =
      '<div class="audio-player">' +
        '<span class="audio-player__icon">🎙️</span>' +
        '<span class="audio-player__label">Voice Note</span>' +
        '<audio class="audio-player__el" controls src="' + escapeHtml(audioUrl) + '"></audio>' +
      '</div>';
  }

  function renderSecretAlbum() {
    var secretEl = document.getElementById("secret-track");
    if (secretEl) return; // already rendered

    var grid = document.getElementById("cd-grid");
    var wrapper = document.createElement("div");
    wrapper.id = "secret-track";
    wrapper.className = "secret-track";
    wrapper.innerHTML =
      '<div class="secret-track__label">✦ Secret Track ✦</div>' +
      renderCdCase(SECRET_ALBUM, 19);
    wrapper.querySelector(".cd-case").classList.add("cd-case--secret");
    wrapper.querySelector(".cd-case").addEventListener("click", function () {
      openModal(SECRET_ALBUM);
    });
    grid.parentNode.insertBefore(wrapper, grid.nextSibling);

    // Scroll into view after a small delay
    setTimeout(function () {
      wrapper.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 300);
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

  document.querySelector(".carousel__prev").addEventListener("click", carouselPrev);
  document.querySelector(".carousel__next").addEventListener("click", carouselNext);

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && modalEl.classList.contains("modal--open")) {
      closeModal();
    }
    if (e.key === "ArrowLeft" && modalEl.classList.contains("modal--open") && currentPhotoUrls.length > 1) {
      carouselPrev();
    }
    if (e.key === "ArrowRight" && modalEl.classList.contains("modal--open") && currentPhotoUrls.length > 1) {
      carouselNext();
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
