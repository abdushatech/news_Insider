const POSTS_DIR = "posts/";
let ALL_POSTS = [];

/* theme */
const toggle = document.getElementById("theme-toggle");
const stored = localStorage.getItem("theme");
const prefers = window.matchMedia("(prefers-color-scheme: dark)").matches
  ? "dark"
  : "light";
document.documentElement.setAttribute("data-theme", stored || prefers);
toggle.addEventListener("click", () => {
  const current = document.documentElement.getAttribute("data-theme");
  const next = current === "dark" ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", next);
  localStorage.setItem("theme", next);
});

/* router */
document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("year").textContent = new Date().getFullYear();
  if (document.getElementById("post-list")) loadIndex();
  if (document.getElementById("post-content")) loadSingle();
});

/* index */
async function loadIndex() {
  await fetchPosts();
  renderIndex(ALL_POSTS);
  setupFilter();
}
async function fetchPosts() {
  const slugs = await fetch(`${POSTS_DIR}manifest.json`).then((r) => r.json());
  const posts = await Promise.all(
    slugs.map(async (slug) => {
      const text = await fetch(`${POSTS_DIR}${slug}`).then((r) => r.text());
      return parseFrontmatter(text, slug);
    })
  );
  ALL_POSTS = posts.sort((a, b) => new Date(b.date) - new Date(a.date));
}
function parseFrontmatter(raw, slug) {
  const [_, head, body] = raw.split("---");
  const data = Object.fromEntries(
    head
      .trim()
      .split("\n")
      .map((l) => {
        const [k, ...v] = l.split(":");
        return [k.trim(), v.join(":").trim()];
      })
  );
  return {
    slug: slug.replace(".md", ""),
    title: data.title,
    description: data.description,
    date: data.date,
    tags: data.tags ? data.tags.split(",").map((t) => t.trim()) : [],
    image: data.image || "",
    content: body.trim(),
  };
}
function renderIndex(list) {
  const grid = document.getElementById("post-list");
  grid.innerHTML = list.map(card).join("");
}
function card(p) {
  return `
  <article class="card" data-tags="${p.tags.join(" ")}">
    ${p.image ? `<img src="${p.image}" alt="">` : ""}
    <div class="card-body">
      <h3 class="card-title">${p.title}</h3>
      <p class="card-text">${p.description}</p>
      <div class="card-footer">
        <time>${fmtDate(p.date)}</time>
        <a class="read-more" href="post.html?slug=${p.slug}">Read →</a>
      </div>
      ${
        p.tags.length
          ? `<div class="tags">${p.tags
              .map((t) => `<span class="tag">${t}</span>`)
              .join("")}</div>`
          : ""
      }
    </div>
  </article>`;
}
function fmtDate(str) {
  const d = new Date(str);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/* single */
async function loadSingle() {
  const slug = new URLSearchParams(location.search).get("slug");
  if (!slug) {
    location = "./";
    return;
  }
  await fetchPosts();
  const p = ALL_POSTS.find((p) => p.slug === slug);
  if (!p) {
    location = "./";
    return;
  }
  document.title = `${p.title} | Abdi Insider`;
  const article = document.getElementById("post-content");
  article.innerHTML = `
    <header>
      <h1>${p.title}</h1>
      <p><time>${fmtDate(p.date)}</time> ${p.tags
    .map((t) => `<span class="tag">${t}</span>`)
    .join("")}</p>
    </header>
    <div class="markdown">${parseMarkdown(p.content)}</div>`;
}
function parseMarkdown(md) {
  return (
    md
      .replace(/^### (.*$)/gim, "<h3>$1</h3>")
      .replace(/^## (.*$)/gim, "<h2>$1</h2>")
      .replace(/^# (.*$)/gim, "<h1>$1</h1>")
      .replace(/\*\*(.+)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.+)\*/g, "<em>$1</em>")
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
      .replace(/\n\n/g, "</p><p>")
      .replace(/^<p>/, "<p>") + "</p>"
  );
}


function setupFilter() {
  const buttons = document.querySelectorAll(".filter-btn");
  buttons.forEach((btn) =>
    btn.addEventListener("click", () => {
      buttons.forEach((b) => b.classList.remove("active")); // ← move inside
      btn.classList.add("active"); // ← now works
      const tag = btn.dataset.tag;
      const filtered =
        tag === "all"
          ? ALL_POSTS
          : ALL_POSTS.filter((p) => p.tags.includes(tag));
      renderIndex(filtered);
    })
  );
}