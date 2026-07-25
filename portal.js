const appKind = document.body.dataset.app;

const SUMMER_WEEKS = [
  {
    slug: "week-1-festivals",
    shortTitle: "Week 1",
    dateRange: "7/27 – 7/31",
    emoji: "🌎",
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
    date: "2026-07-24",
    week: "week-1-festivals",
    title: "Brazil — Carnival",
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
    const error = new Error(data.error || "Request failed");
    error.data = data;
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

function updateLightbox() {
  const box = document.getElementById("lightbox");
  const image = document.getElementById("lightbox-image");
  const counter = document.getElementById("lightbox-counter");
  const previous = document.getElementById("lightbox-prev");
  const next = document.getElementById("lightbox-next");
  const photo = lightboxPhotos[lightboxIndex];
  if (!box || !image || !photo) return;
  image.src = photo.url;
  image.alt = photo.alt || "";
  if (counter) counter.textContent = `${lightboxIndex + 1} / ${lightboxPhotos.length}`;
  if (previous) previous.hidden = lightboxPhotos.length < 2;
  if (next) next.hidden = lightboxPhotos.length < 2;
}

function openGallery(photos, startIndex = 0) {
  const box = document.getElementById("lightbox");
  if (!box || !photos?.length) return;
  lightboxPhotos = photos;
  lightboxIndex = Math.max(0, Math.min(startIndex, photos.length - 1));
  updateLightbox();
  box.hidden = false;
}

function setupLightbox() {
  const box = document.getElementById("lightbox");
  const close = document.getElementById("lightbox-close");
  const previous = document.getElementById("lightbox-prev");
  const next = document.getElementById("lightbox-next");
  if (!box || !close) return;
  close.addEventListener("click", () => {
    box.hidden = true;
  });
  box.addEventListener("click", event => {
    if (event.target === box) box.hidden = true;
  });
  previous?.addEventListener("click", () => {
    lightboxIndex = (lightboxIndex - 1 + lightboxPhotos.length) % lightboxPhotos.length;
    updateLightbox();
  });
  next?.addEventListener("click", () => {
    lightboxIndex = (lightboxIndex + 1) % lightboxPhotos.length;
    updateLightbox();
  });
  document.addEventListener("keydown", event => {
    if (event.key === "Escape") box.hidden = true;
    if (!box.hidden && event.key === "ArrowLeft") previous?.click();
    if (!box.hidden && event.key === "ArrowRight") next?.click();
  });
}

function renderWeekTabs(container, selectedSlug, counts, onSelect, availableWeeks = SUMMER_WEEKS) {
  container.innerHTML = "";
  const parentView = appKind === "parents";
  availableWeeks.forEach(week => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "week-tab";
    button.classList.toggle("is-active", week.slug === selectedSlug);
    button.setAttribute("aria-pressed", String(week.slug === selectedSlug));
    button.innerHTML = `
      <span>${week.shortTitle}${parentView ? ` • ${week.dateRange}` : ""}</span>
      <strong>${parentView ? `${week.emoji} ${week.title}` : week.title}</strong>
      <small>${counts.get(week.slug) || 0}${parentView ? "件のお知らせ" : " activities"}</small>
    `;
    button.addEventListener("click", () => onSelect(week.slug));
    container.append(button);
  });
}

function renderWeekHeading(container, selectedSlug) {
  const week = weekFor(selectedSlug);
  const parentView = appKind === "parents";
  if (parentView) {
    container.innerHTML = `
      <p class="week-campaign-line">${week.shortTitle} • ${week.dateRange}</p>
      <h3 class="week-campaign-theme"><span aria-hidden="true">${week.emoji}</span> ${week.title}</h3>
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
  const photoList = photos || [];
  const previewPhotos = photoList.slice(0, 4);
  grid.classList.add(`photo-count-${previewPhotos.length}`);
  previewPhotos.forEach((photo, index) => {
    const button = document.createElement("button");
    button.className = "portal-photo";
    button.type = "button";
    button.setAttribute("aria-label", `${appKind === "parents" ? "写真を開く" : "Open photo"} ${index + 1}`);
    button.innerHTML = `<img src="${escapeAttribute(photo.url)}" alt="${escapeAttribute(photo.alt || "")}" loading="lazy">`;
    if (index === previewPhotos.length - 1 && photoList.length > previewPhotos.length) {
      button.insertAdjacentHTML("beforeend", `<span class="photo-more">+${photoList.length - previewPhotos.length}</span>`);
    }
    button.addEventListener("click", () => openGallery(photoList, index));
    grid.append(button);
  });
  if (!photoList.length) {
    grid.hidden = true;
    return;
  }
  const galleryButton = document.createElement("button");
  galleryButton.type = "button";
  galleryButton.className = "view-gallery";
  galleryButton.textContent = appKind === "parents"
    ? `写真をすべて見る（${photoList.length}枚）`
    : `View all photos (${photoList.length})`;
  galleryButton.addEventListener("click", () => openGallery(photoList));
  grid.insertAdjacentElement("afterend", galleryButton);
}

function activityCard(post) {
  const card = document.createElement("article");
  const parentView = appKind === "parents";
  const activities = Array.isArray(post.activities) ? post.activities : [];
  card.className = "post-card activity-card";
  card.id = `activity-${post.id}`;
  card.tabIndex = -1;
  card.innerHTML = `
    <div class="post-text">
      <p class="post-date">${parentView ? formatDailyDate(post.date) : formatDate(post.date)}</p>
      <h3>${escapeText(post.title || (parentView ? "サマースクールの活動" : "Summer activity"))}</h3>
      ${post.body ? `<p class="daily-summary">${escapeText(post.body)}</p>` : ""}
      ${activities.length ? `<div class="activity-tags" aria-label="${parentView ? "今日の活動" : "Activities"}">${activities.map(activity => `<span>${escapeText(activity)}</span>`).join("")}</div>` : ""}
    </div>
    <div class="photo-grid"></div>
  `;
  appendPhotoGrid(card, post.photos);
  return card;
}

function renderDayTabs(container, posts) {
  container.innerHTML = "";
  posts.forEach(post => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "day-tab";
    button.innerHTML = `
      <span>${formatDailyDate(post.date, "short")}</span>
      <strong>${escapeText(post.title || "Today")}</strong>
    `;
    button.addEventListener("click", () => {
      const card = document.getElementById(`activity-${post.id}`);
      card?.scrollIntoView({ behavior: "smooth", block: "start" });
      card?.focus({ preventScroll: true });
    });
    container.append(button);
  });
  container.hidden = posts.length < 2;
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
  weekPosts.forEach(post => list.append(activityCard(post)));
}

async function initParents() {
  setupLightbox();
  const login = document.getElementById("parent-login");
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
    login.hidden = true;
    portal.hidden = false;
    render();
  } catch (error) {
    if (error.data?.setupRequired) {
      posts = demoPosts;
      availableWeeks = [SUMMER_WEEKS[0]];
      selectedWeek = initialWeek(posts, availableWeeks);
      document.body.classList.add("parent-authenticated");
      portal.hidden = false;
      showSetupBanner("setup-banner");
      render();
      return;
    }
    document.body.classList.remove("parent-authenticated");
    login.hidden = false;
    portal.hidden = true;
  }
}

async function initStaff() {
  setupLightbox();
  const login = document.getElementById("staff-login");
  const note = document.getElementById("staff-login-note");
  const app = document.getElementById("staff-app");
  const postForm = document.getElementById("post-form");
  const postNote = document.getElementById("post-note");
  const manageList = document.getElementById("manage-list");
  const manageNote = document.getElementById("manage-note");
  const refreshPosts = document.getElementById("refresh-posts");
  const preview = document.getElementById("upload-preview");
  const tabs = document.getElementById("staff-week-tabs");
  const parentViewToggle = document.getElementById("parent-view-toggle");
  let posts = [];
  let selectedWeek = SUMMER_WEEKS[0].slug;
  let parentPreview = false;

  postForm.elements.date.valueAsDate = new Date();
  postForm.elements.week.value = selectedWeek;

  function showStaffPanel(view) {
    document.querySelectorAll("[data-staff-view]").forEach(item => {
      item.classList.toggle("is-active", item.dataset.staffView === view);
    });
    document.querySelectorAll("[data-staff-panel]").forEach(panel => {
      panel.hidden = panel.dataset.staffPanel !== view;
    });
  }

  document.querySelectorAll("[data-staff-view]").forEach(button => {
    button.addEventListener("click", () => {
      parentPreview = false;
      updatePreviewMode();
      showStaffPanel(button.dataset.staffView);
      if (button.dataset.staffView === "manage") loadStaffPosts();
    });
  });

  function updatePreviewMode() {
    document.body.classList.toggle("staff-parent-preview", parentPreview);
    parentViewToggle.setAttribute("aria-pressed", String(parentPreview));
    parentViewToggle.textContent = parentPreview ? "Exit parent view" : "Parent view";
    document.getElementById("staff-mode-label").textContent = parentPreview ? "Parent view" : "Staff view";
    document.getElementById("staff-mode-description").textContent = parentPreview
      ? "This is exactly how published activities appear to summer families."
      : "This is the family timeline with edit controls added. Use Parent view to hide every staff control.";
    renderStaffActivities();
  }

  parentViewToggle.addEventListener("click", () => {
    parentPreview = !parentPreview;
    showStaffPanel("manage");
    updatePreviewMode();
  });

  login.addEventListener("submit", async event => {
    event.preventDefault();
    const password = new FormData(login).get("password");
    note.textContent = "Checking staff access...";
    try {
      await api("/api/auth/password", {
        method: "POST",
        body: JSON.stringify({ password, audience: "staff" })
      });
      window.location.reload();
    } catch (error) {
      note.textContent = error.data?.setupRequired
        ? "Backend setup is needed before staff password login works."
        : error.message;
    }
  });

  document.getElementById("staff-signout").addEventListener("click", async () => {
    await api("/api/auth/signout", { method: "POST", body: "{}" }).catch(() => null);
    window.location.reload();
  });

  postForm.elements.photos.addEventListener("change", () => {
    preview.innerHTML = "";
    [...postForm.elements.photos.files].slice(0, 20).forEach(file => {
      const image = document.createElement("img");
      image.alt = file.name;
      image.src = URL.createObjectURL(file);
      preview.append(image);
    });
  });

  postForm.addEventListener("submit", async event => {
    event.preventDefault();
    postNote.textContent = "Publishing activity...";
    try {
      const form = new FormData(postForm);
      form.set("group", "summer-2026");
      form.set("status", "published");
      form.set("album", form.get("week"));
      await api("/api/staff/posts", { method: "POST", body: form });
      selectedWeek = String(form.get("week"));
      postForm.reset();
      postForm.elements.date.valueAsDate = new Date();
      postForm.elements.week.value = selectedWeek;
      preview.innerHTML = "";
      postNote.textContent = "Published. Families can see this activity now.";
      await loadStaffPosts();
      showStaffPanel("manage");
    } catch (error) {
      postNote.textContent = error.data?.setupRequired
        ? "Backend setup is needed before uploads work."
        : error.message;
    }
  });

  async function loadStaffPosts() {
    manageNote.textContent = "Loading activities...";
    try {
      const data = await api("/api/staff/posts");
      posts = data.posts || [];
      if (!SUMMER_WEEKS.some(week => week.slug === selectedWeek)) selectedWeek = initialWeek(posts);
      renderStaffActivities();
      manageNote.textContent = posts.length ? "" : "No activities yet.";
    } catch (error) {
      manageNote.textContent = error.data?.setupRequired
        ? "Backend setup is needed before management works."
        : error.message;
    }
  }

  function renderStaffActivities() {
    const visiblePosts = parentPreview ? posts.filter(post => post.status === "published") : posts;
    const counts = new Map(SUMMER_WEEKS.map(week => [
      week.slug,
      visiblePosts.filter(post => post.week === week.slug).length
    ]));
    renderWeekTabs(tabs, selectedWeek, counts, slug => {
      selectedWeek = slug;
      postForm.elements.week.value = slug;
      renderStaffActivities();
    });
    renderWeekHeading(document.getElementById("staff-week-heading"), selectedWeek);
    manageList.innerHTML = "";
    const weekPosts = visiblePosts.filter(post => post.week === selectedWeek);
    if (!weekPosts.length) {
      manageList.innerHTML = `
        <div class="empty-week">
          <h3>No activities in this week yet</h3>
          <p>${parentPreview ? "Families will see this message until an activity is published." : "Use Add activity to share the first photos for this week."}</p>
        </div>
      `;
      return;
    }
    weekPosts.forEach(post => {
      const card = activityCard(post);
      card.classList.add("manage-card");
      card.dataset.postId = post.id;
      if (!parentPreview) appendStaffControls(card, post);
      manageList.append(card);
    });
  }

  function appendStaffControls(card, post) {
    const status = document.createElement("span");
    status.className = `manage-status ${post.status}`;
    status.textContent = post.status;
    card.querySelector(".post-text").prepend(status);

    const controls = document.createElement("div");
    controls.className = "manage-card-actions";
    controls.innerHTML = `
      <button type="button" class="toggle-edit">Edit activity</button>
      <button type="button" class="delete-post">Delete</button>
    `;

    const editor = document.createElement("div");
    editor.className = "manage-edit";
    editor.hidden = true;
    editor.innerHTML = `
      <label>
        Summer week
        <select name="week">
          ${SUMMER_WEEKS.map(week => `<option value="${week.slug}">${week.shortTitle}: ${escapeText(week.title)}</option>`).join("")}
        </select>
      </label>
      <label>
        Date
        <input name="date" type="date" value="${escapeAttribute(post.date)}">
      </label>
      <label>
        Daily theme
        <input name="title" type="text" maxlength="120" value="${escapeAttribute(post.title || "")}">
      </label>
      <label>
        Visibility
        <select name="status">
          <option value="published">Published</option>
          <option value="draft">Hidden from parents</option>
        </select>
      </label>
      <label class="full-width">
        Parent summary
        <textarea name="body" rows="4">${escapeText(post.body || "")}</textarea>
      </label>
      <label class="full-width">
        Activities
        <input name="activities" type="text" maxlength="240" value="${escapeAttribute((post.activities || []).join(", "))}">
      </label>
      <div class="manage-card-actions full-width">
        <button type="button" class="save-post">Save changes</button>
        <button type="button" class="cancel-edit">Cancel</button>
      </div>
    `;
    editor.querySelector('[name="week"]').value = post.week;
    editor.querySelector('[name="status"]').value = post.status;
    card.querySelector(".post-text").append(controls);
    card.append(editor);

    controls.querySelector(".toggle-edit").addEventListener("click", () => {
      editor.hidden = false;
      controls.hidden = true;
    });
    editor.querySelector(".cancel-edit").addEventListener("click", () => {
      editor.hidden = true;
      controls.hidden = false;
    });
    editor.querySelector(".save-post").addEventListener("click", () => saveManagedPost(card, editor));
    controls.querySelector(".delete-post").addEventListener("click", () => deleteManagedPost(card, post.title));
  }

  async function saveManagedPost(card, editor) {
    const body = {
      group: "summer-2026",
      week: editor.querySelector('[name="week"]').value,
      date: editor.querySelector('[name="date"]').value,
      status: editor.querySelector('[name="status"]').value,
      title: editor.querySelector('[name="title"]').value,
      body: editor.querySelector('[name="body"]').value,
      activities: editor.querySelector('[name="activities"]').value
    };
    manageNote.textContent = "Saving changes...";
    try {
      await api(`/api/staff/posts/${encodeURIComponent(card.dataset.postId)}`, {
        method: "PATCH",
        body: JSON.stringify(body)
      });
      selectedWeek = body.week;
      await loadStaffPosts();
      manageNote.textContent = "Activity updated.";
    } catch (error) {
      manageNote.textContent = error.message;
    }
  }

  async function deleteManagedPost(card, title) {
    if (!window.confirm(`Delete "${title || "this activity"}" and all of its photos?`)) return;
    manageNote.textContent = "Deleting activity...";
    try {
      await api(`/api/staff/posts/${encodeURIComponent(card.dataset.postId)}`, { method: "DELETE" });
      await loadStaffPosts();
      manageNote.textContent = "Activity deleted.";
    } catch (error) {
      manageNote.textContent = error.message;
    }
  }

  refreshPosts.addEventListener("click", loadStaffPosts);

  try {
    await api("/api/staff/me");
    login.hidden = true;
    app.hidden = false;
    showStaffPanel("manage");
    await loadStaffPosts();
    selectedWeek = initialWeek(posts);
    postForm.elements.week.value = selectedWeek;
    renderStaffActivities();
  } catch (error) {
    if (error.data?.setupRequired) {
      app.hidden = false;
      showSetupBanner("staff-setup-banner");
      return;
    }
    login.hidden = false;
    app.hidden = true;
  }
}

if (appKind === "parents") initParents();
if (appKind === "staff") initStaff();
