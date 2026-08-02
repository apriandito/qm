import { html, nothing, render, type TemplateResult } from "lit";
import { Box } from "lucide";
import { api, type CoreContext } from "./core-bridge";
import type { SkillItem } from "./composer";
import { errMessage } from "../../chassis/src/errors";
import { icon } from "./ui";
import { appState } from "./shell";
import { skillActions } from "./skill-actions";
import {
  createReviewMatches,
  isSharedSkillScope,
  reviewMatches,
  shouldBlockRepeatedPublishClick,
  type SkillCreateReview,
  type SkillEditReview,
} from "./skill-edit-review";
import {
  filterSkillGroups,
  groupSkills,
  isArchivedSkill,
  skillEmptyState,
  statusCounts,
  type SkillStatusFilter,
} from "./skill-registry";
import { listBackLink, listPageTpl } from "./list-page";
import { focusDialogCancel, restoreDialogFocus, trapDialogFocus } from "./dialog-focus";
import { SkillsRefreshSequence } from "./skills-refresh";
import { SkillsMutationSequence } from "./skills-mutation";

let skillRows: SkillItem[] = [];
let skillsNotice = "";
let skillSearch = "";
let scopeFilter = "all";
let sourceFilter = "all";
let statusFilter: SkillStatusFilter = "active";
let createScopes: Array<{ scopeId: string; name: string }> = [];
let skillsPageHost: HTMLElement | null = null;

let editing: {
  id: string;
  description: string;
  body: string;
  originalDescription: string;
  originalBody: string;
  scopeId?: string;
  name: string;
  review: SkillEditReview | null;
} | null = null;
let editingTarget: SkillItem | null = null;
let saving = false;
let editError = "";

let creating: {
  name: string;
  description: string;
  body: string;
  scopeId: string;
  review: SkillCreateReview | null;
} | null = null;
let creatingSaving = false;
let createError = "";

let deleting: string | null = null;
let archiveConfirmation: SkillItem | null = null;
let editRequestSeq = 0;
const skillsRefreshes = new SkillsRefreshSequence();
const skillMutations = new SkillsMutationSequence();
let flowFocusTarget: HTMLElement | null = null;
let archiveFocusTarget: HTMLElement | null = null;

function scopeLabel(scope: string): string {
  return scope ? scope.charAt(0).toUpperCase() + scope.slice(1) : "";
}

async function startEdit(s: SkillItem): Promise<void> {
  if (!s.id) return;
  const request = ++editRequestSeq;
  skillMutations.invalidate();
  flowFocusTarget = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  creating = null;
  editing = null;
  editingTarget = s;
  editError = "";
  skillsNotice = "Memuat instruksi skill…";
  drawSkills();
  queueMicrotask(() => skillsPageHost?.querySelector<HTMLElement>(".context-back")?.focus());
  try {
    const r = await api<{ skill: SkillItem }>(`/api/skills/${encodeURIComponent(s.id)}`);
    if (request !== editRequestSeq) return;
    editing = {
      id: s.id,
      description: r.skill.description,
      body: r.skill.body ?? "",
      originalDescription: r.skill.description,
      originalBody: r.skill.body ?? "",
      scopeId: r.skill.scopeId,
      name: r.skill.name,
      review: null,
    };
    editingTarget = r.skill;
    skillsNotice = "";
  } catch (e) {
    if (request !== editRequestSeq) return;
    editError = errMessage(e, "Gagal memuat detail skill.");
    skillsNotice = "";
  }
  drawSkills();
  queueMicrotask(() => {
    const target =
      skillsPageHost?.querySelector<HTMLElement>("#skill-edit-description") ??
      skillsPageHost?.querySelector<HTMLElement>(".context-back");
    target?.focus();
  });
}

function restoreFocusedFlow(target: HTMLElement | null): void {
  queueMicrotask(() => {
    if (creating || editingTarget || archiveConfirmation || appState.currentView !== "skills") return;
    const skillId = target?.dataset.skillId;
    const matchingEdit = skillId
      ? [...(skillsPageHost?.querySelectorAll<HTMLElement>(".skill-edit-trigger") ?? [])].find(
          (element) => element.dataset.skillId === skillId,
        )
      : null;
    const search = skillsPageHost?.querySelector<HTMLElement>(".list-search input") ?? null;
    const create = skillsPageHost?.querySelector<HTMLElement>(".list-page-action") ?? null;
    const fallback = skillId ? (matchingEdit ?? search ?? create) : (create ?? search);
    restoreDialogFocus(target, () => fallback ?? null);
  });
}

function closeFocusedFlow(): void {
  editRequestSeq += 1;
  skillMutations.invalidate();
  editing = null;
  editingTarget = null;
  creating = null;
  editError = "";
  createError = "";
  skillsNotice = "";
  saving = false;
  creatingSaving = false;
  const target = flowFocusTarget;
  flowFocusTarget = null;
  drawSkills();
  restoreFocusedFlow(target);
}

function startCreate(): void {
  if (creating) return;
  flowFocusTarget = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  skillMutations.invalidate();
  editing = null;
  editingTarget = null;
  editRequestSeq += 1;
  creating = { name: "", description: "", body: "", scopeId: createScopes[0]?.scopeId ?? "", review: null };
  createError = "";
  creatingSaving = false;
  drawSkills();
  queueMicrotask(() => document.querySelector<HTMLInputElement>("#skill-create-name")?.focus());
}

function skillMeta(s: SkillItem): string {
  const source = s.source === "pack" ? `Pack ${s.pack?.upstreamName ?? "sumber"}` : "Dibuat di sini";
  return `${scopeLabel(s.scope)} · v${s.version ?? 1} · ${source}`;
}

function skillVariant(s: SkillItem, hasScopeVariants: boolean): TemplateResult {
  const actions = skillActions(s);
  const archived = isArchivedSkill(s);
  let state = "Aktif";
  if (archived) state = "Diarsipkan";
  else if (hasScopeVariants) state = "Varian scope";
  let archiveLabel = "Arsipkan";
  if (deleting === s.id) archiveLabel = "Memproses…";
  else if (archived) archiveLabel = "Pulihkan";
  return html`
    <div class="skill-variant ${archived ? "archived" : ""}">
      <span class="skill-variant-icon">${icon(Box, 16)}</span>
      <div class="skill-variant-copy">
        <div class="skill-variant-description" title=${s.description}>${s.description}</div>
        <div class="skill-variant-meta">${skillMeta(s)}${s.assetCount ? ` · ${s.assetCount} aset` : ""}</div>
        <details class="skill-variant-details">
          <summary>Detail</summary>
          <p>${s.description}</p>
          <dl>
            <div>
              <dt>Scope</dt>
              <dd>${s.scopeId ?? scopeLabel(s.scope)}</dd>
            </div>
            <div>
              <dt>Kemampuan</dt>
              <dd>
                ${s.requiredCapabilities?.length ? s.requiredCapabilities.join(", ") : "Tidak ada yang diperlukan"}
              </dd>
            </div>
          </dl>
        </details>
      </div>
      <div class="skill-variant-state">
        <span class="badge ${archived ? "" : "skill-active"}">${state}</span>
        ${actions.edit && !archived ? html`<button class="btn skill-edit-trigger" data-skill-id=${s.id ?? ""} type="button" ?disabled=${deleting === s.id} @click=${() => void startEdit(s)}>Edit</button>` : nothing}
        ${
          actions.delete
            ? html`<button
                class="btn skill-archive-trigger"
                data-skill-id=${s.id ?? ""}
                type="button"
                ?disabled=${deleting === s.id}
                @click=${(event: Event) => void deleteSkill(s, event.currentTarget as HTMLElement)}
              >
                ${archiveLabel}
              </button>`
            : nothing
        }
      </div>
    </div>
  `;
}

function skillGroup(name: string, skills: SkillItem[]): TemplateResult {
  const activeVariants = skills.filter((skill) => !isArchivedSkill(skill)).length;
  const hasScopeVariants = activeVariants > 1;
  return html`<section class="skill-group">
    <div class="skill-group-head">
      <h2 class="skill-group-name">
        <code>/${name}</code>${skills.length > 1 ? html`<span>${skills.length} varian</span>` : nothing}
      </h2>
      ${hasScopeVariants ? html`<span class="skill-precedence">Scope yang lebih sempit diutamakan kalau keduanya berlaku</span>` : nothing}
    </div>
    ${skills.map((skill) => skillVariant(skill, hasScopeVariants))}
  </section>`;
}

function editorPane() {
  const e = editing;
  if (!e) {
    return html`<section class="skill-form-page">
      ${listBackLink("Kembali ke skill", closeFocusedFlow)}
      <div class="skill-form-heading">
        <div>
          <h1 class="pane-title">Edit /${editingTarget?.name ?? "skill"}</h1>
          <p>${editError ? "Instruksi tidak tersedia." : "Memuat instruksi…"}</p>
        </div>
      </div>
      ${editError ? html`<div class="form-error" role="alert">${editError}</div>` : nothing}
    </section>`;
  }
  const reviewed = reviewMatches(e.review, e.description, e.body);
  let saveLabel = "Simpan";
  if (saving) saveLabel = "Menyimpan…";
  else if (reviewed) saveLabel = "Publikasikan perubahan";
  return html`
    <form
      class="skill-form-page"
      @submit=${(event: SubmitEvent) => {
        event.preventDefault();
        void saveEdit();
      }}
    >
      ${listBackLink("Kembali ke skill", closeFocusedFlow)}
      <div class="skill-form-heading">
        <div>
          <h1 class="pane-title">Edit /${e.name}</h1>
          <p>Tersedia buat ${e.scopeId?.startsWith("personal:") ? "cuma kamu" : (e.scopeId ?? "konteks ini")}</p>
        </div>
        <span class="badge">Mengedit</span>
      </div>
      <label class="skill-field">
        <span>Deskripsi</span>
        <input
          id="skill-edit-description"
          class="skill-desc-input"
          type="text"
          .value=${e.description}
          data-focus-key="skill-edit-description"
          ?disabled=${saving}
          @input=${(ev: Event) => {
            e.description = (ev.target as HTMLInputElement).value;
            drawSkills();
          }}
        />
      </label>
      <label class="skill-field">
        <span>Instruksi</span>
        <textarea
          class="skill-body-input"
          spellcheck="false"
          data-focus-key="skill-edit-body"
          ?disabled=${saving}
          @input=${(ev: Event) => {
            e.body = (ev.target as HTMLTextAreaElement).value;
            drawSkills();
          }}
          .value=${e.body}
        ></textarea>
      </label>
      ${editError ? html`<div class="card-meta skill-shadowed">${editError}</div>` : nothing}
      ${
        reviewed
          ? html`<div class="skill-impact" role="alert">
              <strong>Publikasikan perubahan ini ke ${e.scopeId}?</strong>
              <div class="card-meta">
                Semua orang di konteks ini bisa memakai instruksi yang sudah diperbarui. Deskripsi
                ${e.description === e.originalDescription ? "nggak berubah" : "berubah"}; instruksi
                ${e.body === e.originalBody ? "nggak berubah" : "berubah"}.
              </div>
            </div>`
          : nothing
      }
      <div class="actions skill-form-actions">
        <button
          class="btn primary"
          type="submit"
          ?disabled=${saving}
          @click=${(event: MouseEvent) => {
            if (shouldBlockRepeatedPublishClick(reviewed, event.detail)) event.preventDefault();
          }}
        >
          ${saveLabel}
        </button>
        ${
          reviewed
            ? html`<button
                class="btn"
                type="button"
                ?disabled=${saving}
                @click=${() => {
                  e.review = null;
                  drawSkills();
                }}
              >
                Tinjau lagi
              </button>`
            : nothing
        }
        <button class="btn" type="button" ?disabled=${saving} @click=${closeFocusedFlow}>Batal</button>
      </div>
    </form>
  `;
}

function creatorPane() {
  const c = creating!;
  const ready = c.name.trim() !== "" && c.description.trim() !== "" && c.body.trim() !== "";
  const reviewed = createReviewMatches(c.review, c.name.trim(), c.description.trim(), c.body.trim(), c.scopeId);
  let createLabel = "Buat skill";
  if (creatingSaving) createLabel = "Menyimpan…";
  else if (reviewed) createLabel = "Publikasikan skill";
  return html`
    <form
      class="skill-form-page"
      @submit=${(event: SubmitEvent) => {
        event.preventDefault();
        void saveCreate();
      }}
    >
      ${listBackLink("Kembali ke skill", closeFocusedFlow)}
      <div class="skill-form-heading">
        <div>
          <h1 class="pane-title">Skill baru</h1>
          <p>Buat prosedur yang bisa dipakai ulang buat kamu sendiri atau konteks bersama.</p>
        </div>
        <span class="badge">Baru</span>
      </div>
      <label class="skill-field">
        <span>Nama</span>
        <input
          id="skill-create-name"
          class="skill-desc-input"
          type="text"
          placeholder="watch-pipeline"
          data-focus-key="skill-create-name"
          .value=${c.name}
          ?disabled=${creatingSaving}
          @input=${(ev: Event) => {
            c.name = (ev.target as HTMLInputElement).value;
            drawSkills();
          }}
        />
      </label>
      <label class="skill-field">
        <span>Tersedia buat</span>
        <select
          class="skill-desc-input"
          .value=${c.scopeId}
          ?disabled=${creatingSaving}
          @change=${(ev: Event) => {
            c.scopeId = (ev.target as HTMLSelectElement).value;
            c.review = null;
            drawSkills();
          }}
        >
          ${createScopes.map((scope) => html`<option value=${scope.scopeId}>${scope.name}</option>`)}
        </select>
        <small class="card-meta">Semua orang di konteks bersama bisa memakai dan mengedit skill ini.</small>
      </label>
      <label class="skill-field">
        <span>Deskripsi</span>
        <input
          class="skill-desc-input"
          type="text"
          placeholder="Satu baris: apa fungsinya / kapan dipakai"
          data-focus-key="skill-create-description"
          .value=${c.description}
          ?disabled=${creatingSaving}
          @input=${(ev: Event) => {
            c.description = (ev.target as HTMLInputElement).value;
            drawSkills();
          }}
        />
      </label>
      <label class="skill-field">
        <span>Instruksi</span>
        <textarea
          class="skill-body-input"
          spellcheck="false"
          placeholder="Isi SKILL.md — langkah-langkah yang diikuti saat skill ini dipakai."
          data-focus-key="skill-create-body"
          ?disabled=${creatingSaving}
          @input=${(ev: Event) => {
            c.body = (ev.target as HTMLTextAreaElement).value;
            drawSkills();
          }}
          .value=${c.body}
        ></textarea>
      </label>
      ${createError ? html`<div class="card-meta skill-shadowed">${createError}</div>` : nothing}
      ${
        reviewed
          ? html`<div class="skill-impact" role="alert">
              <strong>Publikasikan /${c.name.trim()} ke ${c.scopeId}?</strong>
              <div class="card-meta">Semua orang di konteks ini bisa memakai dan mengedit instruksi ini.</div>
            </div>`
          : nothing
      }
      <div class="actions skill-form-actions">
        <button
          class="btn primary"
          type="submit"
          ?disabled=${creatingSaving || !ready}
          @click=${(event: MouseEvent) => {
            if (shouldBlockRepeatedPublishClick(reviewed, event.detail)) event.preventDefault();
          }}
        >
          ${createLabel}
        </button>
        ${
          reviewed
            ? html`<button
                class="btn"
                type="button"
                ?disabled=${creatingSaving}
                @click=${() => {
                  c.review = null;
                  drawSkills();
                }}
              >
                Tinjau lagi
              </button>`
            : nothing
        }
        <button class="btn" type="button" ?disabled=${creatingSaving} @click=${closeFocusedFlow}>Batal</button>
      </div>
    </form>
  `;
}

function drawSkills(loading = false): void {
  if (appState.currentView !== "skills" || !appState.mainEl) return;
  if (!skillsPageHost || skillsPageHost.parentElement !== appState.mainEl) {
    skillsPageHost = document.createElement("div");
    skillsPageHost.className = "pane skills-page";
    appState.mainEl.replaceChildren(skillsPageHost);
  }
  if (creating || editingTarget) {
    render(creating ? creatorPane() : editorPane(), skillsPageHost);
    return;
  }
  const filters = { query: skillSearch, scope: scopeFilter, source: sourceFilter, status: statusFilter };
  const groups = filterSkillGroups(groupSkills(skillRows), filters);
  const filtered = groups.flatMap((group) => group.skills);
  const counts = statusCounts(skillRows);
  const rows: TemplateResult[] = groups.map((group) => skillGroup(group.name, group.skills));
  const clearFilters = () => {
    skillSearch = "";
    scopeFilter = "all";
    sourceFilter = "all";
    statusFilter = "all";
    drawSkills();
  };
  const emptyState = skillEmptyState(skillRows.length, filtered.length, loading);
  let empty: string | TemplateResult = "Belum ada skill yang tersedia.";
  if (emptyState === "filtered") {
    empty = html`<div class="skill-empty">
      <span>Nggak ada skill yang cocok dengan filter ini.</span
      ><button class="btn" type="button" @click=${clearFilters}>Hapus filter</button>
    </div>`;
  } else if (emptyState === "loading") {
    empty = "Memuat skill…";
  }
  render(
    html`${listPageTpl({
      title: "Skills",
      onRefresh: () => void renderSkills(),
      action: { label: "Skill baru", onClick: startCreate },
      search: {
        value: skillSearch,
        placeholder: "Cari skill…",
        onInput: (value) => {
          skillSearch = value;
          drawSkills();
        },
      },
      filters: html`<div class="skill-registry-controls">
          <div class="resource-tabs" role="group" aria-label="Filter berdasarkan status skill">
            ${(
              [
                ["active", "Aktif", counts.active],
                ["archived", "Diarsipkan", counts.archived],
                ["all", "Semua", counts.all],
              ] as const
            ).map(
              ([value, label, count]) =>
                html`<button
                  type="button"
                  aria-pressed=${statusFilter === value}
                  class=${statusFilter === value ? "active" : ""}
                  @click=${() => {
                    statusFilter = value;
                    drawSkills();
                  }}
                >
                  ${label}<span>${count}</span>
                </button>`,
            )}
          </div>
          <div class="skill-filter-fields">
            <label class="list-select"
              ><span>Scope</span
              ><select
                aria-label="Filter skill berdasarkan scope"
                .value=${scopeFilter}
                @change=${(e: Event) => {
                  scopeFilter = (e.currentTarget as HTMLSelectElement).value;
                  drawSkills();
                }}
              >
                <option value="all">Semua scope</option>
                <option value="personal">Personal</option>
                <option value="channel">Channel</option>
                <option value="group">Project / group</option>
                <option value="team">Team</option>
                <option value="org">Organization</option>
              </select></label
            >
            <label class="list-select"
              ><span>Sumber</span
              ><select
                aria-label="Filter skill berdasarkan sumber"
                .value=${sourceFilter}
                @change=${(e: Event) => {
                  sourceFilter = (e.currentTarget as HTMLSelectElement).value;
                  drawSkills();
                }}
              >
                <option value="all">Semua sumber</option>
                <option value="native">Dibuat di sini</option>
                <option value="pack">Skill packs</option>
                <option value="overrides">Overrides</option>
              </select></label
            >
          </div>
        </div>
        <div class="skill-result-count" aria-live="polite">
          ${loading ? "Memuat…" : `${filtered.length} skill di ${groups.length} grup`}
        </div>
        ${skillsNotice ? html`<div class="status">${skillsNotice}</div>` : nothing}`,
      rows,
      empty,
    })}${archiveConfirmation ? archiveDialog(archiveConfirmation) : nothing}`,
    skillsPageHost,
  );
}

function setSkillsBackgroundInert(inert: boolean): void {
  skillsPageHost?.querySelectorAll<HTMLElement>(":scope > :not(.project-dialog-backdrop)").forEach((element) => {
    element.inert = inert;
  });
}

function closeArchiveDialog(): void {
  if (deleting) return;
  const target = archiveFocusTarget;
  archiveConfirmation = null;
  archiveFocusTarget = null;
  drawSkills();
  setSkillsBackgroundInert(false);
  queueMicrotask(() => {
    if (archiveConfirmation || appState.currentView !== "skills") return;
    const fallback = target?.dataset.skillId
      ? [...document.querySelectorAll<HTMLElement>(".skill-archive-trigger")].find(
          (element) => element.dataset.skillId === target.dataset.skillId,
        )
      : null;
    restoreDialogFocus(target, () => fallback);
  });
}

function archiveDialog(skill: SkillItem): TemplateResult {
  const audience = skill.scope === "personal" ? "kamu" : `semua orang di ${skill.scopeId ?? `${skill.scope} ini`}`;
  return html`<div
    class="project-dialog-backdrop"
    @click=${(event: MouseEvent) => event.target === event.currentTarget && closeArchiveDialog()}
  >
    <div
      class="project-dialog skill-archive-dialog"
      role="dialog"
      aria-modal="true"
      aria-labelledby="skill-archive-title"
      aria-describedby="skill-archive-impact"
      @keydown=${(event: KeyboardEvent) => trapDialogFocus(event, closeArchiveDialog)}
    >
      <div class="project-dialog-head">
        <div><h2 id="skill-archive-title">Arsipkan /${skill.name}?</h2></div>
      </div>
      <p id="skill-archive-impact">
        Versi ini nggak akan tersedia lagi buat ${audience}. Kalau ini menimpa /${skill.name} yang lebih luas, versi itu
        yang jadi berlaku. Riwayat dan asetnya tetap disimpan, dan kamu bisa memulihkannya nanti.
      </p>
      <div class="project-dialog-actions actions">
        <button
          class="btn"
          type="button"
          data-dialog-cancel
          ?disabled=${deleting === skill.id}
          @click=${closeArchiveDialog}
        >
          Batal</button
        ><button
          class="btn danger skill-archive-confirm"
          type="button"
          ?disabled=${deleting === skill.id}
          @click=${() => void performArchive(skill)}
        >
          ${deleting === skill.id ? "Mengarsipkan…" : "Arsipkan skill"}
        </button>
      </div>
    </div>
  </div>`;
}

async function saveEdit(): Promise<void> {
  if (!editing || saving) return;
  if (isSharedSkillScope(editing.scopeId) && !reviewMatches(editing.review, editing.description, editing.body)) {
    editing.review = { description: editing.description, body: editing.body };
    return drawSkills();
  }
  const operation = skillMutations.begin();
  saving = true;
  editError = "";
  drawSkills();
  try {
    await api(`/api/skills/${encodeURIComponent(editing.id)}`, {
      method: "PUT",
      body: JSON.stringify({ description: editing.description, body: editing.body }),
    });
    if (!skillMutations.isCurrent(operation)) {
      await renderSkills();
      return;
    }
    const returnTarget = flowFocusTarget;
    flowFocusTarget = null;
    editing = null;
    editingTarget = null;
    saving = false;
    await renderSkills();
    if (!skillMutations.isCurrent(operation)) return;
    restoreFocusedFlow(returnTarget);
  } catch (e) {
    if (!skillMutations.isCurrent(operation)) return;
    editError = errMessage(e, "Gagal menyimpan skill.");
    saving = false;
    drawSkills();
  }
}

async function saveCreate(): Promise<void> {
  if (!creating || creatingSaving) return;
  const name = creating.name.trim();
  const description = creating.description.trim();
  const body = creating.body.trim();
  if (!name || !description || !body) {
    createError = "Nama, deskripsi, dan instruksi wajib diisi semua.";
    drawSkills();
    return;
  }
  if (
    isSharedSkillScope(creating.scopeId) &&
    !createReviewMatches(creating.review, name, description, body, creating.scopeId)
  ) {
    creating.review = { name, description, body, scopeId: creating.scopeId };
    return drawSkills();
  }
  const operation = skillMutations.begin();
  creatingSaving = true;
  createError = "";
  drawSkills();
  try {
    await api("/api/skills", {
      method: "POST",
      body: JSON.stringify({ name, description, body, scopeId: creating.scopeId }),
    });
    if (!skillMutations.isCurrent(operation)) {
      await renderSkills();
      return;
    }
    const returnTarget = flowFocusTarget;
    flowFocusTarget = null;
    creating = null;
    creatingSaving = false;
    await renderSkills();
    if (!skillMutations.isCurrent(operation)) return;
    restoreFocusedFlow(returnTarget);
  } catch (e) {
    if (!skillMutations.isCurrent(operation)) return;
    createError = errMessage(e, "Gagal membuat skill.");
    creatingSaving = false;
    drawSkills();
  }
}

async function deleteSkill(s: SkillItem, trigger?: HTMLElement): Promise<void> {
  if (!s.id || deleting) return;
  if (s.status === "archived") {
    deleting = s.id;
    try {
      await api(`/api/skills/${encodeURIComponent(s.id)}/restore`, { method: "POST", body: "{}" });
      deleting = null;
      return void renderSkills();
    } catch (e) {
      deleting = null;
      skillsNotice = errMessage(e, "Gagal memulihkan skill.");
      return drawSkills();
    }
  }
  archiveFocusTarget = trigger ?? (document.activeElement instanceof HTMLElement ? document.activeElement : null);
  archiveConfirmation = s;
  drawSkills();
  setSkillsBackgroundInert(true);
  queueMicrotask(() => {
    if (archiveConfirmation?.id !== s.id || appState.currentView !== "skills") return;
    if (skillsPageHost) focusDialogCancel(skillsPageHost);
  });
}

async function performArchive(s: SkillItem): Promise<void> {
  if (!s.id || deleting) return;
  const focusTarget = archiveFocusTarget;
  archiveConfirmation = null;
  archiveFocusTarget = null;
  deleting = s.id;
  skillsNotice = "";
  drawSkills();
  setSkillsBackgroundInert(false);
  queueMicrotask(() => {
    const target =
      skillsPageHost?.querySelector<HTMLElement>(".list-search input") ??
      skillsPageHost?.querySelector<HTMLElement>(".list-page-action");
    target?.focus();
  });
  try {
    await api(`/api/skills/${encodeURIComponent(s.id)}`, { method: "DELETE" });
    deleting = null;
    await renderSkills();
  } catch (e) {
    deleting = null;
    skillsNotice = errMessage(e, "Gagal mengarsipkan skill.");
    drawSkills();
    requestAnimationFrame(() => {
      const fallback = focusTarget?.dataset.skillId
        ? [...(skillsPageHost?.querySelectorAll<HTMLElement>(".skill-archive-trigger") ?? [])].find(
            (element) => element.dataset.skillId === focusTarget.dataset.skillId,
          )
        : null;
      restoreDialogFocus(
        focusTarget,
        () => fallback ?? skillsPageHost?.querySelector<HTMLElement>(".list-search input") ?? null,
      );
    });
  }
}

export async function renderSkills(): Promise<void> {
  if (appState.currentView !== "skills") return;
  if (!skillsPageHost || skillsPageHost.parentElement !== appState.mainEl) {
    archiveConfirmation = null;
    archiveFocusTarget = null;
    setSkillsBackgroundInert(false);
  }
  const seq = appState.viewRenderSeq;
  const request = skillsRefreshes.begin();
  skillsNotice = "";
  drawSkills(true);
  try {
    const [r, contexts] = await Promise.all([
      api<{ skills: SkillItem[] }>("/api/skills?includeShadowed=1"),
      api<{ contexts?: CoreContext[] }>("/api/contexts").catch(() => ({ contexts: [] })),
    ]);
    if (!skillsRefreshes.isCurrent(request) || seq !== appState.viewRenderSeq || appState.currentView !== "skills")
      return;
    skillRows = (r.skills ?? []).slice().sort((a, b) => a.name.localeCompare(b.name));
    const personal = appState.me ? `personal:${appState.me.user}` : "";
    createScopes = [
      { scopeId: personal, name: "Personal — cuma kamu" },
      ...(contexts.contexts ?? [])
        .filter(
          (context) =>
            context.scopeId !== personal &&
            (context.kind === "group" || (context.kind === "channel" && context.isPrivate)),
        )
        .map((context) => ({ scopeId: context.scopeId, name: context.name || context.scopeId })),
    ].filter((scope) => scope.scopeId);
  } catch (e) {
    if (!skillsRefreshes.isCurrent(request) || seq !== appState.viewRenderSeq || appState.currentView !== "skills")
      return;
    skillsNotice = errMessage(e, "Gagal memuat skill.");
  }
  if (skillsRefreshes.isCurrent(request)) drawSkills(false);
}
