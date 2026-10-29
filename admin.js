/* ============================================================
   PLK No.1 Career Team — admin panel logic
   Saves staff-created posts to localStorage; can export a new
   posts.js file for the maintainer to review and publish.
   ============================================================ */
(function () {
  "use strict";
  var KEY = "clp_posts";
  var imageData = ""; // base64 of uploaded image
  var imageReader = null;

  function load() { try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch (e) { return []; } }
  function save(arr) {
    try { localStorage.setItem(KEY, JSON.stringify(arr)); return true; }
    catch (e) { status("Could not save. Your form is still here; try a smaller image or check browser storage.\n未能儲存。表格內容仍在；請嘗試較小的圖片或檢查瀏覽器儲存設定。"); return false; }
  }
  function slug(s) {
    return (s || "post").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40)
      || "post-" + Date.now();
  }
  function $(id) { return document.getElementById(id); }
  function status(message) { $("post-status").textContent = message; }
  function stopImageRead() {
    if (imageReader) { var old = imageReader; imageReader = null; old.abort(); }
    $("saveBtn").disabled = false;
  }
  function completePost(p) { return [p.title_en, p.title_zh, p.body_en, p.body_zh].every(function (s) { return typeof s === "string" && s.trim(); }); }

  // ---- image upload -> base64 ----
  $("imageFile").addEventListener("change", function (e) {
    stopImageRead();
    var f = e.target.files[0];
    if (!f) return;
    var r = new FileReader();
    imageReader = r; $("saveBtn").disabled = true;
    status("Reading image… 讀取圖片中…");
    r.onload = function () {
      if (imageReader !== r) return;
      imageReader = null; $("saveBtn").disabled = false;
      imageData = r.result;
      $("imgPreview").src = imageData;
      $("imgPreview").style.display = "block";
      status("Image ready. Save the post to keep it in this browser.\n圖片已備妥。請儲存貼文以保留於此瀏覽器。");
    };
    r.onerror = function () {
      if (imageReader !== r) return;
      imageReader = null; $("saveBtn").disabled = false; $("imageFile").value = "";
      status("Could not read this image. The previous image, if any, is unchanged. Please choose another file.\n未能讀取圖片。原有圖片（如有）保持不變，請選擇另一個檔案。");
    };
    r.readAsDataURL(f);
  });

  // ---- submit ----
  $("postForm").addEventListener("submit", function (e) {
    e.preventDefault();
    if (imageReader) return;
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

    if (!completePost(post)) {
      status("Complete the English and Traditional Chinese titles and text before saving.\n儲存前請填妥英文及繁體中文的標題與內文。");
      ["title_en", "title_zh", "body_en", "body_zh"].some(function (id) {
        if (!$(id).value.trim()) { $(id).focus(); return true; } return false;
      });
      return;
    }

    if (editId) {
      arr = arr.map(function (p) { return p.id === editId ? post : p; });
    } else {
      arr.unshift(post);
    }
    if (!save(arr)) return;
    resetForm();
    renderList();
    status("Saved in this browser only. Not published. Export the file for the website maintainer to review.\n只儲存於此瀏覽器，尚未發布。請匯出檔案交予網站管理員審閱。");
  });

  $("resetBtn").addEventListener("click", resetForm);

  function resetForm() {
    stopImageRead(); status("");
    $("postForm").reset();
    $("editId").value = "";
    imageData = "";
    delete $("postForm").dataset.existingImage;
    $("imgPreview").style.display = "none";
    $("imgPreview").removeAttribute("src");
    $("date").value = new Date().toISOString().slice(0, 10);
  }

  // ---- list / edit / delete ----
  function renderList() {
    var arr = load();
    var tb = $("list");
    tb.innerHTML = "";
    if (!arr.length) {
      tb.innerHTML = '<tr><td colspan="4" style="color:#8a7a5f">No posts added yet. 尚未新增貼文。</td></tr>';
      return;
    }
    var cat = { local: "Local 本地", mainland: "Mainland 內地", foreign: "Foreign 海外", career: "Career 職業" };
    arr.forEach(function (p) {
      var tr = document.createElement("tr");
      tr.innerHTML =
        "<td>" + esc(p.title_en || "(untitled 無標題)") + (p.pinned ? " 📌" : "") + "</td>" +
        '<td><span class="pill">' + esc(cat[p.category] || p.category) + "</span></td>" +
        "<td>" + esc(p.date || "") + "</td>" +
        '<td style="white-space:nowrap">' +
          '<button class="btn ghost edit" style="padding:5px 12px">Edit 編輯</button> ' +
          '<button class="btn danger del" style="padding:5px 12px">Delete 刪除</button></td>';
      tr.querySelector(".edit").onclick = function () { editPost(p); };
      tr.querySelector(".del").onclick = function () {
        if (confirm("Delete this browser's copy of the post? 刪除此瀏覽器內的貼文副本？")) {
          if (!save(load().filter(function (x) { return x.id !== p.id; }))) return;
          if ($("editId").value === p.id) resetForm();
          renderList(); status("Local copy deleted. The live website is unchanged.\n本機副本已刪除，公開網站保持不變。");
        }
      };
      tb.appendChild(tr);
    });
  }

  function editPost(p) {
    resetForm();
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

  // ---- export to posts.js for maintainer review ----
  $("exportBtn").addEventListener("click", function () {
    var added = load();
    if (!added.every(completePost)) {
      status("Some saved posts are missing English or Traditional Chinese text. Edit them before exporting.\n部分已儲存貼文欠缺英文或繁體中文內容。請先編輯補全，再匯出。"); return;
    }
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
    status("Export requested. Give the downloaded posts.js to the website maintainer for review and publication. Exporting does not publish it.\n已要求匯出。請將下載的 posts.js 交予網站管理員審閱及發布；匯出不會自動發布。");
  });

  $("clearAllBtn").addEventListener("click", function () {
    if (confirm("Delete ALL posts added in this browser? Built-in posts stay.\n刪除此瀏覽器內所有新增貼文？內置貼文會保留。")) {
      try { localStorage.removeItem(KEY); }
      catch (e) { status("Could not clear saved posts. 未能清除已儲存貼文。"); return; }
      resetForm(); renderList(); status("Local posts cleared. The live website is unchanged.\n本機貼文已清除，公開網站保持不變。");
    }
  });

  function esc(s) { return (s || "").replace(/[&<>"']/g, function (c) {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }

  // init
  resetForm();
  renderList();
})();
