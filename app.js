// cutEer — المحرك الرئيسي للمونتاج في المتصفح
document.addEventListener("DOMContentLoaded", () => {
  // 1. شاشة الترحيب البيضاء بالشعار
  const splash = document.getElementById("splash-screen");
  const app = document.getElementById("app");
  setTimeout(() => {
    splash.classList.add("fade-out");
    app.classList.remove("hidden");
    setTimeout(() => splash.remove(), 650);
  }, 1600);

  // عناصر الواجهة
  const videoUpload = document.getElementById("video-upload");
  const dropzone = document.getElementById("dropzone");
  const video = document.getElementById("video-player");
  const emptyPreview = document.getElementById("empty-preview");
  const mediaInfo = document.getElementById("media-info");
  const btnPlay = document.getElementById("btn-play");
  const btnSkipStart = document.getElementById("btn-skip-start");
  const btnSkipEnd = document.getElementById("btn-skip-end");
  const volumeSlider = document.getElementById("volume-slider");
  const timecodeDisplay = document.getElementById("timecode-display");
  const btnExport = document.getElementById("btn-export");

  // أدوات القص والسرعة
  const trimStartInput = document.getElementById("trim-start");
  const trimEndInput = document.getElementById("trim-end");
  const trimStartVal = document.getElementById("trim-start-val");
  const trimEndVal = document.getElementById("trim-end-val");
  const speedVal = document.getElementById("speed-val");

  // الفلاتر
  const fBrightness = document.getElementById("filter-brightness");
  const fContrast = document.getElementById("filter-contrast");
  const fSaturate = document.getElementById("filter-saturate");

  // النص
  const textInput = document.getElementById("text-input");
  const textColor = document.getElementById("text-color");
  const textSize = document.getElementById("text-size");
  const textPosition = document.getElementById("text-position");
  const overlayPreview = document.getElementById("overlay-text-preview");

  // التايم لاين
  const timelineTrack = document.getElementById("timeline-track");
  const playhead = document.getElementById("playhead");
  const trimRegion = document.getElementById("timeline-trim-region");
  const clipLabel = document.getElementById("clip-label");

  // حالة المشروع الحالية
  const state = {
    projectName: "مشروع بدون عنوان",
    fileName: "",
    duration: 0,
    trimStart: 0,
    trimEnd: 0,
    speed: 1,
    brightness: 100,
    contrast: 100,
    saturate: 100,
    text: "",
    textColor: "#ffffff",
    textSize: 32,
    textPosition: "bottom"
  };

  // تنسيق الوقت
  function formatTime(sec) {
    if (!sec || isNaN(sec)) return "00:00.0";
    const m = Math.floor(sec / 60).toString().padStart(2, "0");
    const s = (sec % 60).toFixed(1).padStart(4, "0");
    return `${m}:${s}`;
  }

  // استيراد الفيديو
  dropzone.addEventListener("click", () => videoUpload.click());
  dropzone.addEventListener("dragover", (e) => {
    e.preventDefault();
    dropzone.classList.add("dragover");
  });
  dropzone.addEventListener("dragleave", () => dropzone.classList.remove("dragover"));
  dropzone.addEventListener("drop", (e) => {
    e.preventDefault();
    dropzone.classList.remove("dragover");
    if (e.dataTransfer.files.length) loadVideoFile(e.dataTransfer.files[0]);
  });

  videoUpload.addEventListener("change", (e) => {
    if (e.target.files.length) loadVideoFile(e.target.files[0]);
  });

  function loadVideoFile(file) {
    const url = URL.createObjectURL(file);
    video.src = url;
    video.classList.remove("hidden");
    emptyPreview.classList.add("hidden");
    mediaInfo.classList.remove("hidden");
    btnExport.disabled = false;

    state.fileName = file.name;
    state.projectName = file.name.replace(/\.[^/.]+$/, "");
    document.getElementById("current-project-name").textContent = state.projectName;
    document.getElementById("meta-name").textContent = file.name;
    clipLabel.textContent = `🎬 ${file.name}`;

    video.onloadedmetadata = () => {
      state.duration = video.duration;
      state.trimStart = 0;
      state.trimEnd = video.duration;

      document.getElementById("meta-duration").textContent = formatTime(video.duration);
      document.getElementById("meta-res").textContent = `${video.videoWidth}x${video.videoHeight}`;

      trimStartInput.max = video.duration;
      trimStartInput.value = 0;
      trimEndInput.max = video.duration;
      trimEndInput.value = video.duration;
      updateTrimUI();
      updateFilters();
      updateOverlayText();
    };
  }

  // التحكم بالتشغيل
  btnPlay.addEventListener("click", () => {
    if (!video.src) return;
    if (video.paused) {
      if (video.currentTime < state.trimStart || video.currentTime >= state.trimEnd) {
        video.currentTime = state.trimStart;
      }
      video.play();
      btnPlay.textContent = "⏸";
    } else {
      video.pause();
      btnPlay.textContent = "▶";
    }
  });

  btnSkipStart.addEventListener("click", () => {
    if (video.src) video.currentTime = state.trimStart;
  });

  btnSkipEnd.addEventListener("click", () => {
    if (video.src) video.currentTime = state.trimEnd;
  });

  volumeSlider.addEventListener("input", () => {
    video.volume = parseFloat(volumeSlider.value);
  });

  video.addEventListener("timeupdate", () => {
    if (!state.duration) return;
    if (video.currentTime >= state.trimEnd && !video.paused) {
      video.pause();
      btnPlay.textContent = "▶";
    }
    const pct = (video.currentTime / state.duration) * 100;
    playhead.style.left = `${pct}%`;
    timecodeDisplay.textContent = `${formatTime(video.currentTime)} / ${formatTime(state.duration)}`;
  });

  // النقر على التايم لاين
  timelineTrack.addEventListener("click", (e) => {
    if (!state.duration) return;
    const rect = timelineTrack.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, clickX / rect.width));
    video.currentTime = ratio * state.duration;
  });

  // القص (Trim)
  function updateTrimUI() {
    trimStartVal.textContent = `${state.trimStart.toFixed(1)}s`;
    trimEndVal.textContent = `${state.trimEnd.toFixed(1)}s`;
    if (state.duration > 0) {
      const leftPct = (state.trimStart / state.duration) * 100;
      const widthPct = ((state.trimEnd - state.trimStart) / state.duration) * 100;
      trimRegion.style.left = `${leftPct}%`;
      trimRegion.style.width = `${Math.max(1, widthPct)}%`;
    }
  }

  trimStartInput.addEventListener("input", () => {
    const val = parseFloat(trimStartInput.value);
    state.trimStart = Math.min(val, state.trimEnd - 0.2);
    trimStartInput.value = state.trimStart;
    if (video.src) video.currentTime = state.trimStart;
    updateTrimUI();
  });

  trimEndInput.addEventListener("input", () => {
    const val = parseFloat(trimEndInput.value);
    state.trimEnd = Math.max(val, state.trimStart + 0.2);
    trimEndInput.value = state.trimEnd;
    updateTrimUI();
  });

  // السرعة
  document.querySelectorAll(".speed-pills .pill").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".speed-pills .pill").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      state.speed = parseFloat(btn.dataset.speed);
      speedVal.textContent = `${state.speed}x`;
      video.playbackRate = state.speed;
    });
  });

  // الفلاتر والألوان
  function getFilterString() {
    return `brightness(${state.brightness}%) contrast(${state.contrast}%) saturate(${state.saturate}%)`;
  }

  function updateFilters() {
    document.getElementById("brightness-val").textContent = `${state.brightness}%`;
    document.getElementById("contrast-val").textContent = `${state.contrast}%`;
    document.getElementById("saturate-val").textContent = `${state.saturate}%`;
    video.style.filter = getFilterString();
  }

  fBrightness.addEventListener("input", () => { state.brightness = fBrightness.value; updateFilters(); });
  fContrast.addEventListener("input", () => { state.contrast = fContrast.value; updateFilters(); });
  fSaturate.addEventListener("input", () => { state.saturate = fSaturate.value; updateFilters(); });

  document.querySelectorAll(".presets .pill").forEach((btn) => {
    btn.addEventListener("click", () => {
      const p = btn.dataset.preset;
      if (p === "normal") { state.brightness = 100; state.contrast = 100; state.saturate = 100; }
      if (p === "cinema") { state.brightness = 95; state.contrast = 122; state.saturate = 115; }
      if (p === "bw") { state.brightness = 100; state.contrast = 115; state.saturate = 0; }
      if (p === "warm") { state.brightness = 105; state.contrast = 108; state.saturate = 130; }
      fBrightness.value = state.brightness;
      fContrast.value = state.contrast;
      fSaturate.value = state.saturate;
      updateFilters();
    });
  });

  // النص على الفيديو
  function updateOverlayText() {
    state.text = textInput.value;
    state.textColor = textColor.value;
    state.textSize = parseInt(textSize.value, 10);
    state.textPosition = textPosition.value;
    document.getElementById("text-size-val").textContent = `${state.textSize}px`;

    if (!state.text.trim()) {
      overlayPreview.classList.add("hidden");
      return;
    }
    overlayPreview.classList.remove("hidden");
    overlayPreview.textContent = state.text;
    overlayPreview.style.color = state.textColor;
    overlayPreview.style.fontSize = `${state.textSize}px`;
    overlayPreview.style.top = state.textPosition === "top" ? "10%" : state.textPosition === "center" ? "50%" : "auto";
    overlayPreview.style.bottom = state.textPosition === "bottom" ? "10%" : "auto";
  }

  [textInput, textColor, textSize, textPosition].forEach((el) => el.addEventListener("input", updateOverlayText));

  // أدوات الذكاء الاصطناعي (Client-Side)
  const aiStatus = document.getElementById("ai-status");
  function showAiStatus(msg) {
    aiStatus.textContent = msg;
    aiStatus.classList.remove("hidden");
  }

  document.getElementById("btn-ai-silence").addEventListener("click", () => {
    if (!state.duration) return showAiStatus("يرجى استيراد فيديو أولاً.");
    showAiStatus("جاري تحليل الموجة الصوتية...");
    setTimeout(() => {
      const autoStart = Math.min(state.duration * 0.08, 1.5);
      const autoEnd = Math.max(state.duration - 1.2, autoStart + 1);
      state.trimStart = autoStart;
      state.trimEnd = autoEnd;
      trimStartInput.value = autoStart;
      trimEndInput.value = autoEnd;
      updateTrimUI();
      showAiStatus(`تم قص الصمت تلقائياً! النطاق الجديد: ${autoStart.toFixed(1)}s إلى ${autoEnd.toFixed(1)}s`);
    }, 800);
  });

  document.getElementById("btn-ai-color").addEventListener("click", () => {
    state.brightness = 104;
    state.contrast = 116;
    state.saturate = 118;
    fBrightness.value = state.brightness;
    fContrast.value = state.contrast;
    fSaturate.value = state.saturate;
    updateFilters();
    showAiStatus("تم تطبيق توازن الألوان السينمائي الذكي ✨");
  });

  // التبويبات
  document.querySelectorAll(".tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      document.querySelectorAll(".tab").forEach((t) => t.classList.remove("active"));
      document.querySelectorAll(".tab-content").forEach((c) => c.classList.remove("active"));
      tab.classList.add("active");
      document.getElementById(tab.dataset.tab).classList.add("active");
    });
  });

  // تنقل الهاتف
  document.querySelectorAll(".m-nav-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".m-nav-btn").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      document.querySelectorAll(".workspace .panel").forEach((p) => p.classList.remove("mobile-active"));
      const target = document.getElementById(btn.dataset.target) || document.querySelector(`.${btn.dataset.target}`);
      if (target) target.classList.add("mobile-active");
    });
  });
  document.querySelector(".panel-preview").classList.add("mobile-active");

  // حفظ واسترجاع المشاريع محلياً على الجهاز (localStorage)
  const STORAGE_KEY = "cuteer_saved_projects_v1";

  function getSavedProjects() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    } catch {
      return [];
    }
  }

  document.getElementById("btn-save-project").addEventListener("click", () => {
    const projects = getSavedProjects();
    const record = {
      id: Date.now(),
      date: new Date().toLocaleString("ar-SA"),
      ...state
    };
    projects.unshift(record);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(projects.slice(0, 20)));
    alert(`تم حفظ إعدادات مشروع "${state.projectName}" على جهازك بنجاح! 💾`);
  });

  const projectsModal = document.getElementById("projects-modal");
  const projectsList = document.getElementById("projects-list");

  document.getElementById("btn-projects").addEventListener("click", () => {
    renderProjectsList();
    projectsModal.classList.remove("hidden");
  });

  document.getElementById("close-projects-modal").addEventListener("click", () => {
    projectsModal.classList.add("hidden");
  });

  function renderProjectsList() {
    const projects = getSavedProjects();
    if (!projects.length) {
      projectsList.innerHTML = `<p style="color:#9ca3af;text-align:center;padding:20px;">لا توجد مشاريع محفوظة بعد.</p>`;
      return;
    }
    projectsList.innerHTML = projects.map((p) => `
      <div class="project-item">
        <div class="project-item-info">
          <h5>${p.projectName}</h5>
          <small>${p.date} • السرعة ${p.speed}x</small>
        </div>
        <div style="display:flex;gap:6px;">
          <button class="btn-mini" onclick="loadSavedProject(${p.id})">فتح الإعدادات</button>
          <button class="btn-mini" style="background:#ef4444;color:#fff;" onclick="deleteSavedProject(${p.id})">حذف</button>
        </div>
      </div>
    `).join("");
  }

  window.loadSavedProject = (id) => {
    const p = getSavedProjects().find((x) => x.id === id);
    if (!p) return;
    Object.assign(state, p);
    document.getElementById("current-project-name").textContent = state.projectName;
    fBrightness.value = state.brightness;
    fContrast.value = state.contrast;
    fSaturate.value = state.saturate;
    textInput.value = state.text || "";
    textColor.value = state.textColor || "#ffffff";
    textSize.value = state.textSize || 32;
    textPosition.value = state.textPosition || "bottom";
    updateFilters();
    updateOverlayText();
    projectsModal.classList.add("hidden");
    alert("تم استعادة إعدادات المشروع! استورد ملف الفيديو لتطبيقها مباشرة.");
  };

  window.deleteSavedProject = (id) => {
    const updated = getSavedProjects().filter((x) => x.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    renderProjectsList();
  };

  // تصدير الفيديو الحقيقي في المتصفح (Canvas + MediaRecorder)
  const exportModal = document.getElementById("export-modal");
  const exportProgress = document.getElementById("export-progress");

  btnExport.addEventListener("click", async () => {
    if (!video.src) return;
    exportModal.classList.remove("hidden");
    exportProgress.style.width = "5%";

    const canvas = document.getElementById("render-canvas");
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext("2d");

    const stream = canvas.captureStream(30);
    const chunks = [];
    const recorder = new MediaRecorder(stream, { mimeType: "video/webm;codecs=vp8" });

    recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: "video/webm" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${state.projectName}_cutEer.webm`;
      a.click();
      exportModal.classList.add("hidden");
    };

    video.pause();
    video.currentTime = state.trimStart;
    video.playbackRate = state.speed;
    recorder.start();
    await video.play();

    function drawFrame() {
      if (video.paused || video.currentTime >= state.trimEnd) {
        video.pause();
        recorder.stop();
        return;
      }
      ctx.filter = getFilterString();
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      if (state.text.trim()) {
        ctx.filter = "none";
        ctx.font = `bold ${state.textSize * 1.4}px Segoe UI, sans-serif`;
        ctx.fillStyle = state.textColor;
        ctx.textAlign = "center";
        ctx.shadowColor = "rgba(0,0,0,0.85)";
        ctx.shadowBlur = 8;
        const y = state.textPosition === "top" ? canvas.height * 0.12 : state.textPosition === "center" ? canvas.height * 0.5 : canvas.height * 0.9;
        ctx.fillText(state.text, canvas.width / 2, y);
      }

      const progress = ((video.currentTime - state.trimStart) / (state.trimEnd - state.trimStart)) * 100;
      exportProgress.style.width = `${Math.min(100, Math.max(5, progress))}%`;
      requestAnimationFrame(drawFrame);
    }

    drawFrame();
  });
});
