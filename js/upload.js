// ========================================
// Upload Page — Loved Ones Submit Letters
// ========================================

(function () {
  "use strict";

  var UPLOAD_PASSWORD = "birthday2026"; // CHANGE THIS to your own shared secret
  var MAX_PHOTO_WIDTH = 800;
  var MAX_PHOTOS = 5;
  var MAX_AUDIO_SIZE = 5 * 1024 * 1024; // 5MB
  var TOTAL_SLOTS = 19;

  var passwordGate = document.getElementById("password-gate");
  var uploadApp = document.getElementById("upload-app");
  var passwordInput = document.getElementById("password-input");
  var passwordSubmit = document.getElementById("password-submit");
  var passwordError = document.getElementById("password-error");

  // --- Password Gate ---

  if (sessionStorage.getItem("upload-auth") === "true") {
    showUploadApp();
  }

  passwordSubmit.addEventListener("click", function () {
    if (passwordInput.value === UPLOAD_PASSWORD) {
      sessionStorage.setItem("upload-auth", "true");
      showUploadApp();
    } else {
      passwordError.style.display = "block";
      passwordInput.value = "";
      passwordInput.focus();
    }
  });

  passwordInput.addEventListener("keydown", function (e) {
    if (e.key === "Enter") {
      passwordSubmit.click();
    }
  });

  function showUploadApp() {
    passwordGate.style.display = "none";
    uploadApp.style.display = "block";
    updateSubmissionCount();
  }

  // --- Submission Counter ---

  function updateSubmissionCount() {
    if (typeof supabaseClient === "undefined") return;
    getLetterCount()
      .then(function (count) {
        var el = document.getElementById("submission-count");
        el.textContent = count + " of " + TOTAL_SLOTS + " letters placed";
        if (count >= TOTAL_SLOTS) {
          el.textContent += " — all filled! 🎉";
        }
      })
      .catch(function () {});
  }

  // --- Multi-Photo Handling ---

  var photoDrop = document.getElementById("photo-drop");
  var photoFile = document.getElementById("photo-file");
  var photoThumbs = document.getElementById("photo-thumbs");
  var photoError = document.getElementById("photo-error");
  var selectedFiles = [];

  photoDrop.addEventListener("click", function () {
    photoFile.click();
  });

  photoFile.addEventListener("change", function () {
    if (photoFile.files.length > 0) {
      for (var i = 0; i < photoFile.files.length; i++) {
        addPhotoFile(photoFile.files[i]);
      }
      photoFile.value = "";
    }
  });

  photoDrop.addEventListener("dragover", function (e) {
    e.preventDefault();
    photoDrop.style.borderColor = "var(--accent)";
  });

  photoDrop.addEventListener("dragleave", function () {
    photoDrop.style.borderColor = "";
  });

  photoDrop.addEventListener("drop", function (e) {
    e.preventDefault();
    photoDrop.style.borderColor = "";
    if (e.dataTransfer.files.length > 0) {
      for (var i = 0; i < e.dataTransfer.files.length; i++) {
        addPhotoFile(e.dataTransfer.files[i]);
      }
    }
  });

  function addPhotoFile(file) {
    if (!file.type.startsWith("image/")) {
      photoError.textContent = "Only image files are allowed.";
      photoError.style.display = "block";
      return;
    }

    if (selectedFiles.length >= MAX_PHOTOS) {
      photoError.textContent = "Maximum " + MAX_PHOTOS + " photos allowed.";
      photoError.style.display = "block";
      return;
    }

    photoError.style.display = "none";
    selectedFiles.push(file);
    renderThumbnails();
  }

  function removePhoto(index) {
    selectedFiles.splice(index, 1);
    renderThumbnails();
    if (selectedFiles.length === 0) {
      photoDrop.classList.remove("photo-drop--has-photo");
    }
  }

  function renderThumbnails() {
    photoThumbs.innerHTML = "";

    if (selectedFiles.length === 0) return;

    photoDrop.classList.add("photo-drop--has-photo");
    photoDrop.querySelector(".photo-drop__placeholder").style.display = "none";

    for (var i = 0; i < selectedFiles.length; i++) {
      (function (index) {
        var reader = new FileReader();
        reader.onload = function (e) {
          var thumb = document.createElement("div");
          thumb.className = "photo-thumb";
          thumb.innerHTML =
            '<img src="' + e.target.result + '" alt="">' +
            '<button class="photo-thumb__remove" type="button">&times;</button>';
          thumb.querySelector(".photo-thumb__remove").addEventListener("click", function (evt) {
            evt.stopPropagation();
            removePhoto(index);
          });
          photoThumbs.appendChild(thumb);
        };
        reader.readAsDataURL(selectedFiles[index]);
      })(i);
    }

    // Show "add more" hint if under max
    if (selectedFiles.length < MAX_PHOTOS) {
      photoDrop.querySelector(".photo-drop__placeholder").style.display = "";
      photoDrop.querySelector(".photo-drop__placeholder").querySelector("span:last-child").textContent =
        selectedFiles.length + " of " + MAX_PHOTOS + " — click to add more";
    }
  }

  function resizePhoto(file) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onload = function (e) {
        var img = new Image();
        img.onload = function () {
          if (img.width <= MAX_PHOTO_WIDTH) {
            resolve(file);
            return;
          }

          var ratio = MAX_PHOTO_WIDTH / img.width;
          var newHeight = Math.round(img.height * ratio);

          var canvas = document.createElement("canvas");
          canvas.width = MAX_PHOTO_WIDTH;
          canvas.height = newHeight;
          var ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0, MAX_PHOTO_WIDTH, newHeight);

          canvas.toBlob(function (blob) {
            resolve(new File([blob], file.name, { type: "image/jpeg" }));
          }, "image/jpeg", 0.85);
        };
        img.onerror = reject;
        img.src = e.target.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  // --- Audio Handling ---

  var audioDrop = document.getElementById("audio-drop");
  var audioFile = document.getElementById("audio-file");
  var audioInfo = document.getElementById("audio-info");
  var audioError = document.getElementById("audio-error");
  var selectedAudio = null;

  audioDrop.addEventListener("click", function () {
    audioFile.click();
  });

  audioFile.addEventListener("change", function () {
    if (audioFile.files.length > 0) {
      handleAudioSelect(audioFile.files[0]);
    }
  });

  audioDrop.addEventListener("dragover", function (e) {
    e.preventDefault();
    audioDrop.style.borderColor = "var(--accent)";
  });

  audioDrop.addEventListener("dragleave", function () {
    audioDrop.style.borderColor = "";
  });

  audioDrop.addEventListener("drop", function (e) {
    e.preventDefault();
    audioDrop.style.borderColor = "";
    if (e.dataTransfer.files.length > 0) {
      handleAudioSelect(e.dataTransfer.files[0]);
    }
  });

  function handleAudioSelect(file) {
    audioError.style.display = "none";

    var allowed = ["audio/mpeg", "audio/mp4", "audio/wav", "audio/ogg",
      "audio/x-m4a", "audio/mp3", "audio/x-wav"];
    var ext = file.name.split(".").pop().toLowerCase();
    var allowedExts = ["mp3", "m4a", "wav", "ogg"];

    if (allowed.indexOf(file.type) === -1 && allowedExts.indexOf(ext) === -1) {
      audioError.textContent = "Please select an audio file (.mp3, .m4a, .wav, .ogg).";
      audioError.style.display = "block";
      return;
    }

    if (file.size > MAX_AUDIO_SIZE) {
      audioError.textContent = "Audio file must be under 5MB.";
      audioError.style.display = "block";
      return;
    }

    selectedAudio = file;
    audioInfo.style.display = "block";
    audioInfo.textContent = "🎙️ " + file.name + " (" + formatSize(file.size) + ")";
    audioDrop.querySelector(".audio-drop__placeholder").style.display = "none";
  }

  function formatSize(bytes) {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  }

  // --- Form Submission ---

  var form = document.getElementById("upload-form");
  var submitBtn = document.getElementById("submit-btn");
  var confirmation = document.getElementById("confirmation");
  var submitAnother = document.getElementById("submit-another");

  form.addEventListener("submit", function (e) {
    e.preventDefault();

    if (!validateForm()) return;

    if (typeof supabaseClient === "undefined") {
      alert("Supabase is not configured. Check the setup instructions.");
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = "Placing in Album...";

    var name = document.getElementById("name").value.trim();
    var filePrefix = Date.now() + "-" + name.replace(/[^a-zA-Z0-9]/g, "_");

    // Resize and upload all photos
    var photoPromises = [];
    for (var i = 0; i < selectedFiles.length; i++) {
      (function (file, index) {
        photoPromises.push(
          resizePhoto(file).then(function (resized) {
            return uploadPhoto(resized, filePrefix + "_" + index);
          })
        );
      })(selectedFiles[i], i);
    }

    var allPhotosPromise = photoPromises.length > 0
      ? Promise.all(photoPromises)
      : Promise.resolve([]);

    // Upload audio if selected
    var audioPromise = selectedAudio
      ? uploadAudio(selectedAudio, filePrefix + "_audio." + selectedAudio.name.split(".").pop())
      : Promise.resolve("");

    Promise.all([allPhotosPromise, audioPromise])
      .then(function (results) {
        var photoUrls = results[0];
        var audioUrl = results[1];

        return addLetter({
          name: name,
          relationship: document.getElementById("relationship").value.trim(),
          message: document.getElementById("message").value.trim(),
          songTitle: document.getElementById("song-title").value.trim(),
          songArtist: document.getElementById("song-artist").value.trim(),
          songUrl: document.getElementById("song-url").value.trim(),
          photoUrls: photoUrls,
          audioUrl: audioUrl
        });
      })
      .then(function () {
        form.style.display = "none";
        confirmation.style.display = "block";
        updateSubmissionCount();
        window.scrollTo({ top: 0, behavior: "smooth" });
      })
      .catch(function (err) {
        console.error("Upload failed:", err);
        alert("Something went wrong. Please try again!\n\n" + err.message);
        submitBtn.disabled = false;
        submitBtn.textContent = "Place in Album ✨";
      });
  });

  submitAnother.addEventListener("click", function () {
    form.reset();
    selectedFiles = [];
    selectedAudio = null;
    photoThumbs.innerHTML = "";
    photoDrop.classList.remove("photo-drop--has-photo");
    photoDrop.querySelector(".photo-drop__placeholder").style.display = "";
    photoDrop.querySelector(".photo-drop__placeholder span:last-child").textContent =
      "Click or drag up to 5 photos here";
    audioInfo.style.display = "none";
    audioInfo.textContent = "";
    audioDrop.querySelector(".audio-drop__placeholder").style.display = "";
    audioError.style.display = "none";
    confirmation.style.display = "none";
    form.style.display = "block";
    submitBtn.disabled = false;
    submitBtn.textContent = "Place in Album ✨";
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  function validateForm() {
    var valid = true;
    var name = document.getElementById("name");
    var relationship = document.getElementById("relationship");
    var message = document.getElementById("message");
    var songTitle = document.getElementById("song-title");
    var songArtist = document.getElementById("song-artist");

    [name, relationship, message, songTitle, songArtist].forEach(function (field) {
      if (!field.value.trim()) {
        field.style.borderColor = "var(--error)";
        valid = false;
      } else {
        field.style.borderColor = "";
      }
    });

    if (selectedFiles.length === 0) {
      photoError.textContent = "Please select at least one photo.";
      photoError.style.display = "block";
      valid = false;
    } else {
      photoError.style.display = "none";
    }

    if (!valid) {
      var firstError = document.querySelector(".input[style*='border-color']");
      if (firstError) firstError.focus();
    }

    return valid;
  }

  // Clear field error styling on input
  form.querySelectorAll(".input").forEach(function (input) {
    input.addEventListener("input", function () {
      input.style.borderColor = "";
    });
  });
})();
