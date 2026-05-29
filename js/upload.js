// ========================================
// Upload Page — Loved Ones Submit Letters
// ========================================

(function () {
  "use strict";

  var UPLOAD_PASSWORD = "birthday2026"; // CHANGE THIS to your own shared secret
  var MAX_PHOTO_WIDTH = 800;
  var TOTAL_SLOTS = 19;

  var passwordGate = document.getElementById("password-gate");
  var uploadApp = document.getElementById("upload-app");
  var passwordInput = document.getElementById("password-input");
  var passwordSubmit = document.getElementById("password-submit");
  var passwordError = document.getElementById("password-error");

  // --- Password Gate ---

  // Check if already authenticated this session
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

  // --- Photo Handling ---

  var photoDrop = document.getElementById("photo-drop");
  var photoFile = document.getElementById("photo-file");
  var photoPreview = document.getElementById("photo-preview");
  var photoError = document.getElementById("photo-error");
  var selectedFile = null;

  photoDrop.addEventListener("click", function () {
    photoFile.click();
  });

  photoFile.addEventListener("change", function () {
    if (photoFile.files.length > 0) {
      handlePhotoSelect(photoFile.files[0]);
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
      handlePhotoSelect(e.dataTransfer.files[0]);
    }
  });

  function handlePhotoSelect(file) {
    if (!file.type.startsWith("image/")) {
      photoError.textContent = "Please select an image file.";
      photoError.style.display = "block";
      return;
    }

    photoError.style.display = "none";
    selectedFile = file;

    var reader = new FileReader();
    reader.onload = function (e) {
      photoPreview.src = e.target.result;
      photoPreview.style.display = "block";
      photoDrop.classList.add("photo-drop--has-photo");
    };
    reader.readAsDataURL(file);
  }

  function resizePhoto(file) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onload = function (e) {
        var img = new Image();
        img.onload = function () {
          var width = img.width;
          var height = img.height;

          // Skip resize if already small enough
          if (width <= MAX_PHOTO_WIDTH) {
            resolve(file);
            return;
          }

          var ratio = MAX_PHOTO_WIDTH / width;
          var newHeight = Math.round(height * ratio);

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
    var fileName = Date.now() + "-" + name.replace(/[^a-zA-Z0-9]/g, "_");

    var photoPromise = selectedFile
      ? resizePhoto(selectedFile).then(function (resized) {
          return uploadPhoto(resized, fileName);
        })
      : Promise.resolve("");

    photoPromise
      .then(function (photoUrl) {
        return addLetter({
          name: name,
          relationship: document.getElementById("relationship").value.trim(),
          message: document.getElementById("message").value.trim(),
          songTitle: document.getElementById("song-title").value.trim(),
          songArtist: document.getElementById("song-artist").value.trim(),
          songUrl: document.getElementById("song-url").value.trim(),
          photoUrl: photoUrl
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
    photoPreview.style.display = "none";
    photoDrop.classList.remove("photo-drop--has-photo");
    selectedFile = null;
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

    if (!selectedFile) {
      photoError.textContent = "Please select a photo of you together.";
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
