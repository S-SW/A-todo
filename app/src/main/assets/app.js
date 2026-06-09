// ==========================================================================
// 核心安全与配置区（已移除本地密码，删除逻辑由 Worker 托管）
// ==========================================================================

const SUPABASE_URL = "https://gtgmqumuqxnuvoacsnxg.supabase.co";
const SUPABASE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd0Z21xdW11cXhudXZvYWNzbnhnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk5NTA3NzIsImV4cCI6MjA5NTUyNjc3Mn0.7sI9kmqymPr0LiZJodd4oZj3oF4GJYTewcYknVFxrwA";

const headers = {
  apikey: SUPABASE_KEY,
  Authorization: `Bearer ${SUPABASE_KEY}`,
  "Content-Type": "application/json",
  Prefer: "return=representation",
};

// DOM 元素获取
const textarea = document.getElementById("diaryContent");
const inputPhoto = document.getElementById("diaryPhoto");
const charCount = document.getElementById("charCount");
const saveBtn = document.getElementById("saveBtn");
const diaryList = document.getElementById("diaryList");
const loadingSpinner = document.getElementById("loading");
const exportBtn = document.getElementById("exportBtn");

// 全局灯箱弹窗状态
let lightboxPhotos = [];
let lightboxIndex = 0;

// 上下文暂存区（用于高级自定义弹窗暂存卡片信息）
let activeDeleteContext = null;

// 初始化主题
function initTheme() {
  const savedTheme = localStorage.getItem("theme") || "light";
  document.documentElement.classList.remove("dark", "theme-green", "theme-purple");

  if (savedTheme === "dark") document.documentElement.classList.add("dark");
  else if (savedTheme === "green") document.documentElement.classList.add("theme-green");
  else if (savedTheme === "purple") document.documentElement.classList.add("theme-purple");

  const btn = document.getElementById(`theme-${savedTheme}`);
  if (btn) btn.classList.add("theme-btn-active-style");
}

// 主题切换逻辑
document.querySelectorAll(".theme-bar-container button").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelectorAll(".theme-bar-container button").forEach((b) => b.classList.remove("theme-btn-active-style"));

    const idStr = button.getAttribute("id");
    const theme = idStr ? idStr.replace("theme-", "") : "light";
    localStorage.setItem("theme", theme);

    document.documentElement.classList.remove("dark", "theme-green", "theme-purple");
    if (theme === "dark") document.documentElement.classList.add("dark");
    else if (theme === "green") document.documentElement.classList.add("theme-green");
    else if (theme === "purple") document.documentElement.classList.add("theme-purple");

    button.classList.add("theme-btn-active-style");
  });
});

// 字数统计
if (textarea) {
  textarea.addEventListener("input", () => {
    charCount.textContent = `${textarea.value.length} 字`;
  });
}

function formatToSlashTime(timeStr) {
  if (!timeStr) return "";
  let normalized = timeStr.replace(/-/g, "/");
  let date = new Date(normalized);
  if (isNaN(date.getTime())) return timeStr;

  const Y = date.getFullYear();
  const M = date.getMonth() + 1;
  const D = date.getDate();
  const h = date.getHours();
  const m = String(date.getMinutes()).padStart(2, "0");
  const s = String(date.getSeconds()).padStart(2, "0");
  return `${Y}/${M}/${D} ${h}:${m}:${s}`;
}

function getBeijingTime() {
  const now = new Date();
  const Y = now.getFullYear();
  const M = now.getMonth() + 1;
  const D = now.getDate();
  const h = now.getHours();
  const m = String(now.getMinutes()).padStart(2, "0");
  const s = String(now.getSeconds()).padStart(2, "0");
  return `${Y}/${M}/${D} ${h}:${m}:${s}`;
}

function parsePhotos(photoStr) {
  if (!photoStr || photoStr === "NULL" || photoStr.trim() === "") return [];
  return photoStr.split(/[,，\s\r\n]+/).map((url) => url.trim()).filter((url) => url !== "");
}

function renderPhotoGalleryHTML(photos) {
  if (photos.length === 0) return "";
  if (photos.length === 1) {
    return `
      <div class="w-full max-w-[140px] aspect-[4/3] rounded-xl overflow-hidden mt-2 mb-1 border border-gray-100 dark:border-gray-800 shrink-0 bg-gray-50/10 cursor-zoom-in" onclick="openGlobalLightbox(${JSON.stringify(photos).replace(/"/g, "&quot;")}, 0)">
          <img src="${escapeHtml(photos[0])}" class="w-full h-full object-cover" alt="配图" referrerpolicy="no-referrer" />
      </div>
    `;
  }

  let imagesStackHtml = "";
  photos.forEach((url, index) => {
    let transformClass = "scale-100 z-30 opacity-100";
    if (index === 1) transformClass = "rotate-[9deg] translate-x-3.5 translate-y-1 scale-95 z-20 opacity-85";
    if (index === 2) transformClass = "rotate-[-9deg] -translate-x-3 translate-y-2 scale-90 z-10 opacity-70";
    if (index > 2) transformClass = "hidden";

    imagesStackHtml += `
      <div data-index="${index}" class="photo-stack-item absolute inset-0 w-full h-full transition-all duration-300 rounded-xl overflow-hidden border border-gray-100 dark:border-gray-800 bg-gray-100 dark:bg-gray-900 ${transformClass}">
          <img src="${escapeHtml(url)}" class="w-full h-full object-cover cursor-zoom-in" alt="配图" referrerpolicy="no-referrer" onclick="event.stopPropagation(); openGlobalLightbox(${JSON.stringify(photos).replace(/"/g, "&quot;")}, ${index})" />
      </div>
    `;
  });

  return `
    <div class="relative w-full max-w-[140px] aspect-[4/3] mt-2 select-none group/gallery" style="margin-right: 24px; margin-bottom: 20px;">
        <div class="w-full h-full relative">
            ${imagesStackHtml}
        </div>
        <button onclick="event.stopPropagation(); switchStackPhoto(this, -1)" class="absolute left-1 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center text-[9px] backdrop-blur-xs transition-opacity opacity-0 group-hover/gallery:opacity-100 z-40 cursor-pointer">
            <i class="fa-solid fa-chevron-left"></i>
        </button>
        <button onclick="event.stopPropagation(); switchStackPhoto(this, 1)" class="absolute right-1 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center text-[9px] backdrop-blur-xs transition-opacity opacity-0 group-hover/gallery:opacity-100 z-40 cursor-pointer">
            <i class="fa-solid fa-chevron-right"></i>
        </button>
        <div class="absolute bottom-1 right-1 px-1.5 py-0.5 rounded-md bg-black/50 text-[8px] text-white font-mono tracking-tight z-40 scale-90">
            <span class="active-idx">1</span>/${photos.length}
        </div>
    </div>
  `;
}

window.switchStackPhoto = function (btn, dir) {
  const galleryContainer = btn.parentElement;
  const items = galleryContainer.querySelectorAll(".photo-stack-item");
  const idxBadge = galleryContainer.querySelector(".active-idx");
  if (items.length <= 1) return;

  let currentActiveIdx = 0;
  items.forEach((item, i) => {
    if (item.classList.contains("z-30")) currentActiveIdx = i;
  });

  let nextActiveIdx = (currentActiveIdx + dir + items.length) % items.length;
  idxBadge.textContent = nextActiveIdx + 1;

  items.forEach((item, index) => {
    item.className = "photo-stack-item absolute inset-0 w-full h-full transition-all duration-300 rounded-xl overflow-hidden border border-gray-100 dark:border-gray-800 bg-gray-100 dark:bg-gray-900";
    let relativePos = (index - nextActiveIdx + items.length) % items.length;

    if (relativePos === 0) {
      item.classList.add("scale-100", "z-30", "opacity-100", "rotate-0", "translate-x-0", "translate-y-0");
    } else if (relativePos === 1) {
      item.classList.add("rotate-[9deg]", "translate-x-3.5", "translate-y-1", "scale-95", "z-20", "opacity-85");
    } else if (relativePos === 2) {
      item.classList.add("rotate-[-9deg]", "-translate-x-3", "translate-y-2", "scale-90", "z-10", "opacity-70");
    } else {
      item.classList.add("hidden");
    }
  });
};

window.openGlobalLightbox = function (photos, index) {
  lightboxPhotos = photos;
  lightboxIndex = index;

  let lightbox = document.getElementById("globalLightbox");
  if (!lightbox) {
    lightbox = document.createElement("div");
    lightbox.id = "globalLightbox";
    lightbox.className = "fixed inset-0 bg-black/90 backdrop-blur-xl z-[9999] flex flex-col items-center justify-center opacity-0 pointer-events-none transition-opacity duration-300 select-none";
    lightbox.innerHTML = `
      <button onclick="closeGlobalLightbox()" class="absolute top-6 right-6 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center text-sm transition-all cursor-pointer z-50">
          <i class="fa-solid fa-xmark"></i>
      </button>
      <div class="relative w-full max-w-4xl max-h-[80vh] px-12 flex items-center justify-center">
          <button onclick="changeLightboxPhoto(-1)" class="absolute left-4 w-12 h-12 rounded-full bg-white/5 hover:bg-white/10 text-white flex items-center justify-center text-sm transition-all cursor-pointer">
              <i class="fa-solid fa-chevron-left"></i>
          </button>
          <img id="lightboxImg" src="" class="max-w-full max-h-[80vh] object-contain rounded-xl shadow-2xl border border-white/5" alt="放大图" referrerpolicy="no-referrer" />
          <button onclick="changeLightboxPhoto(1)" class="absolute right-4 w-12 h-12 rounded-full bg-white/5 hover:bg-white/10 text-white flex items-center justify-center text-sm transition-all cursor-pointer">
              <i class="fa-solid fa-chevron-right"></i>
          </button>
      </div>
      <div id="lightboxIndicator" class="mt-4 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-mono text-gray-300">1 / 1</div>
    `;
    document.body.appendChild(lightbox);

    window.addEventListener("keydown", (e) => {
      if (document.getElementById("globalLightbox").classList.contains("pointer-events-none")) return;
      if (e.key === "Escape") closeGlobalLightbox();
      if (e.key === "ArrowLeft") changeLightboxPhoto(-1);
      if (e.key === "ArrowRight") changeLightboxPhoto(1);
    });
  }

  updateLightboxDOM();
  lightbox.classList.remove("pointer-events-none", "opacity-0");
};

window.closeGlobalLightbox = function () {
  const lightbox = document.getElementById("globalLightbox");
  if (lightbox) lightbox.classList.add("pointer-events-none", "opacity-0");
};

window.changeLightboxPhoto = function (dir) {
  if (lightboxPhotos.length <= 1) return;
  lightboxIndex = (lightboxIndex + dir + lightboxPhotos.length) % lightboxPhotos.length;
  updateLightboxDOM();
};

function updateLightboxDOM() {
  const img = document.getElementById("lightboxImg");
  const indicator = document.getElementById("lightboxIndicator");
  if (img && lightboxPhotos[lightboxIndex]) {
    img.src = lightboxPhotos[lightboxIndex];
    indicator.textContent = `${lightboxIndex + 1} / ${lightboxPhotos.length}`;
  }
}

// 渲染卡片
function createCardElement(item) {
  const card = document.createElement("article");
  card.className = "diary-card theme-custom-card border rounded-2xl p-5 shadow-xs hover:shadow-md transition-all relative group flex items-start gap-4";

  const nickname = item.nickname || "NAHK";
  const displayTime = formatToSlashTime(item.time);

  card.dataset.time = item.time;
  card.dataset.nickname = nickname;

  const photos = parsePhotos(item.photo);
  const imageHtml = renderPhotoGalleryHTML(photos);

  // 修复：显式设定本地完整路径
  card.innerHTML = `
    <img src="file:///android_asset/tx.png" class="w-8 h-8 rounded-full border border-gray-100 dark:border-gray-800 shrink-0 object-cover" alt="Avatar" onerror="this.src='https://api.dicebear.com/7.x/bottts/svg?seed=NAHK';">

    <div class="space-y-1.5 flex-1 text-left">
        <div class="flex items-center gap-2">
            <span class="text-xs font-bold" style="color: var(--text-main);">${escapeHtml(nickname)}</span>
            <span class="text-[10px] text-gray-400 font-mono flex items-center pt-0.5">
                <i class="fa-regular fa-clock mr-1 text-[9px]"></i>${displayTime}
            </span>
        </div>
        ${imageHtml}
        <p class="text-sm whitespace-pre-wrap leading-relaxed pr-6" style="color: var(--text-diary); font-family: system-ui;">${escapeHtml(item.content)}</p>
    </div>

    <button class="delete-btn absolute top-4 right-4 w-7 h-7 rounded-xl bg-gray-500/5 hover:bg-red-50 dark:hover:bg-red-950/30 text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 transition-all cursor-pointer flex items-center justify-center border border-gray-500/10 hover:border-red-200 dark:hover:border-red-900/50 md:opacity-0 group-hover:opacity-100" title="抹去这段记忆">
        <i class="fa-regular fa-trash-can text-[11px]"></i>
    </button>
  `;

  // 绑定调用高级弹窗事件
  card.querySelector(".delete-btn").addEventListener("click", () => {
    openDeleteModal(item.time, nickname, card);
  });
  return card;
}

// 加载逻辑
async function fetchDiaries() {
  if (!diaryList) return;
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/diary`, {
      method: "GET",
      headers: headers,
    });

    if (!response.ok) throw new Error("云端同步失败");
    let data = await response.json();

    if (loadingSpinner) loadingSpinner.style.display = "none";
    diaryList.innerHTML = "";

    if (data.length === 0) {
      diaryList.innerHTML = `<div class="theme-custom-card text-center py-16 border rounded-3xl text-gray-400"><i class="fa-regular fa-folder-open text-3xl mb-3 block text-gray-300"></i>这里还没有数据，快留下你的第一条心事吧。</div>`;
      return;
    }

    data.sort((a, b) => {
      let timeA = new Date(a.time.replace(/-/g, "/")).getTime() || 0;
      let timeB = new Date(b.time.replace(/-/g, "/")).getTime() || 0;
      return timeB - timeA;
    });

    const latestFiveDiaries = data.slice(0, 5);
    latestFiveDiaries.forEach((item) => {
      diaryList.appendChild(createCardElement(item));
    });
  } catch (error) {
    if (loadingSpinner)
      loadingSpinner.innerHTML = `<span class="text-red-500 text-xs"><i class="fa-solid fa-triangle-exclamation mr-1"></i>记忆加载失败，请刷新</span>`;
  }
}

// 写入逻辑
if (saveBtn) {
  saveBtn.addEventListener("click", async () => {
    const content = textarea.value.trim();
    let photoUrl = inputPhoto ? inputPhoto.value.trim() : "";
    if (!content) return;

    saveBtn.disabled = true;
    const originalHtml = saveBtn.innerHTML;
    saveBtn.innerHTML = `<i class="fa-solid fa-circle-notch animate-spin text-xs"></i> 正在封装...`;

    if (photoUrl) {
      photoUrl = photoUrl.split(/[,，\s\r\n]+/).map((url) => url.trim()).filter((url) => url !== "").join(",");
    }

    const currentTime = getBeijingTime();

    try {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/diary`, {
        method: "POST",
        headers: headers,
        body: JSON.stringify({
          content: content,
          time: currentTime,
          nickname: "NAHK",
          photo: photoUrl || null,
        }),
      });

      if (!response.ok) throw new Error("写入失败");

      textarea.value = "";
      if (inputPhoto) inputPhoto.value = "";
      charCount.textContent = "0 字";
      await fetchDiaries();
    } catch (error) {
      alert("写入失败，请检查网络连接！");
    } finally {
      saveBtn.disabled = false;
      saveBtn.innerHTML = originalHtml;
    }
  });
}

// ==========================================================================
// 🔴 新版：高颜值自定义弹窗控制核心引擎
// ==========================================================================
function openDeleteModal(time, nickname, cardElement) {
  if (!time) {
    alert("暂无时间定位点，无法删除");
    return;
  }
  // 暂存待删除的数据节点
  activeDeleteContext = { time, nickname, cardElement };

  const modal = document.getElementById("deleteModal");
  const innerCard = modal.querySelector(".relative");
  const pwdInput = document.getElementById("modalPwdInput");

  pwdInput.value = ""; // 清空上一次的输入值

  // 移去隔离属性，添加透明度淡入以及卡片缩启动效
  modal.classList.remove("pointer-events-none", "opacity-0");
  innerCard.classList.remove("scale-90");
  innerCard.classList.add("scale-100");

  setTimeout(() => pwdInput.focus(), 150);
}

window.closeDeleteModal = function () {
  const modal = document.getElementById("deleteModal");
  const innerCard = modal.querySelector(".relative");

  modal.classList.add("pointer-events-none", "opacity-0");
  innerCard.classList.remove("scale-100");
  innerCard.classList.add("scale-90");

  activeDeleteContext = null;
};

async function executeDeleteDiary() {
  if (!activeDeleteContext) return;
  const { time, nickname, cardElement } = activeDeleteContext;

  const inputPwd = document.getElementById("modalPwdInput").value.trim();
  if (!inputPwd) {
    alert("密码拒绝：核验暗号不能为空。");
    return;
  }

  const confirmBtn = document.getElementById("modalConfirmBtn");
  const originalHtml = confirmBtn.innerHTML;

  // 切换为加载态
  confirmBtn.disabled = true;
  confirmBtn.innerHTML = `<i class="fa-solid fa-circle-notch animate-spin text-[10px]"></i> 湮灭中`;

  try {
    const WORKER_URL = "https://api-delete.nahk.online/";

    const response = await fetch(WORKER_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        password: inputPwd,
        time: time,
        nickname: nickname,
      }),
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(result.message || "删除核验未通过");
    }

    // 成功则关闭弹窗
    closeDeleteModal();

    // 启动精致的流式淡出收缩动画
    cardElement.style.transition = "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)";
    cardElement.style.opacity = "0";
    cardElement.style.transform = "scale(0.85)";

    setTimeout(() => {
      cardElement.remove();
      if (diaryList.children.length === 0) {
        diaryList.innerHTML = `<div class="theme-custom-card text-center py-16 border rounded-3xl text-gray-400"><i class="fa-regular fa-folder-open text-3xl mb-3 block text-gray-300"></i>这里还没有数据，快留下你的第一条心事吧。</div>`;
      }
    }, 300);

  } catch (error) {
    alert("抹去记忆失败: " + error.message);
  } finally {
    confirmBtn.disabled = false;
    confirmBtn.innerHTML = originalHtml;
  }
}

// 绑定确认键与回车监听
document.getElementById("modalConfirmBtn").addEventListener("click", executeDeleteDiary);
document.getElementById("modalPwdInput").addEventListener("keydown", (e) => {
  if (e.key === "Enter") executeDeleteDiary();
});


// 备份导出
if (exportBtn) {
  exportBtn.addEventListener("click", async () => {
    const originalHtml = exportBtn.innerHTML;
    exportBtn.disabled = true;
    exportBtn.innerHTML = `<i class="fa-solid fa-circle-notch animate-spin mr-1"></i>导出中`;

    try {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/diary`, {
        method: "GET",
        headers: headers,
      });

      if (!response.ok) throw new Error("同步云端数据失败。");
      let rawData = await response.json();

      if (rawData.length === 0) {
        alert("云端暂无回忆数据，无需导出。");
        return;
      }

      rawData.sort((a, b) => {
        let timeA = new Date(a.time.replace(/-/g, "/")).getTime() || 0;
        let timeB = new Date(b.time.replace(/-/g, "/")).getTime() || 0;
        return timeB - timeA;
      });

      const cleanBackupData = rawData.map((item) => ({
        time: formatToSlashTime(item.time),
        nickname: item.nickname || "NAHK",
        content: item.content,
        photo: item.photo || null,
      }));

      const jsonString = JSON.stringify(cleanBackupData, null, 2);
      const blob = new Blob([jsonString], { type: "application/json;charset=utf-8;" });
      const link = document.createElement("a");

      const dateStr = new Date().toLocaleDateString("zh-CN").replace(/\//g, "-");
      link.href = URL.createObjectURL(blob);
      link.setAttribute("download", `capsule-diary-${dateStr}.json`);

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      const currentTime = getBeijingTime();
      const updateResponse = await fetch(`${SUPABASE_URL}/rest/v1/config_status?key=eq.last_backup_time`, {
        method: "PATCH",
        headers: headers,
        body: JSON.stringify({
          value: currentTime,
          updated_at: new Date().toISOString()
        }),
      });

      if (!updateResponse.ok) throw new Error("写入云端备份表失败");

      localStorage.setItem("last_backup_time", currentTime);
      updateBackupStatusDisplay();

    } catch (error) {
      alert("导出或更新云端状态失败: " + error.message);
    } finally {
      exportBtn.disabled = false;
      exportBtn.innerHTML = originalHtml;
    }
  });
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (s) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[s]);
}

async function fetchBackupStatusFromCloud() {
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/config_status?key=eq.last_backup_time`, {
      method: "GET",
      headers: headers,
    });

    if (!response.ok) throw new Error("获取云端备份状态失败");
    const data = await response.json();

    if (data && data.length > 0) {
      const cloudTime = data[0].value;
      if (cloudTime !== "从未备份") {
        localStorage.setItem("last_backup_time", cloudTime);
      } else {
        localStorage.removeItem("last_backup_time");
      }
      updateBackupStatusDisplay();
    }
  } catch (error) {
    console.error("同步云端备份时间失败:", error);
  }
}

function updateBackupStatusDisplay() {
  const lastBackupStr = localStorage.getItem("last_backup_time");
  const timeEl = document.getElementById("lastBackupTime");
  const warningEl = document.getElementById("backupWarning");

  if (!timeEl) return;

  if (!lastBackupStr) {
    timeEl.textContent = "从未备份";
    if (warningEl) warningEl.classList.remove("hidden");
    return;
  }

  const backupDate = new Date(lastBackupStr.replace(/-/g, "/"));
  const M = backupDate.getMonth() + 1;
  const D = backupDate.getDate();
  const h = String(backupDate.getHours()).padStart(2, "0");
  const m = String(backupDate.getMinutes()).padStart(2, "0");
  timeEl.textContent = `${M}月${D}日 ${h}:${m}`;

  const oneWeekMs = 7 * 24 * 60 * 60 * 1000;
  const isOverdue = new Date().getTime() - backupDate.getTime() > oneWeekMs;

  if (warningEl) {
    if (isOverdue) warningEl.classList.remove("hidden");
    else warningEl.classList.add("hidden");
  }
}

// 统一启动
initTheme();
fetchBackupStatusFromCloud();
fetchDiaries();
updateBackupStatusDisplay();