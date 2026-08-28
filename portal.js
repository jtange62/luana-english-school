const appKind = document.body.dataset.app;

function isParentPresentation() {
  return appKind === "parents";
}

function isStaffPresentation() {
  return appKind === "staff";
}

const SUMMER_WEEKS = [
  {
    slug: "week-1-festivals",
    shortTitle: "Week 1",
    dateRange: "7/27 – 7/31",
    emoji: "🌎",
    theme: "festivals",
    days: [
      { date: "2026-07-27", title: "Thailand — Songkran", badge: "💦 Songkran" },
      { date: "2026-07-28", title: "Brazil — Carnival", badge: "🎭 Carnival" },
      { date: "2026-07-29", title: "India — Holi", badge: "🎨 Holi" },
      { date: "2026-07-30", title: "Japan — Matsuri", badge: "🏮 Matsuri" },
      { date: "2026-07-31", title: "Field Trip — teamLab", badge: "🚌 Field Trip: teamLab" }
    ],
    title: "Festivals of the World",
    description: "Celebrations, games, crafts, and traditions from around the world.",
    shortTitleJa: "第1週",
    titleJa: "世界のお祭り",
    descriptionJa: "世界のお祭りや文化を、ゲームや工作を通して楽しみます。"
  },
  {
    slug: "week-2-ocean",
    shortTitle: "Week 2",
    dateRange: "8/3 – 8/7",
    emoji: "🐠",
    theme: "ocean",
    days: [
      { date: "2026-08-03", title: "Ocean Life", badge: "🐠 Ocean Life" },
      { date: "2026-08-04", title: "Coral Reef", badge: "🪸 Coral Reef" },
      { date: "2026-08-05", title: "Tides & Waves", badge: "🌊 Tides & Waves" },
      { date: "2026-08-06", title: "Conservation & Climate", badge: "🌍 Conservation & Climate" },
      { date: "2026-08-07", title: "Field Trip — Enoshima Aquarium", badge: "🚌 Field Trip: Enoshima Aquarium" }
    ],
    title: "Ocean Explorers",
    description: "Ocean activities, crafts, games, and discoveries.",
    shortTitleJa: "第2週",
    titleJa: "海の探検",
    descriptionJa: "海をテーマにしたアクティビティや工作、ゲームに挑戦します。"
  },
  {
    slug: "week-3-adventure",
    shortTitle: "Week 3",
    dateRange: "8/17 – 8/21",
    emoji: "🧭",
    theme: "adventure",
    days: [
      { date: "2026-08-17", title: "Survival Priorities", badge: "🧰 Survival Priorities" },
      { date: "2026-08-18", title: "Preparation & Teamwork", badge: "🤝 Preparation & Teamwork" },
      { date: "2026-08-19", title: "Navigation", badge: "🧭 Navigation" },
      { date: "2026-08-20", title: "Resource Management", badge: "🎒 Resource Management" },
      { date: "2026-08-21", title: "Field Trip — Hug-Hug & Westrock Bouldering", badge: "🚌 Field Trip: Hug-Hug & Westrock Bouldering" }
    ],
    title: "Adventure Survival",
    description: "Adventure skills, survival challenges, and teamwork.",
    shortTitleJa: "第3週",
    titleJa: "冒険＆サバイバル",
    descriptionJa: "冒険やサバイバル体験を通して、チームワークを育みます。"
  }
];

const demoPosts = [
  {
    id: "demo-water-fight",
    date: "2026-07-27",
    week: "week-1-festivals",
    title: "Making Carnival Masks",
    body: "カーニバルの音楽やダンスを楽しみ、カラフルなマスクを作りました。",
    activities: ["Music", "Dancing", "Mask Making"],
    status: "published",
    photos: [
      { url: "/photos/gallery-optimized/960/Everyday%20Moments/July%202026/photo-35.webp", alt: "Summer activity" },
      { url: "/photos/gallery-optimized/960/Everyday%20Moments/July%202026/photo-23.webp", alt: "Summer activity" }
    ]
  }
];

function formatDate(dateText) {
  const parentView = appKind === "parents";
  return new Intl.DateTimeFormat(parentView ? "ja-JP" : "en", {
    weekday: parentView ? "long" : "short",
    month: parentView ? "long" : "short",
    day: "numeric",
    year: "numeric"
  }).format(new Date(`${dateText}T00:00:00`));
}

function formatDailyDate(dateText, weekday = "long") {
  const date = new Date(`${dateText}T00:00:00`);
  const dayName = new Intl.DateTimeFormat("en-US", { weekday }).format(date).toUpperCase();
  return `${dayName} • ${date.getMonth() + 1}/${date.getDate()}`;
}

function escapeText(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function escapeAttribute(value) {
  return escapeText(value).replaceAll('"', "&quot;");
}

function weekFor(slug) {
  return SUMMER_WEEKS.find(week => week.slug === slug) || SUMMER_WEEKS[0];
}

function scheduledDay(date, weekSlug) {
  const week = weekFor(weekSlug);
  return week.days.find(day => day.date === date) || {
    date,
    title: "Summer School",
    badge: "📷 Summer School"
  };
}

function weekForDate(date) {
  return SUMMER_WEEKS.find(week => week.days.some(day => day.date === date));
}

function localDateValue(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function newUploadId() {
  if (crypto.randomUUID) return crypto.randomUUID();
  const random = crypto.getRandomValues(new Uint32Array(2));
  return `upload-${Date.now()}-${random[0]}-${random[1]}`;
}

function initialWeek(posts, availableWeeks = SUMMER_WEEKS) {
  const allowed = new Set(availableWeeks.map(week => week.slug));
  const latest = posts.find(post => allowed.has(post.week));
  return latest?.week || availableWeeks[0]?.slug || SUMMER_WEEKS[0].slug;
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    credentials: "include",
    headers: options.body instanceof FormData ? undefined : { "content-type": "application/json" },
    ...options
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const fallbackMessage = response.status === 413
      ? "This photo is too large to upload. Try a smaller version."
      : response.status >= 500
        ? "The upload was interrupted. Please try again."
        : "Request failed";
    const error = new Error(data.error || fallbackMessage);
    error.data = data;
    error.status = response.status;
    throw error;
  }
  return data;
}

function showSetupBanner(id) {
  const banner = document.getElementById(id);
  if (banner) banner.hidden = false;
}

let lightboxPhotos = [];
let lightboxIndex = 0;
let albumRenderCount = 0;
let albumObserver;
let lightboxReturnFocus;
const ALBUM_BATCH_SIZE = 12;
const MAX_SELECTED_PHOTOS = 10;
const MAX_UPLOAD_PHOTO_BYTES = 20 * 1024 * 1024;
const UPLOAD_QUEUE_CONCURRENCY = 1;
const UPLOAD_PHOTO_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"]);
const UPLOAD_PHOTO_NAME_PATTERN = /\.(?:jpe?g|png|webp|heic|heif)$/i;
let albumSelectionMode = false;
let albumActionMode = "save";
let galleryChanged = null;
let selectedPhotoIndexes = new Set();
let selectedPhotoFiles = [];
let nativeFileShareAvailable = false;
let shareFilePromises = new Map();
let shareReadinessRevision = 0;
let shareReadinessTimer = 0;

const ZIP_CRC_TABLE = Array.from({ length: 256 }, (_, value) => {
  let crc = value;
  for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  return crc >>> 0;
});

function zipCrc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) crc = (crc >>> 8) ^ ZIP_CRC_TABLE[(crc ^ byte) & 0xff];
  return (crc ^ 0xffffffff) >>> 0;
}

function zipHeader(length) {
  const bytes = new Uint8Array(length);
  return { bytes, view: new DataView(bytes.buffer) };
}

function createStoredZip(files) {
  const encoder = new TextEncoder();
  const localParts = [];
  const centralParts = [];
  let offset = 0;
  files.forEach(file => {
    const name = encoder.encode(file.name);
    const crc = zipCrc32(file.bytes);
    const local = zipHeader(30);
    local.view.setUint32(0, 0x04034b50, true);
    local.view.setUint16(4, 20, true);
    local.view.setUint16(6, 0x0800, true);
    local.view.setUint32(14, crc, true);
    local.view.setUint32(18, file.bytes.length, true);
    local.view.setUint32(22, file.bytes.length, true);
    local.view.setUint16(26, name.length, true);
    localParts.push(local.bytes, name, file.bytes);

    const central = zipHeader(46);
    central.view.setUint32(0, 0x02014b50, true);
    central.view.setUint16(4, 20, true);
    central.view.setUint16(6, 20, true);
    central.view.setUint16(8, 0x0800, true);
    central.view.setUint32(16, crc, true);
    central.view.setUint32(20, file.bytes.length, true);
    central.view.setUint32(24, file.bytes.length, true);
    central.view.setUint16(28, name.length, true);
    central.view.setUint32(42, offset, true);
    centralParts.push(central.bytes, name);
    offset += local.bytes.length + name.length + file.bytes.length;
  });
  const centralSize = centralParts.reduce((total, part) => total + part.length, 0);
  const end = zipHeader(22);
  end.view.setUint32(0, 0x06054b50, true);
  end.view.setUint16(8, files.length, true);
  end.view.setUint16(10, files.length, true);
  end.view.setUint32(12, centralSize, true);
  end.view.setUint32(16, offset, true);
  return new Blob([...localParts, ...centralParts, end.bytes], { type: "application/zip" });
}

function photoUrlWithParameter(photo, parameter) {
  const separator = photo.url.includes("?") ? "&" : "?";
  return `${photo.url}${separator}${parameter}`;
}

function updateLightbox() {
  const image = document.getElementById("lightbox-image");
  const counter = document.getElementById("lightbox-counter");
  const previous = document.getElementById("lightbox-prev");
  const next = document.getElementById("lightbox-next");
  const download = document.getElementById("photo-download");
  const photo = lightboxPhotos[lightboxIndex];
  if (!image || !photo) return;
  image.src = photo.url;
  image.alt = photo.alt || "";
  if (download) {
    download.href = photoUrlWithParameter(photo, "download=1");
  }
  if (counter) counter.textContent = `${lightboxIndex + 1} / ${lightboxPhotos.length}`;
  if (previous) previous.hidden = lightboxPhotos.length < 2;
  if (next) next.hidden = lightboxPhotos.length < 2;
  [lightboxIndex - 1, lightboxIndex + 1].forEach(index => {
    const nearby = lightboxPhotos[(index + lightboxPhotos.length) % lightboxPhotos.length];
    if (nearby) new Image().src = nearby.url;
  });
}

function showPhotoViewer(startIndex = 0) {
  const browser = document.getElementById("album-browser");
  const viewer = document.getElementById("photo-viewer");
  if (!viewer || !lightboxPhotos.length) return;
  lightboxIndex = Math.max(0, Math.min(startIndex, lightboxPhotos.length - 1));
  if (browser) browser.hidden = true;
  viewer.hidden = false;
  updateLightbox();
  document.getElementById("viewer-close")?.focus();
}

function appendAlbumBatch() {
  const grid = document.getElementById("album-browser-grid");
  const sentinel = document.getElementById("album-browser-sentinel");
  if (!grid || albumRenderCount >= lightboxPhotos.length) return;
  const batchEnd = Math.min(albumRenderCount + ALBUM_BATCH_SIZE, lightboxPhotos.length);
  lightboxPhotos.slice(albumRenderCount, batchEnd).forEach((photo, offset) => {
    const index = albumRenderCount + offset;
    const button = document.createElement("button");
    button.type = "button";
    button.className = "album-browser-photo";
    button.dataset.photoIndex = String(index);
    button.setAttribute("aria-label", `写真 ${index + 1} を開く`);
    button.innerHTML = `<img src="${escapeAttribute(photo.thumbnailUrl || photo.url)}" alt="${escapeAttribute(photo.alt || "")}" loading="lazy" decoding="async"><span class="album-photo-number">${index + 1}</span><span class="album-photo-check" aria-hidden="true">✓</span>`;
    let longPressTriggered = false;
    let longPressTimer;
    let pointerStart = null;
    button.addEventListener("pointerdown", event => {
      if (event.pointerType === "mouse" || albumSelectionMode) return;
      pointerStart = { x: event.clientX, y: event.clientY };
      longPressTimer = window.setTimeout(() => {
        longPressTriggered = true;
        setAlbumSelectionMode(true);
        toggleSelectedPhoto(index);
        navigator.vibrate?.(30);
      }, 550);
    });
    button.addEventListener("pointermove", event => {
      if (!pointerStart || !longPressTimer) return;
      if (Math.hypot(event.clientX - pointerStart.x, event.clientY - pointerStart.y) > 10) {
        clearTimeout(longPressTimer);
        longPressTimer = null;
      }
    });
    ["pointerup", "pointercancel", "pointerleave"].forEach(type => {
      button.addEventListener(type, () => {
        clearTimeout(longPressTimer);
        longPressTimer = null;
        pointerStart = null;
      });
    });
    button.addEventListener("click", () => {
      if (longPressTriggered) {
        longPressTriggered = false;
        return;
      }
      if (albumSelectionMode) toggleSelectedPhoto(index);
      else showPhotoViewer(index);
    });
    grid.append(button);
  });
  refreshAlbumSelection();
  albumRenderCount = batchEnd;
  if (sentinel) sentinel.hidden = albumRenderCount >= lightboxPhotos.length;
}

function setAlbumSelectionMode(enabled) {
  albumSelectionMode = enabled;
  if (!enabled) {
    selectedPhotoIndexes.clear();
    selectedPhotoFiles = [];
    nativeFileShareAvailable = false;
    shareFilePromises.clear();
    shareReadinessRevision += 1;
    window.clearTimeout(shareReadinessTimer);
    shareReadinessTimer = 0;
  }
  refreshAlbumSelection();
  if (albumActionMode === "delete") updateDeleteReadiness();
  else scheduleShareReadiness();
}

function validUploadPhoto(file) {
  const supported = UPLOAD_PHOTO_TYPES.has(file.type) || UPLOAD_PHOTO_NAME_PATTERN.test(file.name || "");
  return supported && file.size <= MAX_UPLOAD_PHOTO_BYTES;
}

function toggleSelectedPhoto(index) {
  const help = document.getElementById("album-selection-help");
  const selectionLimit = albumActionMode === "delete" || isStaffPresentation()
    ? lightboxPhotos.length
    : MAX_SELECTED_PHOTOS;
  if (selectedPhotoIndexes.has(index)) {
    selectedPhotoIndexes.delete(index);
    shareFilePromises.delete(index);
  } else if (selectedPhotoIndexes.size < selectionLimit) {
    selectedPhotoIndexes.add(index);
  } else {
    if (help) help.textContent = isParentPresentation()
      ? "一度に保存できる写真は10枚までです"
      : "You can save up to 10 photos at a time";
    return;
  }
  refreshAlbumSelection(index);
  if (albumActionMode === "delete") updateDeleteReadiness();
  else scheduleShareReadiness();
}

function updateDeleteReadiness() {
  const button = document.getElementById("album-share-selected");
  const help = document.getElementById("album-selection-help");
  if (button) button.disabled = !selectedPhotoIndexes.size;
  if (help) help.textContent = selectedPhotoIndexes.size
    ? "Selected photos will be permanently deleted"
    : "Tap the photos you want to delete";
}

function refreshAlbumSelection(changedIndex = null) {
  const bar = document.getElementById("album-selection-bar");
  const toggle = document.getElementById("album-select-toggle");
  const count = document.getElementById("album-selection-count");
  const selectAll = document.getElementById("album-select-all");
  const parentView = isParentPresentation();
  if (bar) bar.hidden = !albumSelectionMode;
  if (toggle) {
    toggle.textContent = albumSelectionMode
      ? parentView ? "選択をやめる" : "Cancel selection"
      : albumActionMode === "delete"
        ? "Select photos"
        : parentView ? "写真をまとめて保存" : "Save multiple";
    toggle.setAttribute("aria-pressed", String(albumSelectionMode));
  }
  if (count) count.textContent = albumActionMode === "delete"
    ? `${selectedPhotoIndexes.size} of ${lightboxPhotos.length} selected`
    : isStaffPresentation()
      ? `${selectedPhotoIndexes.size} selected`
    : parentView
      ? `${selectedPhotoIndexes.size} / ${MAX_SELECTED_PHOTOS}枚選択中`
      : `${selectedPhotoIndexes.size} / ${MAX_SELECTED_PHOTOS} selected`;
  if (selectAll) {
    selectAll.hidden = albumActionMode !== "delete" && !isStaffPresentation();
    selectAll.textContent = selectedPhotoIndexes.size === lightboxPhotos.length ? "Clear all" : "Select all";
  }
  const selector = changedIndex === null
    ? ".album-browser-photo"
    : `.album-browser-photo[data-photo-index="${changedIndex}"]`;
  document.querySelectorAll(selector).forEach(button => refreshAlbumPhotoSelection(button, parentView));
}

function refreshAlbumPhotoSelection(button, parentView = isParentPresentation()) {
  const index = Number(button.dataset.photoIndex);
  const selected = selectedPhotoIndexes.has(index);
  button.classList.toggle("is-selected", selected);
  if (albumSelectionMode) {
    button.setAttribute("aria-pressed", String(selected));
    button.setAttribute("aria-label", parentView
      ? `写真 ${index + 1} を${selected ? "選択解除" : "選択"}`
      : `${selected ? "Deselect" : "Select"} photo ${index + 1}`);
  } else {
    button.removeAttribute("aria-pressed");
    button.setAttribute("aria-label", parentView
      ? `写真 ${index + 1} を開く`
      : `Open photo ${index + 1}`);
  }
}

function prepareShareFile(index) {
  if (shareFilePromises.has(index)) return shareFilePromises.get(index);
  const photo = lightboxPhotos[index];
  const promise = fetch(photoUrlWithParameter(photo, "share=1"), {
    credentials: "same-origin"
  }).then(async response => {
    if (!response.ok) throw new Error("Could not prepare photo");
    const blob = await response.blob();
    const extensionByType = {
      "image/jpeg": "jpg",
      "image/png": "png",
      "image/webp": "webp",
      "image/heic": "heic",
      "image/heif": "heif"
    };
    const type = blob.type || "image/jpeg";
    const extension = extensionByType[type] || "jpg";
    return new File([blob], `luana-photo-${String(index + 1).padStart(2, "0")}.${extension}`, {
      type
    });
  });
  shareFilePromises.set(index, promise);
  return promise;
}

function scheduleShareReadiness() {
  shareReadinessRevision += 1;
  window.clearTimeout(shareReadinessTimer);
  shareReadinessTimer = window.setTimeout(updateShareReadiness, 80);
}

async function updateShareReadiness() {
  const revision = ++shareReadinessRevision;
  shareReadinessTimer = 0;
  const button = document.getElementById("album-share-selected");
  const help = document.getElementById("album-selection-help");
  const parentView = isParentPresentation();
  selectedPhotoFiles = [];
  nativeFileShareAvailable = false;
  if (button) button.disabled = true;
  if (!selectedPhotoIndexes.size) {
    if (help) help.textContent = parentView
      ? "保存したい写真をタップしてください"
      : "Tap the photos you want to save";
    return;
  }
  if (help) help.textContent = parentView ? "写真を準備しています…" : "Preparing photos…";
  if (isStaffPresentation()) {
    if (button) button.disabled = false;
    if (help) help.textContent = `${selectedPhotoIndexes.size} photos will download to this device`;
    return;
  }
  try {
    const indexes = [...selectedPhotoIndexes].sort((a, b) => a - b);
    const files = await Promise.all(indexes.map(prepareShareFile));
    if (revision !== shareReadinessRevision) return;
    selectedPhotoFiles = files;
    nativeFileShareAvailable = typeof navigator.share === "function" &&
      (!navigator.canShare || navigator.canShare({ files }));
    if (button) button.disabled = false;
    if (help) {
      help.textContent = nativeFileShareAvailable
        ? parentView
          ? "次の画面で「画像を保存」を選びます"
          : "Choose “Save Images” on the next screen"
        : parentView
          ? "選んだ写真を端末にダウンロードします"
          : "The selected photos will download to this device";
    }
  } catch {
    if (revision !== shareReadinessRevision) return;
    if (help) help.textContent = parentView
      ? "この端末では1枚ずつ保存してください"
      : "Please save photos individually on this device";
  }
}

async function shareSelectedPhotos() {
  const help = document.getElementById("album-selection-help");
  const parentView = isParentPresentation();
  if (isStaffPresentation()) {
    const indexes = [...selectedPhotoIndexes].sort((a, b) => a - b);
    if (!indexes.length) return;
    const button = document.getElementById("album-share-selected");
    if (button) button.disabled = true;
    if (help) help.textContent = `Preparing 0 of ${indexes.length} photos for one ZIP…`;
    let prepared = 0;
    try {
      const files = await Promise.all(indexes.map(async index => {
        const response = await fetch(photoUrlWithParameter(lightboxPhotos[index], "download=1"), {
          credentials: "same-origin"
        });
        if (!response.ok) throw new Error("Could not download photo");
        const blob = await response.blob();
        const extensionByType = {
          "image/jpeg": "jpg",
          "image/png": "png",
          "image/webp": "webp",
          "image/heic": "heic",
          "image/heif": "heif"
        };
        const extension = extensionByType[blob.type] || "jpg";
        const uniqueId = String(lightboxPhotos[index].id || index + 1).replace(/[^a-z0-9_-]/gi, "-");
        prepared += 1;
        if (help) help.textContent = `Preparing ${prepared} of ${indexes.length} photos for one ZIP…`;
        return {
          name: `luana-photo-${String(index + 1).padStart(3, "0")}-${uniqueId}.${extension}`,
          bytes: new Uint8Array(await blob.arrayBuffer())
        };
      }));
      const objectUrl = URL.createObjectURL(createStoredZip(files));
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = "luana-album-photos.zip";
      link.hidden = true;
      document.body.append(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60000);
      if (help) help.textContent = `${indexes.length} photos downloaded in one ZIP`;
    } catch {
      if (help) help.textContent = "Could not create the album ZIP. Please try again";
    } finally {
      if (button) button.disabled = false;
    }
    return;
  }
  if (!selectedPhotoFiles.length) return;
  if (nativeFileShareAvailable) {
    navigator.share({
      files: selectedPhotoFiles,
      title: parentView ? "Luanaの写真" : "Luana photos"
    }).then(() => {
      if (help) help.textContent = parentView
        ? "共有画面で保存先を選べます"
        : "Choose where to save from the share sheet";
    }).catch(error => {
      if (error.name !== "AbortError" && help) {
        help.textContent = parentView ? "保存できませんでした。もう一度お試しください" : "Could not save. Please try again";
      }
    });
    return;
  }

  selectedPhotoFiles.forEach(file => {
    const objectUrl = URL.createObjectURL(file);
    const link = document.createElement("a");
    link.href = objectUrl;
    link.download = file.name;
    link.hidden = true;
    document.body.append(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60000);
  });
  if (help) help.textContent = parentView
    ? "ダウンロードが始まりました"
    : "Downloads started";
}

async function deleteSelectedPhotos() {
  const indexes = [...selectedPhotoIndexes].sort((a, b) => a - b);
  if (!indexes.length) return;
  const label = indexes.length === 1 ? "this photo" : `these ${indexes.length} photos`;
  if (!window.confirm(`Permanently delete ${label}? This cannot be undone.`)) return;
  const button = document.getElementById("album-share-selected");
  const help = document.getElementById("album-selection-help");
  if (button) button.disabled = true;
  if (help) help.textContent = `Deleting 0 of ${indexes.length} photos…`;
  let deleted = 0;
  const failed = [];
  for (const index of indexes) {
    const photo = lightboxPhotos[index];
    try {
      await api(`/api/staff/photos/${encodeURIComponent(photo.id)}`, { method: "DELETE" });
      deleted += 1;
    } catch (error) {
      failed.push(error);
    }
    if (help) help.textContent = `Deleting ${deleted + failed.length} of ${indexes.length} photos…`;
  }
  await galleryChanged?.();
  closeGallery();
  if (failed.length) window.alert(`${deleted} deleted; ${failed.length} could not be deleted. Please try again.`);
}

function showAlbumBrowser(reset = false) {
  const browser = document.getElementById("album-browser");
  const viewer = document.getElementById("photo-viewer");
  const grid = document.getElementById("album-browser-grid");
  const count = document.getElementById("album-browser-count");
  const sentinel = document.getElementById("album-browser-sentinel");
  if (!browser || !grid) return;
  if (viewer) viewer.hidden = true;
  browser.hidden = false;
  if (reset) setAlbumSelectionMode(false);
  if (count) count.textContent = `${lightboxPhotos.length}枚`;
  if (reset || !grid.children.length) {
    grid.innerHTML = "";
    albumRenderCount = 0;
    appendAlbumBatch();
    albumObserver?.disconnect();
    if ("IntersectionObserver" in window && sentinel) {
      albumObserver = new IntersectionObserver(entries => {
        if (entries.some(entry => entry.isIntersecting)) appendAlbumBatch();
      }, { root: browser, rootMargin: "300px" });
      albumObserver.observe(sentinel);
    } else {
      while (albumRenderCount < lightboxPhotos.length) appendAlbumBatch();
    }
    browser.scrollTop = 0;
  }
  document.getElementById("lightbox-close")?.focus();
}

function openGallery(photos, startIndex = null, options = {}) {
  const box = document.getElementById("lightbox");
  if (!box || !photos?.length) return;
  lightboxPhotos = photos;
  albumActionMode = options.action === "delete" ? "delete" : "save";
  galleryChanged = options.onChanged || null;
  const selectToggle = document.getElementById("album-select-toggle");
  const actionButton = document.getElementById("album-share-selected");
  const selectAll = document.getElementById("album-select-all");
  if (selectToggle) selectToggle.textContent = albumActionMode === "delete" ? "Select photos" : "Save multiple";
  if (actionButton) {
    actionButton.textContent = albumActionMode === "delete" ? "Delete selected" : "Save selected photos";
    actionButton.classList.toggle("delete-selected", albumActionMode === "delete");
  }
  if (selectAll) selectAll.hidden = albumActionMode !== "delete" && !isStaffPresentation();
  lightboxReturnFocus = document.activeElement;
  box.hidden = false;
  document.body.classList.add("lightbox-open");
  if (startIndex === null) {
    showAlbumBrowser(true);
    if (albumActionMode === "delete") setAlbumSelectionMode(true);
  } else {
    showPhotoViewer(startIndex);
  }
}

function closeGallery() {
  const box = document.getElementById("lightbox");
  if (!box || box.hidden) return;
  box.hidden = true;
  document.body.classList.remove("lightbox-open");
  albumObserver?.disconnect();
  setAlbumSelectionMode(false);
  document.getElementById("lightbox-image")?.removeAttribute("src");
  document.getElementById("photo-download")?.removeAttribute("href");
  lightboxReturnFocus?.focus?.();
}

function setupLightbox() {
  const box = document.getElementById("lightbox");
  const close = document.getElementById("lightbox-close");
  const viewerClose = document.getElementById("viewer-close");
  const viewerBack = document.getElementById("viewer-back");
  const stage = document.getElementById("lightbox-image-stage");
  const previous = document.getElementById("lightbox-prev");
  const next = document.getElementById("lightbox-next");
  const selectToggle = document.getElementById("album-select-toggle");
  const selectAll = document.getElementById("album-select-all");
  const shareSelected = document.getElementById("album-share-selected");
  if (!box || !close) return;
  close.addEventListener("click", closeGallery);
  viewerClose?.addEventListener("click", closeGallery);
  viewerBack?.addEventListener("click", showAlbumBrowser);
  selectToggle?.addEventListener("click", () => setAlbumSelectionMode(!albumSelectionMode));
  selectAll?.addEventListener("click", () => {
    if (selectedPhotoIndexes.size === lightboxPhotos.length) selectedPhotoIndexes.clear();
    else selectedPhotoIndexes = new Set(lightboxPhotos.map((_, index) => index));
    refreshAlbumSelection();
    if (albumActionMode === "delete") updateDeleteReadiness();
    else scheduleShareReadiness();
  });
  shareSelected?.addEventListener("click", () => {
    if (albumActionMode === "delete") deleteSelectedPhotos();
    else shareSelectedPhotos();
  });
  box.addEventListener("click", event => {
    if (event.target === box) closeGallery();
  });
  previous?.addEventListener("click", () => {
    lightboxIndex = (lightboxIndex - 1 + lightboxPhotos.length) % lightboxPhotos.length;
    updateLightbox();
  });
  next?.addEventListener("click", () => {
    lightboxIndex = (lightboxIndex + 1) % lightboxPhotos.length;
    updateLightbox();
  });
  let touchStartX = 0;
  let touchStartY = 0;
  stage?.addEventListener("touchstart", event => {
    touchStartX = event.changedTouches[0].clientX;
    touchStartY = event.changedTouches[0].clientY;
  }, { passive: true });
  stage?.addEventListener("touchend", event => {
    const distanceX = event.changedTouches[0].clientX - touchStartX;
    const distanceY = event.changedTouches[0].clientY - touchStartY;
    if (Math.abs(distanceX) < 45 || Math.abs(distanceX) < Math.abs(distanceY)) return;
    if (distanceX > 0) previous?.click();
    else next?.click();
  }, { passive: true });
  document.addEventListener("keydown", event => {
    if (event.key === "Escape") closeGallery();
    const viewer = document.getElementById("photo-viewer");
    if (!box.hidden && viewer && !viewer.hidden && event.key === "ArrowLeft") previous?.click();
    if (!box.hidden && viewer && !viewer.hidden && event.key === "ArrowRight") next?.click();
  });
}

function renderWeekTabs(container, selectedSlug, counts, onSelect, availableWeeks = SUMMER_WEEKS) {
  container.innerHTML = "";
  const parentView = isParentPresentation();
  availableWeeks.forEach(week => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "week-tab";
    button.dataset.weekTheme = week.theme;
    button.classList.toggle("is-active", week.slug === selectedSlug);
    button.setAttribute("aria-pressed", String(week.slug === selectedSlug));
    button.innerHTML = `
      <span>${week.shortTitle}${parentView ? ` • ${week.dateRange}` : ""}</span>
      <strong>${parentView ? `${week.emoji} ${week.title}` : week.title}</strong>
      <small>${counts.get(week.slug) || 0}${parentView ? "件のアルバム" : appKind === "staff" ? " photo days" : " albums"}</small>
    `;
    button.addEventListener("click", () => onSelect(week.slug));
    container.append(button);
  });
}

function renderWeekHeading(container, selectedSlug) {
  const week = weekFor(selectedSlug);
  const parentView = isParentPresentation();
  if (parentView) {
    container.innerHTML = `
      <p class="week-campaign-line">${week.shortTitle} • ${week.dateRange}</p>
      <h3 class="week-campaign-theme"><span aria-hidden="true">${week.emoji}</span> ${week.title}</h3>
      <div class="week-motifs" aria-label="${week.title} themes">
        ${week.days.map(day => `<span>${day.badge}</span>`).join("")}
      </div>
    `;
    return;
  }
  container.innerHTML = `
    <p>${week.shortTitle}</p>
    <h3>${week.title}</h3>
    <span>${week.description}</span>
  `;
}

function appendPhotoGrid(card, photos) {
  const grid = card.querySelector(".photo-grid");
  const parentView = isParentPresentation();
  const photoList = photos || [];
  const previewPhotos = appKind === "staff" ? photoList : photoList.slice(0, 4);
  grid.classList.add(`photo-count-${previewPhotos.length}`);
  previewPhotos.forEach((photo, index) => {
    const button = document.createElement("button");
    button.className = "portal-photo";
    button.type = "button";
    button.setAttribute("aria-label", `${parentView ? "写真を開く" : "Open photo"} ${index + 1}`);
    button.innerHTML = `<img src="${escapeAttribute(photo.thumbnailUrl || photo.url)}" alt="${escapeAttribute(photo.alt || "")}" loading="lazy" decoding="async">`;
    if (index === previewPhotos.length - 1 && photoList.length > previewPhotos.length) {
      button.insertAdjacentHTML("beforeend", `<span class="photo-more">+${photoList.length - previewPhotos.length}</span>`);
    }
    button.addEventListener("click", () => {
      if (index === previewPhotos.length - 1 && photoList.length > previewPhotos.length) {
        openGallery(photoList);
      } else {
        openGallery(photoList, index);
      }
    });
    grid.append(button);
  });
  if (!photoList.length) {
    grid.hidden = true;
    return;
  }
  if (appKind === "staff") return;
  const galleryButton = document.createElement("button");
  galleryButton.type = "button";
  galleryButton.className = "view-gallery";
  galleryButton.textContent = parentView
    ? `写真をすべて見る（${photoList.length}枚）`
    : `View all photos (${photoList.length})`;
  galleryButton.addEventListener("click", () => openGallery(photoList));
  grid.insertAdjacentElement("afterend", galleryButton);
}

function activityCard(post, { showDate = true } = {}) {
  const card = document.createElement("article");
  const parentView = isParentPresentation();
  const activities = Array.isArray(post.activities) ? post.activities : [];
  card.className = "post-card activity-card";
  card.dataset.weekTheme = weekFor(post.week).theme;
  card.id = `activity-${post.id}`;
  card.tabIndex = -1;
  card.innerHTML = `
    <div class="post-text">
      ${showDate ? `<p class="post-date">${parentView ? formatDailyDate(post.date) : formatDate(post.date)}</p>` : ""}
      ${post.title ? `<h3>${escapeText(post.title)}</h3>` : ""}
      ${post.body ? `<p class="daily-summary">${escapeText(post.body)}</p>` : ""}
      ${activities.length ? `<div class="activity-tags" aria-label="${parentView ? "今日の活動" : "Activities"}">${activities.map(activity => `<span>${escapeText(activity)}</span>`).join("")}</div>` : ""}
    </div>
    <div class="photo-grid"></div>
  `;
  if (!showDate && !post.title && !post.body && !activities.length) {
    card.querySelector(".post-text").hidden = true;
  }
  appendPhotoGrid(card, post.photos);
  return card;
}

function groupPostsByDate(posts) {
  const groups = [];
  const groupsByDate = new Map();
  posts.forEach(post => {
    if (!groupsByDate.has(post.date)) {
      const group = { date: post.date, week: post.week, posts: [] };
      groupsByDate.set(post.date, group);
      groups.push(group);
    }
    groupsByDate.get(post.date).posts.push(post);
  });
  return groups;
}

function renderDayTabs(container, posts) {
  container.innerHTML = "";
  const groups = groupPostsByDate(posts);
  groups.forEach(group => {
    const day = scheduledDay(group.date, group.week);
    const button = document.createElement("button");
    button.type = "button";
    button.className = "day-tab";
    button.innerHTML = `
      <span>${formatDailyDate(group.date, "short")}</span>
      <strong>${escapeText(day.title)}</strong>
    `;
    button.addEventListener("click", () => {
      const collection = document.getElementById(`day-${group.date}`);
      collection?.scrollIntoView({ behavior: "smooth", block: "start" });
      collection?.focus({ preventScroll: true });
    });
    container.append(button);
  });
  container.hidden = groups.length < 2;
}

function renderDailyCollections(container, posts, decorateCard) {
  groupPostsByDate(posts).forEach(group => {
    const day = scheduledDay(group.date, group.week);
    const dailyPost = {
      id: `day-${group.date}`,
      date: group.date,
      week: group.week,
      title: "",
      body: "",
      activities: [],
      status: group.posts.every(post => post.status === "published") ? "published" : "draft",
      photos: group.posts.flatMap(post => post.photos || [])
    };
    const collection = document.createElement("section");
    collection.className = "daily-collection";
    collection.id = `day-${group.date}`;
    collection.tabIndex = -1;
    collection.innerHTML = `
      <header class="daily-collection-heading">
        <p>${formatDailyDate(group.date)}</p>
        <h3>${escapeText(day.title)}</h3>
        <span>${dailyPost.photos.length} photos</span>
      </header>
      <div class="daily-albums"></div>
    `;
    const albums = collection.querySelector(".daily-albums");
    const card = activityCard(dailyPost, { showDate: false });
    card.classList.add("daily-album");
    decorateCard?.(card, dailyPost);
    albums.append(card);
    container.append(collection);
  });
}

function renderParentActivities(posts, selectedWeek) {
  const list = document.getElementById("post-list");
  const heading = document.getElementById("week-heading");
  const dayTabs = document.getElementById("day-tabs");
  renderWeekHeading(heading, selectedWeek);
  list.innerHTML = "";
  const weekPosts = posts.filter(post => post.week === selectedWeek);
  renderDayTabs(dayTabs, weekPosts);
  if (!weekPosts.length) {
    list.innerHTML = `
      <div class="empty-week">
        <h3>写真やお知らせはここに表示されます</h3>
        <p>サマースクールが始まり、最初の投稿が公開されるまでお待ちください。</p>
      </div>
    `;
    return;
  }
  renderDailyCollections(list, weekPosts);
}

async function initParents() {
  setupLightbox();
  const login = document.getElementById("parent-login");
  const sessionCheck = document.getElementById("parent-session-check");
  const note = document.getElementById("login-note");
  const portal = document.getElementById("portal-app");
  const tabs = document.getElementById("week-tabs");
  const unlockButton = document.getElementById("unlock-week");
  const unlockForm = document.getElementById("unlock-form");
  const unlockNote = document.getElementById("unlock-note");
  let posts = [];
  let availableWeeks = [];
  let selectedWeek = SUMMER_WEEKS[0].slug;

  function render() {
    document.body.dataset.weekTheme = weekFor(selectedWeek).theme;
    const counts = new Map(availableWeeks.map(week => [
      week.slug,
      posts.filter(post => post.week === week.slug).length
    ]));
    renderWeekTabs(tabs, selectedWeek, counts, slug => {
      selectedWeek = slug;
      render();
    }, availableWeeks);
    renderParentActivities(posts, selectedWeek);
    tabs.hidden = availableWeeks.length < 2;
  }

  document.getElementById("signout").addEventListener("click", async () => {
    await api("/api/auth/signout", { method: "POST", body: "{}" }).catch(() => null);
    window.location.reload();
  });

  async function submitAccessCode(form, formNote, successMessage) {
    const password = new FormData(form).get("password");
    formNote.textContent = "アクセスコードを確認しています…";
    try {
      await api("/api/auth/password", {
        method: "POST",
        body: JSON.stringify({ password, audience: "parent" })
      });
      formNote.textContent = successMessage;
      window.location.reload();
    } catch (error) {
      formNote.textContent = error.data?.setupRequired
        ? "現在準備中です。しばらくしてから、もう一度お試しください。"
        : "アクセスコードが正しくありません。コードを確認して、もう一度お試しください。";
    }
  }

  login.addEventListener("submit", async event => {
    event.preventDefault();
    await submitAccessCode(login, note, "確認できました。ページを開いています…");
  });

  unlockButton.addEventListener("click", () => {
    unlockForm.hidden = false;
    unlockButton.hidden = true;
    unlockForm.elements.password.focus();
  });

  document.getElementById("unlock-cancel").addEventListener("click", () => {
    unlockForm.reset();
    unlockNote.textContent = "";
    unlockForm.hidden = true;
    unlockButton.hidden = false;
  });

  unlockForm.addEventListener("submit", async event => {
    event.preventDefault();
    await submitAccessCode(unlockForm, unlockNote, "アクセスコードを追加しました。ページを更新しています…");
  });

  try {
    const data = await api("/api/parent/feed");
    posts = data.posts || [];
    availableWeeks = SUMMER_WEEKS.filter(week => (data.weeks || []).includes(week.slug));
    selectedWeek = initialWeek(posts, availableWeeks);
    document.body.classList.add("parent-authenticated");
    sessionCheck.hidden = true;
    login.hidden = true;
    portal.hidden = false;
    render();
  } catch (error) {
    if (error.data?.setupRequired) {
      posts = demoPosts;
      availableWeeks = [SUMMER_WEEKS[0]];
      selectedWeek = initialWeek(posts, availableWeeks);
      document.body.classList.add("parent-authenticated");
      sessionCheck.hidden = true;
      portal.hidden = false;
      showSetupBanner("setup-banner");
      render();
      return;
    }
    document.body.classList.remove("parent-authenticated");
    sessionCheck.hidden = true;
    login.hidden = false;
    portal.hidden = true;
  }
}

async function initDailyStaff() {
  setupLightbox();
  const login = document.getElementById("staff-login");
  const loginNote = document.getElementById("staff-login-note");
  const app = document.getElementById("staff-app");
  const postForm = document.getElementById("post-form");
  const postNote = document.getElementById("post-note");
  const submit = document.getElementById("upload-submit");
  const preview = document.getElementById("upload-preview");
  const uploadProgress = document.getElementById("upload-progress");
  const uploadProgressBar = document.getElementById("upload-progress-bar");
  const uploadProgressLabel = document.getElementById("upload-progress-label");
  const uploadCurrentFile = document.getElementById("upload-current-file");
  const retryUpload = document.getElementById("upload-retry");
  const cancelUpload = document.getElementById("upload-cancel");
  const daySelect = document.getElementById("staff-day-select");
  const manageList = document.getElementById("manage-list");
  const manageNote = document.getElementById("manage-note");
  const tabs = document.getElementById("staff-week-tabs");
  const dayTabs = document.getElementById("staff-day-tabs");
  let posts = [];
  let selectedWeek = SUMMER_WEEKS[0].slug;
  let previewUrls = [];
  let retainedUploadItems = [];
  let retainedUploadDate = "";
  let stopUploadRequested = false;
  let uploadRunning = false;
  let uploadWakeLock = null;

  SUMMER_WEEKS.forEach(week => {
    const group = document.createElement("optgroup");
    group.label = `${week.shortTitle}: ${week.title}`;
    week.days.forEach(day => {
      const option = document.createElement("option");
      option.value = day.date;
      option.textContent = `${formatDailyDate(day.date)} — ${day.title}`;
      group.append(option);
    });
    daySelect.append(group);
  });

  const today = localDateValue();
  const todayWeek = weekForDate(today);
  daySelect.value = todayWeek ? today : SUMMER_WEEKS[0].days[0].date;
  selectedWeek = weekForDate(daySelect.value)?.slug || selectedWeek;

  function clearPreview() {
    previewUrls.forEach(url => URL.revokeObjectURL(url));
    previewUrls = [];
    preview.innerHTML = "";
  }

  async function keepScreenAwake() {
    if (!("wakeLock" in navigator) || uploadWakeLock) return;
    try {
      uploadWakeLock = await navigator.wakeLock.request("screen");
      uploadWakeLock.addEventListener("release", () => {
        uploadWakeLock = null;
      }, { once: true });
    } catch {
      // Uploads still work when wake lock is unavailable or denied.
    }
  }

  async function releaseScreenWakeLock() {
    if (uploadWakeLock) await uploadWakeLock.release().catch(() => null);
    uploadWakeLock = null;
  }

  document.addEventListener("visibilitychange", () => {
    if (uploadRunning && document.visibilityState === "visible") keepScreenAwake();
  });

  function showStaffPanel(view) {
    document.querySelectorAll("[data-staff-view]").forEach(item => {
      item.classList.toggle("is-active", item.dataset.staffView === view);
    });
    document.querySelectorAll("[data-staff-panel]").forEach(panel => {
      panel.hidden = panel.dataset.staffPanel !== view;
    });
  }

  function openUploader(date) {
    if (uploadRunning) {
      showStaffPanel("new");
      return;
    }
    daySelect.value = date;
    selectedWeek = weekForDate(date)?.slug || selectedWeek;
    clearPreview();
    postForm.reset();
    daySelect.value = date;
    postNote.textContent = "";
    retainedUploadItems = [];
    retainedUploadDate = "";
    uploadProgress.hidden = true;
    retryUpload.hidden = true;
    cancelUpload.hidden = true;
    uploadCurrentFile.textContent = "";
    submit.disabled = true;
    showStaffPanel("new");
    daySelect.focus();
  }

  document.querySelectorAll("[data-staff-view]").forEach(button => {
    button.addEventListener("click", () => {
      if (button.dataset.staffView === "new") openUploader(daySelect.value);
      else showStaffPanel("manage");
    });
  });

  login.addEventListener("submit", async event => {
    event.preventDefault();
    loginNote.textContent = "Checking staff access...";
    try {
      await api("/api/auth/password", {
        method: "POST",
        body: JSON.stringify({
          password: new FormData(login).get("password"),
          audience: "staff"
        })
      });
      window.location.reload();
    } catch (error) {
      loginNote.textContent = error.data?.setupRequired
        ? "Backend setup is needed before staff password login works."
        : error.message;
    }
  });

  document.getElementById("staff-signout").addEventListener("click", async () => {
    await api("/api/auth/signout", { method: "POST", body: "{}" }).catch(() => null);
    window.location.reload();
  });

  daySelect.addEventListener("change", () => {
    selectedWeek = weekForDate(daySelect.value)?.slug || selectedWeek;
  });

  postForm.elements.photos.addEventListener("change", () => {
    clearPreview();
    retainedUploadItems = [];
    uploadProgress.hidden = true;
    uploadProgress.classList.remove("is-complete", "has-errors");
    retryUpload.hidden = true;
    cancelUpload.hidden = true;
    const files = [...postForm.elements.photos.files];
    const invalid = files.filter(file => !validUploadPhoto(file));
    postNote.textContent = invalid.length
      ? `${invalid[0].name} cannot be uploaded. Use JPEG, PNG, WebP, HEIC, or HEIF files up to 20 MB each.`
      : files.length ? `${files.length} photo${files.length === 1 ? "" : "s"} ready to upload.` : "";
    submit.disabled = !files.length || Boolean(invalid.length);
    files.slice(0, 4).forEach(file => {
      const image = document.createElement("img");
      const url = URL.createObjectURL(file);
      previewUrls.push(url);
      image.alt = file.name;
      image.src = url;
      preview.append(image);
    });
    if (files.length > 4) {
      const more = document.createElement("p");
      more.className = "upload-preview-more";
      more.textContent = `+ ${files.length - 4} more`;
      preview.append(more);
    }
  });

  async function runUploadQueue(items, date) {
    if (!items.length || uploadRunning) return;
    uploadRunning = true;
    stopUploadRequested = false;
    retainedUploadItems = [];
    submit.disabled = true;
    retryUpload.hidden = true;
    cancelUpload.hidden = false;
    cancelUpload.disabled = false;
    cancelUpload.textContent = "Stop upload";
    uploadProgress.hidden = false;
    uploadProgress.classList.remove("is-complete", "has-errors");
    uploadProgressBar.max = items.length;
    uploadProgressBar.value = 0;
    uploadProgressLabel.textContent = `0% · 0 of ${items.length}`;
    postNote.textContent = `Uploading 0 of ${items.length} photos… Please keep this page open.`;
    await keepScreenAwake();
    let uploaded = 0;
    const failed = [];
    let stopped = [];
    try {
      let nextIndex = 0;
      const activeNames = new Map();
      const updateActiveNames = () => {
        uploadCurrentFile.textContent = activeNames.size
          ? `Uploading ${[...activeNames.values()].join(" + ")}`
          : "Finishing upload…";
      };
      const uploadNext = async () => {
        if (stopUploadRequested || nextIndex >= items.length) return;
        const item = items[nextIndex];
        nextIndex += 1;
        const { file, uploadId } = item;
        activeNames.set(uploadId, file.name);
        updateActiveNames();
        let lastError;
        for (let attempt = 1; attempt <= 3; attempt += 1) {
          const form = new FormData();
          form.set("date", date);
          form.set("upload_id", uploadId);
          form.append("photos", file, file.name);
          try {
            await api("/api/staff/posts", { method: "POST", body: form });
            lastError = null;
            break;
          } catch (error) {
            lastError = error;
            if (stopUploadRequested || (error.status && error.status < 500)) break;
            if (attempt < 3) await new Promise(resolve => setTimeout(resolve, attempt * 750));
          }
        }
        activeNames.delete(uploadId);
        updateActiveNames();
        if (lastError) failed.push({ item, error: lastError });
        else uploaded += 1;
        const processed = uploaded + failed.length;
        const percent = Math.round((processed / items.length) * 100);
        uploadProgressBar.value = processed;
        uploadProgressLabel.textContent = `${percent}% · ${processed} of ${items.length}`;
        postNote.textContent = `Uploading ${processed} of ${items.length} photos… ${uploaded} completed.`;
        await uploadNext();
      };
      await Promise.all(Array.from(
        { length: Math.min(UPLOAD_QUEUE_CONCURRENCY, items.length) },
        () => uploadNext()
      ));
      if (stopUploadRequested) stopped = items.slice(nextIndex);
      retainedUploadItems = [...failed.map(entry => entry.item), ...stopped];
      retainedUploadDate = retainedUploadItems.length ? date : "";
      selectedWeek = weekForDate(date)?.slug || selectedWeek;
      if (retainedUploadItems.length) {
        uploadProgress.classList.add("has-errors");
        retryUpload.hidden = false;
        retryUpload.textContent = failed.length ? `Retry ${retainedUploadItems.length} photos` : `Resume ${stopped.length} photos`;
        uploadCurrentFile.textContent = stopUploadRequested ? "Upload stopped safely" : "Some photos need another try";
        uploadProgressLabel.textContent = `${uploaded} uploaded · ${retainedUploadItems.length} remaining`;
        const failureMessage = failed[0]?.error?.message;
        postNote.textContent = stopUploadRequested
          ? `${uploaded} uploaded. ${retainedUploadItems.length} photos remain.`
          : failureMessage
            ? `${uploaded} uploaded; ${failed.length} failed: ${failureMessage}`
            : `${uploaded} uploaded; ${failed.length} failed. Tap Retry to continue.`;
      } else {
        uploadProgress.classList.add("is-complete");
        uploadProgressBar.value = items.length;
        uploadProgressLabel.textContent = `100% · ${uploaded} uploaded`;
        uploadCurrentFile.textContent = "Upload complete";
        postForm.reset();
        clearPreview();
        daySelect.value = date;
        postNote.textContent = `${uploaded} photos added successfully.`;
      }
      await loadStaffPosts();
      if (!retainedUploadItems.length) showStaffPanel("manage");
    } finally {
      uploadRunning = false;
      cancelUpload.hidden = true;
      submit.disabled = Boolean(retainedUploadItems.length);
      await releaseScreenWakeLock();
    }
  }

  cancelUpload.addEventListener("click", () => {
    stopUploadRequested = true;
    cancelUpload.disabled = true;
    cancelUpload.textContent = "Stopping after this photo…";
  });

  retryUpload.addEventListener("click", () => {
    runUploadQueue([...retainedUploadItems], retainedUploadDate || String(daySelect.value));
  });

  postForm.addEventListener("submit", async event => {
    event.preventDefault();
    const files = [...postForm.elements.photos.files];
    if (!files.length) return;
    if (files.some(file => !validUploadPhoto(file))) return;
    const items = files.map(file => ({ file, uploadId: newUploadId() }));
    await runUploadQueue(items, String(daySelect.value));
  });

  function dailyCard(day, post) {
    const card = document.createElement("article");
    const count = post?.photos?.length || Number(post?.photoCount || 0);
    card.className = "daily-photo-manage-card";
    card.dataset.hasPhotos = String(count > 0);
    card.innerHTML = `
      <div class="daily-photo-empty" aria-hidden="true">${count ? "📸" : "📷"}</div>
      <div class="daily-photo-details">
        <p>${formatDailyDate(day.date)}</p>
        <h3>${escapeText(day.title)}</h3>
        <span>${count} photo${count === 1 ? "" : "s"}</span>
      </div>
      <div class="daily-photo-actions">
        <button type="button" class="add-daily-photos">${count ? "Add more photos" : "Add photos"}</button>
        ${count ? '<button type="button" class="view-daily-photos">View photos</button>' : ""}
        ${count ? '<button type="button" class="delete-daily-photos">Delete photos</button>' : ""}
      </div>
    `;
    card.querySelector(".add-daily-photos").addEventListener("click", () => openUploader(day.date));
    card.querySelector(".view-daily-photos")?.addEventListener("click", () => openGallery(post.photos));
    card.querySelector(".delete-daily-photos")?.addEventListener("click", () => {
      openGallery(post.photos, null, { action: "delete", onChanged: loadStaffPosts });
    });
    return card;
  }

  function renderStaffDays() {
    const week = weekFor(selectedWeek);
    const postsByDate = new Map(posts.map(post => [post.date, post]));
    const counts = new Map(SUMMER_WEEKS.map(item => [
      item.slug,
      item.days.filter(day => postsByDate.get(day.date)?.photos?.length).length
    ]));
    renderWeekTabs(tabs, selectedWeek, counts, slug => {
      selectedWeek = slug;
      renderStaffDays();
    });
    renderWeekHeading(document.getElementById("staff-week-heading"), selectedWeek);
    manageList.innerHTML = "";
    dayTabs.innerHTML = "";
    dayTabs.hidden = true;
    week.days.forEach(day => manageList.append(dailyCard(day, postsByDate.get(day.date))));
  }

  async function loadStaffPosts() {
    manageNote.textContent = "Loading daily photos…";
    try {
      const data = await api("/api/staff/posts");
      posts = data.posts || [];
      renderStaffDays();
      manageNote.textContent = "";
    } catch (error) {
      manageNote.textContent = error.data?.setupRequired
        ? "Backend setup is needed before management works."
        : error.message;
    }
  }

  document.getElementById("refresh-posts").addEventListener("click", loadStaffPosts);

  try {
    await api("/api/staff/me");
    login.hidden = true;
    app.hidden = false;
    showStaffPanel("manage");
    await loadStaffPosts();
  } catch (error) {
    if (error.data?.setupRequired) showSetupBanner("staff-setup-banner");
    login.hidden = false;
    app.hidden = true;
  }
}

if (appKind === "parents") initParents();
if (appKind === "staff") initDailyStaff();
