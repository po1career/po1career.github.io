/* ============================================================
   PLK No.1 Career Team — admin panel logic
   Saves staff-created posts to localStorage; can export a new
   posts.js file to publish them for everyone.
   ============================================================ */
(function () {
  "use strict";
  var KEY = "clp_posts";
  var imageData = ""; // base64 of uploaded image

  function load() { try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch (e) { return []; } }
  function save(arr) { localStorage.setItem(KEY, JSON.stringify(arr)); }
  function slug(s) {
    return (s || "post").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40)
      || "post-" + Date.now();
  }
  function $(id) { return document.getElementById(id); }

  // ---- image upload -> base64 ----
  $("imageFile").addEventListener("change", function (e) {
    var f = e.target.files[0];
    if (!f) { imageData = ""; $("imgPreview").style.display = "none"; return; }
    var r = new FileReader();
    r.onload = function () {
      imageData = r.result;
      $("imgPreview").src = imageData;
      $("imgPreview").style.display = "block";
    };
    r.readAsDataURL(f);
  });

  // ---- submit ----
  $("postForm").addEventListener("submit", function (e) {
    e.preventDefault();
    var arr = load();
    var editId = $("editId").value;
    var id = editId || slug($("title_en").value) + "-" + Date.now().toString(36);

    var post = {
      id: id,
      category: $("category").value,
      date: $("date").value,
      pinned: $("pinned").value === "true",
      image: imageData || $("postForm").dataset.existingImage || "",
      title_en: $("title_en").value.trim(),
      title_zh: $("title_zh").value.trim(),
      body_en: $("body_en").value.trim(),
      body_zh: $("body_zh").value.trim()
    };

    if (editId) {
      arr = arr.map(function (p) { return p.id === editId ? post : p; });
    } else {
      arr.unshift(post);
    }
    save(arr);
    resetForm();
    renderList();
    alert("✅ Saved! View it on the website (Back to website).");
  });

  $("resetBtn").addEventListener("click", resetForm);

  function resetForm() {
    $("postForm").reset();
    $("editId").value = "";
    imageData = "";
    delete $("postForm").dataset.existingImage;
    $("imgPreview").style.display = "none";
    $("date").value = new Date().toISOString().slice(0, 10);
  }

  // ---- list / edit / delete ----
  function renderList() {
    var arr = load();
    var tb = $("list");
    tb.innerHTML = "";
    if (!arr.length) {
      tb.innerHTML = '<tr><td colspan="4" style="color:#9a8straight">No posts added yet.</td></tr>'
        .replace("9a8straight", "8a7a5f");
      return;
    }
    var cat = { local: "Local 本地", mainland: "Mainland 內地", foreign: "Foreign 海外", career: "Career 職業" };
    arr.forEach(function (p) {
      var tr = document.createElement("tr");
      tr.innerHTML =
        "<td>" + esc(p.title_en || "(untitled)") + (p.pinned ? " 📌" : "") + "</td>" +
        '<td><span class="pill">' + (cat[p.category] || p.category) + "</span></td>" +
        "<td>" + (p.date || "") + "</td>" +
        '<td style="white-space:nowrap">' +
          '<button class="btn ghost edit" style="padding:5px 12px">Edit</button> ' +
          '<button class="btn danger del" style="padding:5px 12px">Delete</button></td>';
      tr.querySelector(".edit").onclick = function () { editPost(p); };
      tr.querySelector(".del").onclick = function () {
        if (confirm("Delete this post?")) { save(load().filter(function (x) { return x.id !== p.id; })); renderList(); }
      };
      tb.appendChild(tr);
    });
  }

  function editPost(p) {
    $("editId").value = p.id;
    $("category").value = p.category;
    $("title_en").value = p.title_en || "";
    $("title_zh").value = p.title_zh || "";
    $("date").value = p.date || "";
    $("pinned").value = p.pinned ? "true" : "false";
    $("body_en").value = p.body_en || "";
    $("body_zh").value = p.body_zh || "";
    if (p.image) {
      $("postForm").dataset.existingImage = p.image;
      $("imgPreview").src = p.image; $("imgPreview").style.display = "block";
    } else { $("imgPreview").style.display = "none"; }
    imageData = "";
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // ---- export to posts.js (publish for everyone) ----
  $("exportBtn").addEventListener("click", function () {
    var added = load();
    var seed = window.SEED_POSTS || [];
    // merge: added posts override seed by id
    var byId = {};
    seed.concat(added).forEach(function (p) { byId[p.id] = p; });
    var merged = Object.keys(byId).map(function (k) { return byId[k]; });

    var out =
      "/* PLK No.1 Career Team — posts.js (exported " + new Date().toLocaleString() + ") */\n" +
      "window.SEED_POSTS = " + JSON.stringify(merged, null, 2) + ";\n\n" +
      "window.TEAM = " + JSON.stringify(window.TEAM || [], null, 2) + ";\n\n" +
      "window.RESOURCES = " + JSON.stringify(window.RESOURCES || [], null, 2) + ";\n";

    var blob = new Blob([out], { type: "application/javascript" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "posts.js";
    a.click();
    URL.revokeObjectURL(a.href);
    alert("Downloaded posts.js. Replace the website's posts.js with this file to publish for everyone.");
  });

  $("clearAllBtn").addEventListener("click", function () {
    if (confirm("Delete ALL posts you've added on this browser? (Built-in posts stay.)")) {
      localStorage.removeItem(KEY); renderList();
    }
  });

  function esc(s) { return (s || "").replace(/[&<>"']/g, function (c) {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }

  // init
  resetForm();
  renderList();
})();
