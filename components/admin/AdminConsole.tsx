"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type {
  MediaPlaceholder,
  SectionBlock,
  SimpleSectionBlock,
  SiteHeaderContent,
  SiteMetadataSettings,
  StaticPageBlock,
  StaticPageContent,
  WorkCase
} from "@/lib/content/types";
import type { AdminCaseListItem, AdminCasePayload, AdminInitialData, CmsMediaAsset } from "@/lib/cms/types";
import styles from "@/app/admin/admin.module.css";

type AdminTab = "cases" | "header" | "siteMeta" | "about" | "connect" | "media";

type ApiResponse<T> = {
  ok: boolean;
  status: number;
  data?: T;
  message?: string;
  issues?: ApiIssue[];
};

type ApiIssue = {
  path: Array<string | number>;
  message: string;
};

type ApiErrorPayload = {
  message?: string;
  issues?: ApiIssue[];
};

type ToastTone = "info" | "success" | "error";

type ToastMessage = {
  id: number;
  tone: ToastTone;
  text: string;
};

const TOAST_LIFETIME_MS = 4500;

const SECTION_TYPES: SectionBlock["type"][] = [
  "paragraph",
  "list",
  "media",
  "quote",
  "cta",
  "gallery",
  "metrics",
  "timeline",
  "twoColumn"
];

const SIMPLE_SECTION_TYPES: SimpleSectionBlock["type"][] = ["paragraph", "list", "media", "quote", "cta"];

function toSlug(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function splitLines(value: string) {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function joinLines(items: string[]) {
  return items.join("\n");
}

function optionalText(value: string) {
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
}

function makeEmptyMedia(): MediaPlaceholder {
  return {
    kind: "image",
    aspectRatio: "16 / 9"
  };
}

function makeEmptySimpleBlock(type: SimpleSectionBlock["type"]): SimpleSectionBlock {
  if (type === "paragraph") {
    return { type, body: "Добавьте описание кейса." };
  }
  if (type === "list") {
    return { type, items: ["Пункт списка"] };
  }
  if (type === "media") {
    return { type, media: makeEmptyMedia() };
  }
  if (type === "quote") {
    return { type, quote: "Добавьте цитату." };
  }
  return { type, label: "Подробнее", href: "#", body: "Добавьте пояснение." };
}

function makeEmptySection(type: SectionBlock["type"]): SectionBlock {
  if (type === "paragraph" || type === "list" || type === "media" || type === "quote" || type === "cta") {
    return makeEmptySimpleBlock(type);
  }

  if (type === "gallery") {
    return {
      type,
      layout: "grid",
      items: [makeEmptyMedia()]
    };
  }

  if (type === "metrics") {
    return {
      type,
      items: [{ value: "0", label: "Метрика" }]
    };
  }

  if (type === "timeline") {
    return {
      type,
      items: [{ title: "Новый этап", media: makeEmptyMedia() }]
    };
  }

  return {
    type,
    left: [makeEmptySimpleBlock("paragraph")],
    right: [makeEmptySimpleBlock("paragraph")]
  };
}

function makeEmptyWorkCase(): WorkCase {
  return {
    schemaVersion: "1.0",
    id: "temp",
    slug: "new-case",
    status: "hidden",
    sortOrder: 9999,
    summary: {
      title: "New Case",
      year: new Date().getFullYear().toString(),
      category: "Product design",
      preview: {
        kind: "image",
        aspectRatio: "16 / 9",
        centered: true
      }
    },
    meta: {
      title: "New Case",
      description: "Краткое описание кейса.",
      ogType: "article"
    },
    sections: [makeEmptySection("paragraph")]
  };
}

async function requestJson<T>(url: string, init?: RequestInit): Promise<ApiResponse<T>> {
  const response = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {})
    }
  });

  const isJson = response.headers.get("content-type")?.includes("application/json");
  const payload = isJson ? ((await response.json()) as unknown) : undefined;

  if (!response.ok) {
    const errorPayload = payload as ApiErrorPayload | undefined;
    return {
      ok: false,
      status: response.status,
      message: errorPayload?.message ?? `Request failed with ${response.status}`,
      issues: Array.isArray(errorPayload?.issues) ? errorPayload.issues : undefined
    };
  }

  return {
    ok: true,
    status: response.status,
    data: payload as T
  };
}

interface AdminConsoleProps {
  initialData: AdminInitialData;
}

export function AdminConsole({ initialData }: AdminConsoleProps) {
  const [tab, setTab] = useState<AdminTab>("cases");
  const [cases, setCases] = useState<AdminCaseListItem[]>(initialData.cases);
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(initialData.cases[0]?.id ?? null);
  const [selectedCase, setSelectedCase] = useState<AdminCasePayload | null>(null);
  const [headerForm, setHeaderForm] = useState<SiteHeaderContent>(initialData.header);
  const [siteMetadataForm, setSiteMetadataForm] = useState<SiteMetadataSettings>(initialData.siteMetadata);
  const [aboutPage, setAboutPage] = useState<StaticPageContent>(initialData.about);
  const [connectPage, setConnectPage] = useState<StaticPageContent>(initialData.connect);
  const [mediaAssets, setMediaAssets] = useState<CmsMediaAsset[]>(initialData.media);
  const [isBusy, setIsBusy] = useState(false);
  const [draggedCaseId, setDraggedCaseId] = useState<string | null>(null);
  const [previewLink, setPreviewLink] = useState<string | null>(null);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const toastIdRef = useRef(0);

  const selectedCaseSummary = useMemo(
    () => cases.find((entry) => entry.id === selectedCaseId) ?? null,
    [cases, selectedCaseId]
  );

  function formatIssuePath(path: Array<string | number>) {
    return path
      .map((segment) => (typeof segment === "number" ? `[${segment}]` : segment))
      .join(".")
      .replace(".[", "[");
  }

  function formatApiError(response: ApiResponse<unknown>, fallback: string) {
    if (!response.issues?.length) {
      return response.message ?? fallback;
    }

    const issueText = response.issues
      .slice(0, 3)
      .map((issue) => `${formatIssuePath(issue.path)}: ${issue.message}`)
      .join(" · ");

    return `${response.message ?? fallback} (${issueText})`;
  }

  function pushToast(text: string, tone: ToastTone = "info") {
    const id = toastIdRef.current + 1;
    toastIdRef.current = id;

    setToasts((current) => [...current, { id, tone, text }]);

    window.setTimeout(() => {
      setToasts((current) => current.filter((entry) => entry.id !== id));
    }, TOAST_LIFETIME_MS);
  }

  function dismissToast(id: number) {
    setToasts((current) => current.filter((entry) => entry.id !== id));
  }

  function getToastToneClassName(tone: ToastTone) {
    if (tone === "success") {
      return styles.toastSuccess;
    }
    if (tone === "error") {
      return styles.toastError;
    }
    return styles.toastInfo;
  }

  async function withBusy(action: () => Promise<void>) {
    setIsBusy(true);
    try {
      await action();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Неожиданная ошибка";
      pushToast(message, "error");
    } finally {
      setIsBusy(false);
    }
  }

  async function loadCase(caseId: string) {
    await withBusy(async () => {
      const response = await requestJson<{ case: AdminCasePayload }>(`/api/admin/cases/${caseId}`);
      if (!response.ok || !response.data) {
        pushToast(formatApiError(response, "Не удалось загрузить кейс"), "error");
        return;
      }

      setSelectedCase(response.data.case);
      setSelectedCaseId(caseId);
      setPreviewLink(null);
    });
  }

  async function createCase() {
    await withBusy(async () => {
      const payload = makeEmptyWorkCase();
      const response = await requestJson<{ caseId: string }>("/api/admin/cases", {
        method: "POST",
        body: JSON.stringify({ payload })
      });

      if (!response.ok || !response.data) {
        pushToast(formatApiError(response, "Не удалось создать кейс"), "error");
        return;
      }

      const listResponse = await requestJson<{ cases: AdminCaseListItem[] }>("/api/admin/cases");
      if (listResponse.ok && listResponse.data) {
        setCases(listResponse.data.cases);
      }

      await loadCase(response.data.caseId);
      pushToast("Кейс создан", "success");
    });
  }

  async function saveCaseDraft() {
    if (!selectedCase) return;
    const caseId = selectedCase.id;
    const draft = selectedCase.draft;

    async function persistDraft() {
      const response = await requestJson<{ payload: WorkCase }>(`/api/admin/cases/${caseId}`, {
        method: "PATCH",
        body: JSON.stringify({ payload: draft })
      });

      if (!response.ok || !response.data) {
        pushToast(formatApiError(response, "Не удалось сохранить черновик"), "error");
        return false;
      }
      const savedDraft = response.data.payload;

      setSelectedCase((current) => {
        if (!current || current.id !== caseId) {
          return current;
        }

        return {
          ...current,
          draft: savedDraft
        };
      });

      return true;
    }

    await withBusy(async () => {
      const isSaved = await persistDraft();
      if (!isSaved) {
        return;
      }

      const listResponse = await requestJson<{ cases: AdminCaseListItem[] }>("/api/admin/cases");
      if (listResponse.ok && listResponse.data) {
        setCases(listResponse.data.cases);
      }

      pushToast("Черновик сохранен", "success");
    });
  }

  async function publishCase() {
    if (!selectedCase) return;
    const caseId = selectedCase.id;
    const draft = selectedCase.draft;

    await withBusy(async () => {
      const saveResponse = await requestJson<{ payload: WorkCase }>(`/api/admin/cases/${caseId}`, {
        method: "PATCH",
        body: JSON.stringify({ payload: draft })
      });

      if (!saveResponse.ok || !saveResponse.data) {
        pushToast(formatApiError(saveResponse, "Не удалось сохранить черновик перед публикацией"), "error");
        return;
      }
      const savedDraft = saveResponse.data.payload;

      setSelectedCase((current) => {
        if (!current || current.id !== caseId) {
          return current;
        }

        return {
          ...current,
          draft: savedDraft
        };
      });

      const response = await requestJson<{ ok: true }>(`/api/admin/cases/${caseId}/publish`, {
        method: "POST"
      });

      if (!response.ok) {
        pushToast(formatApiError(response, "Не удалось опубликовать кейс"), "error");
        return;
      }

      const listResponse = await requestJson<{ cases: AdminCaseListItem[] }>("/api/admin/cases");
      if (listResponse.ok && listResponse.data) {
        setCases(listResponse.data.cases);
      }

      await loadCase(caseId);
      pushToast("Кейс опубликован", "success");
    });
  }

  async function duplicateCase() {
    if (!selectedCase) return;

    await withBusy(async () => {
      const response = await requestJson<{ caseId: string }>(`/api/admin/cases/${selectedCase.id}/duplicate`, {
        method: "POST"
      });

      if (!response.ok || !response.data) {
        pushToast(formatApiError(response, "Не удалось дублировать кейс"), "error");
        return;
      }

      const listResponse = await requestJson<{ cases: AdminCaseListItem[] }>("/api/admin/cases");
      if (listResponse.ok && listResponse.data) {
        setCases(listResponse.data.cases);
      }

      await loadCase(response.data.caseId);
      pushToast("Кейс дублирован", "success");
    });
  }

  async function deleteCase() {
    if (!selectedCase) return;

    const confirmed = window.confirm("Удалить кейс навсегда? Восстановление невозможно.");
    if (!confirmed) return;

    await withBusy(async () => {
      const response = await requestJson<unknown>(`/api/admin/cases/${selectedCase.id}`, {
        method: "DELETE"
      });

      if (!response.ok) {
        pushToast(formatApiError(response, "Не удалось удалить кейс"), "error");
        return;
      }

      const listResponse = await requestJson<{ cases: AdminCaseListItem[] }>("/api/admin/cases");
      if (listResponse.ok && listResponse.data) {
        setCases(listResponse.data.cases);
        const nextId = listResponse.data.cases[0]?.id ?? null;
        setSelectedCaseId(nextId);
        setSelectedCase(null);
        if (nextId) {
          await loadCase(nextId);
        }
      }

      pushToast("Кейс удален", "success");
    });
  }

  async function saveCaseOrder() {
    await withBusy(async () => {
      const ids = cases.map((entry) => entry.id);
      const response = await requestJson<{ ok: true }>("/api/admin/cases/reorder", {
        method: "POST",
        body: JSON.stringify({ ids })
      });

      if (!response.ok) {
        pushToast(formatApiError(response, "Не удалось сохранить порядок"), "error");
        return;
      }

      const listResponse = await requestJson<{ cases: AdminCaseListItem[] }>("/api/admin/cases");
      if (listResponse.ok && listResponse.data) {
        setCases(listResponse.data.cases);
      }

      pushToast("Порядок сохранен", "success");
    });
  }

  async function generatePreview() {
    if (!selectedCase) return;

    await withBusy(async () => {
      const response = await requestJson<{ url: string }>("/api/admin/preview-token", {
        method: "POST",
        body: JSON.stringify({ entityType: "case", entityId: selectedCase.id })
      });

      if (!response.ok || !response.data) {
        pushToast(formatApiError(response, "Не удалось создать preview-ссылку"), "error");
        return;
      }

      setPreviewLink(response.data.url);
      pushToast("Одноразовая preview-ссылка создана", "success");
    });
  }

  async function saveHeader() {
    await withBusy(async () => {
      const response = await requestJson<{ header: SiteHeaderContent }>("/api/admin/header", {
        method: "PATCH",
        body: JSON.stringify(headerForm)
      });

      if (!response.ok || !response.data) {
        pushToast(formatApiError(response, "Не удалось сохранить шапку"), "error");
        return;
      }

      setHeaderForm(response.data.header);
      pushToast("Шапка сохранена", "success");
    });
  }

  async function saveSiteMetadata() {
    await withBusy(async () => {
      const response = await requestJson<{ settings: SiteMetadataSettings }>("/api/admin/site-metadata", {
        method: "PATCH",
        body: JSON.stringify(siteMetadataForm)
      });

      if (!response.ok || !response.data) {
        pushToast(formatApiError(response, "Не удалось сохранить SEO настройки"), "error");
        return;
      }

      setSiteMetadataForm(response.data.settings);
      pushToast("SEO настройки сохранены", "success");
    });
  }

  async function saveStaticPage(page: StaticPageContent, key: "about" | "connect") {
    await withBusy(async () => {
      const response = await requestJson<{ page: StaticPageContent }>(`/api/admin/pages/${key}`, {
        method: "PATCH",
        body: JSON.stringify(page)
      });

      if (!response.ok || !response.data) {
        pushToast(formatApiError(response, `Не удалось сохранить страницу ${key}`), "error");
        return;
      }

      if (key === "about") {
        setAboutPage(response.data.page);
      } else {
        setConnectPage(response.data.page);
      }

      pushToast(`Страница ${key} сохранена`, "success");
    });
  }

  async function refreshMediaAssets(options?: { silent?: boolean }) {
    const response = await requestJson<{ assets: CmsMediaAsset[] }>("/api/admin/media", {
      cache: "no-store"
    });

    if (!response.ok || !response.data) {
      if (!options?.silent) {
        pushToast(formatApiError(response, "Не удалось обновить список медиа"), "error");
      }
      return false;
    }

    setMediaAssets(response.data.assets);
    return true;
  }

  useEffect(() => {
    let isAlive = true;

    void (async () => {
      const response = await requestJson<{ assets: CmsMediaAsset[] }>("/api/admin/media", {
        cache: "no-store"
      });

      if (!response.ok || !response.data || !isAlive) {
        return;
      }

      setMediaAssets(response.data.assets);
    })();

    return () => {
      isAlive = false;
    };
  }, []);

  async function uploadMedia(file: File) {
    await withBusy(async () => {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/admin/media", {
        method: "POST",
        body: formData
      });

      if (!response.ok) {
        const json = (await response.json().catch(() => null)) as { message?: string } | null;
        pushToast(json?.message ?? `Ошибка загрузки (${response.status})`, "error");
        return;
      }

      const payload = (await response.json()) as { asset: CmsMediaAsset };
      setMediaAssets((current) => [payload.asset, ...current]);
      pushToast("Медиа загружено", "success");
    });
  }

  function reorderCasesLocally(sourceId: string, targetId: string) {
    if (sourceId === targetId) {
      return;
    }

    const sourceIndex = cases.findIndex((entry) => entry.id === sourceId);
    const targetIndex = cases.findIndex((entry) => entry.id === targetId);

    if (sourceIndex < 0 || targetIndex < 0) {
      return;
    }

    const next = [...cases];
    const [moved] = next.splice(sourceIndex, 1);
    next.splice(targetIndex, 0, moved);
    setCases(next);
  }

  function mutateDraft(mutator: (draft: WorkCase) => WorkCase) {
    setSelectedCase((current) => {
      if (!current) return current;
      return {
        ...current,
        draft: mutator(current.draft)
      };
    });
  }

  function renderCaseEditor() {
    return (
      <div className={styles.panelGrid}>
        <aside className={styles.card}>
          <h2 className={styles.cardTitle}>Кейсы</h2>
          <div className={styles.inlineActions}>
            <button type="button" className={styles.primaryButton} onClick={createCase} disabled={isBusy}>
              Новый кейс
            </button>
            <button type="button" className={styles.secondaryButton} onClick={saveCaseOrder} disabled={isBusy}>
              Сохранить порядок
            </button>
          </div>
          <div className={styles.caseList}>
            {cases.map((entry) => (
              <button
                key={entry.id}
                type="button"
                className={[styles.caseItem, selectedCaseId === entry.id ? styles.caseItemActive : ""].join(" ")}
                onClick={() => loadCase(entry.id)}
                draggable
                onDragStart={() => setDraggedCaseId(entry.id)}
                onDragOver={(event) => {
                  event.preventDefault();
                }}
                onDrop={() => {
                  if (!draggedCaseId) return;
                  reorderCasesLocally(draggedCaseId, entry.id);
                  setDraggedCaseId(null);
                }}
              >
                <span className={styles.caseItemTop}>
                  <strong>{entry.summaryTitle}</strong>
                  <span className={styles.caseMeta}>{entry.summaryYear}</span>
                </span>
                <span className={styles.caseMeta}>/{entry.slug}</span>
                <span className={styles.badgeRow}>
                  <span className={styles.badge}>{entry.isPublished ? "published" : "draft"}</span>
                  <span className={styles.badge}>sort {entry.draftSortOrder}</span>
                </span>
              </button>
            ))}
          </div>
        </aside>

        <section className={styles.card}>
          {!selectedCaseSummary && <p className={styles.notice}>Выберите кейс для редактирования</p>}
          {selectedCaseSummary && !selectedCase && (
            <div className={styles.inlineActions}>
              <p className={styles.notice}>Кейс не загружен</p>
              <button type="button" className={styles.secondaryButton} onClick={() => loadCase(selectedCaseSummary.id)}>
                Загрузить
              </button>
            </div>
          )}

          {selectedCase && (
            <>
              <h2 className={styles.cardTitle}>Редактор кейса</h2>

              <div className={styles.inlineActions}>
                <button type="button" className={styles.primaryButton} onClick={saveCaseDraft} disabled={isBusy}>
                  Save draft
                </button>
                <button type="button" className={styles.secondaryButton} onClick={publishCase} disabled={isBusy}>
                  Publish
                </button>
                <button type="button" className={styles.secondaryButton} onClick={duplicateCase} disabled={isBusy}>
                  Duplicate
                </button>
                <button type="button" className={styles.dangerButton} onClick={deleteCase} disabled={isBusy}>
                  Delete
                </button>
                <button type="button" className={styles.ghostButton} onClick={generatePreview} disabled={isBusy}>
                  Preview URL
                </button>
              </div>

              {previewLink && (
                <p className={styles.tokenPreview}>
                  Preview: <a href={previewLink}>{previewLink}</a>
                </p>
              )}

              <div className={styles.formGrid}>
                <div className={styles.formRow}>
                  <label className={styles.label}>Название кейса</label>
                  <input
                    className={styles.input}
                    value={selectedCase.draft.summary.title}
                    onChange={(event) =>
                      mutateDraft((draft) => ({
                        ...draft,
                        summary: { ...draft.summary, title: event.target.value },
                        meta: { ...draft.meta, title: event.target.value }
                      }))
                    }
                  />
                </div>
                <div className={styles.formRow}>
                  <label className={styles.label}>Slug</label>
                  <div className={styles.inlineActions}>
                    <input
                      className={styles.input}
                      value={selectedCase.draft.slug}
                      onChange={(event) =>
                        mutateDraft((draft) => ({
                          ...draft,
                          slug: event.target.value
                        }))
                      }
                    />
                    <button
                      type="button"
                      className={styles.ghostButton}
                      onClick={() =>
                        mutateDraft((draft) => ({
                          ...draft,
                          slug: toSlug(draft.summary.title)
                        }))
                      }
                    >
                      Auto
                    </button>
                  </div>
                </div>
                <div className={styles.formRow}>
                  <label className={styles.label}>Год</label>
                  <input
                    className={styles.input}
                    value={selectedCase.draft.summary.year}
                    onChange={(event) =>
                      mutateDraft((draft) => ({
                        ...draft,
                        summary: { ...draft.summary, year: event.target.value }
                      }))
                    }
                  />
                </div>
                <div className={styles.formRow}>
                  <label className={styles.label}>Категория</label>
                  <input
                    className={styles.input}
                    value={selectedCase.draft.summary.category}
                    onChange={(event) =>
                      mutateDraft((draft) => ({
                        ...draft,
                        summary: { ...draft.summary, category: event.target.value }
                      }))
                    }
                  />
                </div>
                <div className={styles.formRow}>
                  <label className={styles.label}>Статус</label>
                  <select
                    className={styles.select}
                    value={selectedCase.draft.status}
                    onChange={(event) =>
                      mutateDraft((draft) => ({
                        ...draft,
                        status: event.target.value as WorkCase["status"]
                      }))
                    }
                  >
                    <option value="hidden">hidden</option>
                    <option value="published">published</option>
                  </select>
                </div>
                <div className={styles.formRow}>
                  <label className={styles.label}>Meta description</label>
                  <textarea
                    className={styles.textarea}
                    value={selectedCase.draft.meta.description}
                    onChange={(event) =>
                      mutateDraft((draft) => ({
                        ...draft,
                        meta: { ...draft.meta, description: event.target.value }
                      }))
                    }
                  />
                </div>
              </div>

              <fieldset className={styles.card}>
                <legend>Preview media</legend>
                <MediaFields
                  value={selectedCase.draft.summary.preview}
                  onChange={(nextMedia) =>
                    mutateDraft((draft) => ({
                      ...draft,
                      summary: {
                        ...draft.summary,
                        preview: {
                          ...draft.summary.preview,
                          ...nextMedia
                        }
                      }
                    }))
                  }
                />
              </fieldset>

              <div className={styles.inlineActions}>
                {SECTION_TYPES.map((type) => (
                  <button
                    type="button"
                    key={type}
                    className={styles.ghostButton}
                    onClick={() =>
                      mutateDraft((draft) => ({
                        ...draft,
                        sections: [...draft.sections, makeEmptySection(type)]
                      }))
                    }
                  >
                    + {type}
                  </button>
                ))}
              </div>

              <div className={styles.sectionList}>
                {selectedCase.draft.sections.map((section, index) => (
                  <SectionEditor
                    key={`${section.type}-${index}`}
                    section={section}
                    onChange={(nextSection) =>
                      mutateDraft((draft) => ({
                        ...draft,
                        sections: draft.sections.map((entry, entryIndex) =>
                          entryIndex === index ? nextSection : entry
                        )
                      }))
                    }
                    onDelete={() =>
                      mutateDraft((draft) => ({
                        ...draft,
                        sections: draft.sections.filter((_, entryIndex) => entryIndex !== index)
                      }))
                    }
                    onMoveUp={() =>
                      mutateDraft((draft) => {
                        if (index === 0) return draft;
                        const next = [...draft.sections];
                        [next[index - 1], next[index]] = [next[index], next[index - 1]];
                        return { ...draft, sections: next };
                      })
                    }
                    onMoveDown={() =>
                      mutateDraft((draft) => {
                        if (index === draft.sections.length - 1) return draft;
                        const next = [...draft.sections];
                        [next[index + 1], next[index]] = [next[index], next[index + 1]];
                        return { ...draft, sections: next };
                      })
                    }
                  />
                ))}
              </div>
            </>
          )}
        </section>
      </div>
    );
  }

  function renderHeaderEditor() {
    return (
      <section className={styles.card}>
        <h2 className={styles.cardTitle}>Шапка сайта</h2>
        <div className={styles.formGrid}>
          <FormField label="Имя" value={headerForm.identity.name} onChange={(value) => setHeaderForm((current) => ({
            ...current,
            identity: { ...current.identity, name: value }
          }))} />
          <FormField
            label="Role Prefix"
            value={headerForm.identity.rolePrefix}
            onChange={(value) =>
              setHeaderForm((current) => ({
                ...current,
                identity: { ...current.identity, rolePrefix: value }
              }))
            }
          />
          <FormField
            label="Company Label"
            value={headerForm.identity.roleCompanyLabel}
            onChange={(value) =>
              setHeaderForm((current) => ({
                ...current,
                identity: { ...current.identity, roleCompanyLabel: value }
              }))
            }
          />
          <FormField
            label="Company Href"
            value={headerForm.identity.roleCompanyHref}
            onChange={(value) =>
              setHeaderForm((current) => ({
                ...current,
                identity: { ...current.identity, roleCompanyHref: value }
              }))
            }
          />
          <FormField
            label="Logo Alt"
            value={headerForm.identity.logoAlt}
            onChange={(value) =>
              setHeaderForm((current) => ({
                ...current,
                identity: { ...current.identity, logoAlt: value }
              }))
            }
          />
        </div>

        <h3>Meta navigation</h3>
        {headerForm.metaNav.map((item, index) => (
          <div key={`${item.href}-${index}`} className={styles.split}>
            <FormField
              label="Label"
              value={item.label}
              onChange={(value) =>
                setHeaderForm((current) => ({
                  ...current,
                  metaNav: current.metaNav.map((entry, entryIndex) =>
                    entryIndex === index ? { ...entry, label: value } : entry
                  )
                }))
              }
            />
            <FormField
              label="Href"
              value={item.href}
              onChange={(value) =>
                setHeaderForm((current) => ({
                  ...current,
                  metaNav: current.metaNav.map((entry, entryIndex) =>
                    entryIndex === index ? { ...entry, href: value } : entry
                  )
                }))
              }
            />
          </div>
        ))}

        <div className={styles.inlineActions}>
          <button type="button" className={styles.primaryButton} onClick={saveHeader} disabled={isBusy}>
            Сохранить шапку
          </button>
        </div>
      </section>
    );
  }

  function renderSiteMetadataEditor() {
    return (
      <section className={styles.card}>
        <h2 className={styles.cardTitle}>Глобальные SEO настройки</h2>

        <div className={styles.formGrid}>
          <FormField
            label="Site name"
            value={siteMetadataForm.siteName}
            onChange={(value) => setSiteMetadataForm((current) => ({ ...current, siteName: value }))}
          />
          <FormField
            label="Default title"
            value={siteMetadataForm.defaultTitle}
            onChange={(value) => setSiteMetadataForm((current) => ({ ...current, defaultTitle: value }))}
          />
          <FormField
            label="Title template"
            value={siteMetadataForm.titleTemplate}
            onChange={(value) => setSiteMetadataForm((current) => ({ ...current, titleTemplate: value }))}
          />
          <FormField
            label="Default description"
            value={siteMetadataForm.defaultDescription}
            onChange={(value) => setSiteMetadataForm((current) => ({ ...current, defaultDescription: value }))}
          />
          <FormField
            label="Default OG image"
            value={siteMetadataForm.defaultOgImage ?? ""}
            onChange={(value) => setSiteMetadataForm((current) => ({ ...current, defaultOgImage: value }))}
          />
          <FormField
            label="Favicon URL"
            value={siteMetadataForm.faviconUrl ?? ""}
            onChange={(value) => setSiteMetadataForm((current) => ({ ...current, faviconUrl: value }))}
          />
          <p className={styles.notice}>
            Для OG/Favicon: загрузите файл во вкладке «Медиа», скопируйте `public_url` и вставьте сюда.
          </p>
          <label className={styles.formRow}>
            <span className={styles.label}>Robots default</span>
            <select
              className={styles.select}
              value={siteMetadataForm.robotsIndexByDefault ? "index" : "noindex"}
              onChange={(event) =>
                setSiteMetadataForm((current) => ({
                  ...current,
                  robotsIndexByDefault: event.target.value === "index"
                }))
              }
            >
              <option value="index">index, follow</option>
              <option value="noindex">noindex, nofollow</option>
            </select>
          </label>
        </div>

        <div className={styles.inlineActions}>
          <button type="button" className={styles.primaryButton} onClick={saveSiteMetadata} disabled={isBusy}>
            Сохранить SEO настройки
          </button>
        </div>
      </section>
    );
  }

  function renderStaticPageEditor(page: StaticPageContent, onChange: (next: StaticPageContent) => void, key: "about" | "connect") {
    return (
      <section className={styles.card}>
        <h2 className={styles.cardTitle}>Страница {key}</h2>

        <div className={styles.formGrid}>
          <FormField
            label="Meta title"
            value={page.meta.title}
            onChange={(value) => onChange({ ...page, meta: { ...page.meta, title: value } })}
          />
          <FormField
            label="Meta description"
            value={page.meta.description}
            onChange={(value) => onChange({ ...page, meta: { ...page.meta, description: value } })}
          />
          <FormField
            label="Canonical"
            value={page.meta.canonical}
            onChange={(value) => onChange({ ...page, meta: { ...page.meta, canonical: value } })}
          />
        </div>

        <div className={styles.inlineActions}>
          {(["paragraph", "list", "quote", "links"] as const).map((type) => (
            <button
              type="button"
              key={type}
              className={styles.ghostButton}
              onClick={() => {
                const nextBlock: StaticPageBlock =
                  type === "paragraph"
                    ? { type, body: "" }
                    : type === "list"
                      ? { type, items: [""] }
                      : type === "quote"
                        ? { type, quote: "" }
                        : { type, items: [{ label: "", href: "#" }] };

                onChange({
                  ...page,
                  blocks: [...page.blocks, nextBlock]
                });
              }}
            >
              + {type}
            </button>
          ))}
        </div>

        <div className={styles.sectionList}>
          {page.blocks.map((block, index) => (
            <StaticBlockEditor
              key={`${block.type}-${index}`}
              block={block}
              onChange={(nextBlock) =>
                onChange({
                  ...page,
                  blocks: page.blocks.map((entry, entryIndex) => (entryIndex === index ? nextBlock : entry))
                })
              }
              onDelete={() =>
                onChange({
                  ...page,
                  blocks: page.blocks.filter((_, entryIndex) => entryIndex !== index)
                })
              }
            />
          ))}
        </div>

        <div className={styles.inlineActions}>
          <button
            type="button"
            className={styles.primaryButton}
            onClick={() => saveStaticPage(page, key)}
            disabled={isBusy}
          >
            Сохранить страницу
          </button>
        </div>
      </section>
    );
  }

  function renderMediaLibrary() {
    return (
      <section className={styles.card}>
        <h2 className={styles.cardTitle}>Медиатека</h2>
        <p className={styles.notice}>Загрузите файл и вставьте URL в поля `src` нужного блока.</p>
        <div className={styles.inlineActions}>
          <label className={styles.ghostButton}>
            Выбрать файл
            <input
              type="file"
              style={{ display: "none" }}
              onChange={async (event) => {
                const file = event.target.files?.[0];
                if (!file) return;
                await uploadMedia(file);
                event.target.value = "";
              }}
            />
          </label>
          <button
            type="button"
            className={styles.secondaryButton}
            disabled={isBusy}
            onClick={async () => {
              await withBusy(async () => {
                const success = await refreshMediaAssets();
                if (success) {
                  pushToast("Список медиа обновлен", "success");
                }
              });
            }}
          >
            Обновить список
          </button>
        </div>

        <div className={styles.assetList}>
          {mediaAssets.map((asset) => (
            <div key={asset.id} className={styles.assetItem}>
              <div>
                <p>
                  <strong>{asset.kind}</strong> · {Math.round(asset.size / 1024)} KB
                </p>
                <p className={styles.notice}>{asset.path}</p>
                <a href={asset.public_url} target="_blank" rel="noreferrer">
                  {asset.public_url}
                </a>
              </div>
              <button
                type="button"
                className={styles.secondaryButton}
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(asset.public_url);
                    pushToast("URL скопирован в буфер обмена", "success");
                  } catch {
                    pushToast("Не удалось скопировать URL", "error");
                  }
                }}
              >
                Copy URL
              </button>
            </div>
          ))}
        </div>
      </section>
    );
  }

  return (
    <div className={styles.consoleWrap}>
      <header className={styles.consoleHeader}>
        <div className={styles.titleGroup}>
          <h1 className={styles.consoleTitle}>CMS портфолио</h1>
          <p className={styles.consoleSubtitle}>Визуальный редактор кейсов, шапки, SEO, about, connect</p>
        </div>

        <div className={styles.tabRow}>
          {([
            ["cases", "Кейсы"],
            ["header", "Шапка"],
            ["siteMeta", "SEO"],
            ["about", "About"],
            ["connect", "Connect"],
            ["media", "Медиа"]
          ] as const).map(([value, label]) => (
            <button
              key={value}
              type="button"
              className={[styles.tabButton, tab === value ? styles.tabButtonActive : ""].join(" ")}
              onClick={() => setTab(value)}
            >
              {label}
            </button>
          ))}
        </div>
      </header>

      {tab === "cases" && renderCaseEditor()}
      {tab === "header" && renderHeaderEditor()}
      {tab === "siteMeta" && renderSiteMetadataEditor()}
      {tab === "about" && renderStaticPageEditor(aboutPage, setAboutPage, "about")}
      {tab === "connect" && renderStaticPageEditor(connectPage, setConnectPage, "connect")}
      {tab === "media" && renderMediaLibrary()}

      <div className={styles.toastViewport} aria-live="polite">
        {isBusy && (
          <div className={[styles.toast, styles.toastInfo].join(" ")} role="status">
            Выполняется...
          </div>
        )}
        {toasts.map((toast) => (
          <div key={toast.id} className={[styles.toast, getToastToneClassName(toast.tone)].join(" ")} role="status">
            <span>{toast.text}</span>
            <button type="button" className={styles.toastClose} onClick={() => dismissToast(toast.id)} aria-label="Закрыть уведомление">
              Закрыть
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

interface FormFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
}

function FormField({ label, value, onChange }: FormFieldProps) {
  return (
    <label className={styles.formRow}>
      <span className={styles.label}>{label}</span>
      <input className={styles.input} value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

interface MediaFieldsProps {
  value: MediaPlaceholder;
  onChange: (next: MediaPlaceholder) => void;
}

function MediaFields({ value, onChange }: MediaFieldsProps) {
  return (
    <div className={styles.formGrid}>
      <label className={styles.formRow}>
        <span className={styles.label}>Kind</span>
        <select
          className={styles.select}
          value={value.kind}
          onChange={(event) => onChange({ ...value, kind: event.target.value as MediaPlaceholder["kind"] })}
        >
          <option value="image">image</option>
          <option value="video">video</option>
          <option value="gif">gif</option>
        </select>
      </label>

      <FormField label="Aspect ratio" value={value.aspectRatio ?? ""} onChange={(next) => onChange({ ...value, aspectRatio: next })} />
      <FormField label="Src" value={value.src ?? ""} onChange={(next) => onChange({ ...value, src: next })} />
      <FormField
        label="Placeholder token"
        value={value.placeholderToken ?? ""}
        onChange={(next) => onChange({ ...value, placeholderToken: next })}
      />
      <FormField label="Caption" value={value.caption ?? ""} onChange={(next) => onChange({ ...value, caption: next })} />
    </div>
  );
}

interface SectionEditorProps {
  section: SectionBlock;
  onChange: (section: SectionBlock) => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}

function SectionEditor({ section, onChange, onDelete, onMoveUp, onMoveDown }: SectionEditorProps) {
  return (
    <article className={styles.sectionEditor}>
      <header className={styles.sectionHeader}>
        <strong>{section.type}</strong>
        <div className={styles.inlineActions}>
          <button type="button" className={styles.ghostButton} onClick={onMoveUp}>
            ↑
          </button>
          <button type="button" className={styles.ghostButton} onClick={onMoveDown}>
            ↓
          </button>
          <button type="button" className={styles.dangerButton} onClick={onDelete}>
            Удалить
          </button>
        </div>
      </header>

      {(section.type === "paragraph" || section.type === "list") && (
        <>
          <FormField
            label="Title"
            value={section.title ?? ""}
            onChange={(value) => onChange({ ...section, title: value } as SectionBlock)}
          />

          {section.type === "paragraph" ? (
            <label className={styles.formRow}>
              <span className={styles.label}>Body</span>
              <textarea
                className={styles.textarea}
                value={section.body}
                onChange={(event) => onChange({ ...section, body: event.target.value })}
              />
            </label>
          ) : (
            <label className={styles.formRow}>
              <span className={styles.label}>Items (one per line)</span>
              <textarea
                className={styles.textarea}
                value={joinLines(section.items)}
                onChange={(event) => onChange({ ...section, items: splitLines(event.target.value) })}
              />
            </label>
          )}
        </>
      )}

      {section.type === "media" && <MediaFields value={section.media} onChange={(media) => onChange({ ...section, media })} />}

      {section.type === "quote" && (
        <>
          <label className={styles.formRow}>
            <span className={styles.label}>Quote</span>
            <textarea
              className={styles.textarea}
              value={section.quote}
              onChange={(event) => onChange({ ...section, quote: event.target.value })}
            />
          </label>
          <FormField
            label="Attribution"
            value={section.attribution ?? ""}
            onChange={(value) => onChange({ ...section, attribution: value })}
          />
        </>
      )}

      {section.type === "cta" && (
        <>
          <FormField label="Label" value={section.label} onChange={(value) => onChange({ ...section, label: value })} />
          <FormField label="Href" value={section.href} onChange={(value) => onChange({ ...section, href: value })} />
          <label className={styles.formRow}>
            <span className={styles.label}>Body</span>
            <textarea
              className={styles.textarea}
              value={section.body ?? ""}
              onChange={(event) => onChange({ ...section, body: event.target.value })}
            />
          </label>
        </>
      )}

      {section.type === "gallery" && (
        <>
          <FormField label="Title" value={section.title ?? ""} onChange={(value) => onChange({ ...section, title: value })} />
          <label className={styles.formRow}>
            <span className={styles.label}>Body</span>
            <textarea
              className={styles.textarea}
              value={section.body ?? ""}
              onChange={(event) => onChange({ ...section, body: event.target.value })}
            />
          </label>
          <label className={styles.formRow}>
            <span className={styles.label}>Layout</span>
            <select
              className={styles.select}
              value={section.layout ?? "grid"}
              onChange={(event) => onChange({ ...section, layout: event.target.value as "grid" | "carousel" })}
            >
              <option value="grid">grid</option>
              <option value="carousel">carousel</option>
            </select>
          </label>
          <div className={styles.sectionList}>
            {section.items.map((item, itemIndex) => (
              <div className={styles.mediaItemRow} key={`${section.type}-${itemIndex}`}>
                <MediaFields
                  value={item}
                  onChange={(nextMedia) => {
                    onChange({
                      ...section,
                      items: section.items.map((entry, entryIndex) => (entryIndex === itemIndex ? nextMedia : entry))
                    });
                  }}
                />
                <button
                  type="button"
                  className={styles.dangerButton}
                  onClick={() =>
                    onChange({
                      ...section,
                      items: section.items.filter((_, entryIndex) => entryIndex !== itemIndex)
                    })
                  }
                >
                  Удалить медиа
                </button>
              </div>
            ))}
          </div>
          <button
            type="button"
            className={styles.ghostButton}
            onClick={() => onChange({ ...section, items: [...section.items, makeEmptyMedia()] })}
          >
            + Медиа
          </button>
        </>
      )}

      {section.type === "metrics" && (
        <>
          <FormField label="Title" value={section.title ?? ""} onChange={(value) => onChange({ ...section, title: value })} />
          {section.items.map((item, itemIndex) => (
            <div key={`${section.type}-${itemIndex}`} className={styles.split}>
              <FormField
                label="Value"
                value={item.value}
                onChange={(value) =>
                  onChange({
                    ...section,
                    items: section.items.map((entry, entryIndex) =>
                      entryIndex === itemIndex ? { ...entry, value } : entry
                    )
                  })
                }
              />
              <FormField
                label="Label"
                value={item.label}
                onChange={(value) =>
                  onChange({
                    ...section,
                    items: section.items.map((entry, entryIndex) =>
                      entryIndex === itemIndex ? { ...entry, label: value } : entry
                    )
                  })
                }
              />
              <FormField
                label="Note"
                value={item.note ?? ""}
                onChange={(value) =>
                  onChange({
                    ...section,
                    items: section.items.map((entry, entryIndex) =>
                      entryIndex === itemIndex ? { ...entry, note: value } : entry
                    )
                  })
                }
              />
              <button
                type="button"
                className={styles.dangerButton}
                onClick={() =>
                  onChange({
                    ...section,
                    items: section.items.filter((_, entryIndex) => entryIndex !== itemIndex)
                  })
                }
              >
                Удалить
              </button>
            </div>
          ))}
          <button
            type="button"
            className={styles.ghostButton}
            onClick={() => onChange({ ...section, items: [...section.items, { value: "", label: "", note: "" }] })}
          >
            + Метрика
          </button>
        </>
      )}

      {section.type === "timeline" && (
        <>
          <FormField label="Title" value={section.title ?? ""} onChange={(value) => onChange({ ...section, title: value })} />
          {section.items.map((item, itemIndex) => (
            <div className={styles.mediaItemRow} key={`${section.type}-${itemIndex}`}>
              <FormField
                label="Title"
                value={item.title}
                onChange={(value) =>
                  onChange({
                    ...section,
                    items: section.items.map((entry, entryIndex) =>
                      entryIndex === itemIndex ? { ...entry, title: value } : entry
                    )
                  })
                }
              />
              <FormField
                label="Period"
                value={item.period ?? ""}
                onChange={(value) =>
                  onChange({
                    ...section,
                    items: section.items.map((entry, entryIndex) =>
                      entryIndex === itemIndex ? { ...entry, period: value } : entry
                    )
                  })
                }
              />
              <label className={styles.formRow}>
                <span className={styles.label}>Body</span>
                <textarea
                  className={styles.textarea}
                  value={item.body ?? ""}
                  onChange={(event) =>
                    onChange({
                      ...section,
                      items: section.items.map((entry, entryIndex) =>
                        entryIndex === itemIndex ? { ...entry, body: event.target.value } : entry
                      )
                    })
                  }
                />
              </label>

              <MediaFields
                value={item.media ?? makeEmptyMedia()}
                onChange={(media) =>
                  onChange({
                    ...section,
                    items: section.items.map((entry, entryIndex) =>
                      entryIndex === itemIndex ? { ...entry, media } : entry
                    )
                  })
                }
              />

              <button
                type="button"
                className={styles.dangerButton}
                onClick={() =>
                  onChange({
                    ...section,
                    items: section.items.filter((_, entryIndex) => entryIndex !== itemIndex)
                  })
                }
              >
                Удалить этап
              </button>
            </div>
          ))}
          <button
            type="button"
            className={styles.ghostButton}
            onClick={() =>
              onChange({
                ...section,
                items: [...section.items, { title: "", period: "", body: "", media: makeEmptyMedia() }]
              })
            }
          >
            + Этап
          </button>
        </>
      )}

      {section.type === "twoColumn" && (
        <>
          <FormField label="Title" value={section.title ?? ""} onChange={(value) => onChange({ ...section, title: value })} />
          <div className={styles.split}>
            <SimpleColumnEditor
              title="Left"
              items={section.left}
              onChange={(next) => onChange({ ...section, left: next })}
            />
            <SimpleColumnEditor
              title="Right"
              items={section.right}
              onChange={(next) => onChange({ ...section, right: next })}
            />
          </div>
        </>
      )}
    </article>
  );
}

interface SimpleColumnEditorProps {
  title: string;
  items: SimpleSectionBlock[];
  onChange: (items: SimpleSectionBlock[]) => void;
}

function SimpleColumnEditor({ title, items, onChange }: SimpleColumnEditorProps) {
  return (
    <section className={styles.sectionEditor}>
      <h4>{title}</h4>
      <div className={styles.inlineActions}>
        {SIMPLE_SECTION_TYPES.map((type) => (
          <button type="button" key={type} className={styles.ghostButton} onClick={() => onChange([...items, makeEmptySimpleBlock(type)])}>
            + {type}
          </button>
        ))}
      </div>
      {items.map((item, index) => (
        <div className={styles.sectionEditor} key={`${item.type}-${index}`}>
          <strong>{item.type}</strong>
          <SimpleSectionFields
            block={item}
            onChange={(nextBlock) => onChange(items.map((entry, entryIndex) => (entryIndex === index ? nextBlock : entry)))}
          />
          <button
            type="button"
            className={styles.dangerButton}
            onClick={() => onChange(items.filter((_, entryIndex) => entryIndex !== index))}
          >
            Удалить
          </button>
        </div>
      ))}
    </section>
  );
}

interface SimpleSectionFieldsProps {
  block: SimpleSectionBlock;
  onChange: (block: SimpleSectionBlock) => void;
}

function SimpleSectionFields({ block, onChange }: SimpleSectionFieldsProps) {
  if (block.type === "paragraph") {
    return (
      <>
        <FormField label="Title" value={block.title ?? ""} onChange={(value) => onChange({ ...block, title: value })} />
        <label className={styles.formRow}>
          <span className={styles.label}>Body</span>
          <textarea
            className={styles.textarea}
            value={block.body}
            onChange={(event) => onChange({ ...block, body: event.target.value })}
          />
        </label>
      </>
    );
  }

  if (block.type === "list") {
    return (
      <>
        <FormField label="Title" value={block.title ?? ""} onChange={(value) => onChange({ ...block, title: value })} />
        <label className={styles.formRow}>
          <span className={styles.label}>Items</span>
          <textarea
            className={styles.textarea}
            value={joinLines(block.items)}
            onChange={(event) => onChange({ ...block, items: splitLines(event.target.value) })}
          />
        </label>
      </>
    );
  }

  if (block.type === "media") {
    return <MediaFields value={block.media} onChange={(media) => onChange({ ...block, media })} />;
  }

  if (block.type === "quote") {
    return (
      <>
        <label className={styles.formRow}>
          <span className={styles.label}>Quote</span>
          <textarea
            className={styles.textarea}
            value={block.quote}
            onChange={(event) => onChange({ ...block, quote: event.target.value })}
          />
        </label>
        <FormField
          label="Attribution"
          value={block.attribution ?? ""}
          onChange={(value) => onChange({ ...block, attribution: value })}
        />
      </>
    );
  }

  return (
    <>
      <FormField label="Label" value={block.label} onChange={(value) => onChange({ ...block, label: value })} />
      <FormField label="Href" value={block.href} onChange={(value) => onChange({ ...block, href: value })} />
      <label className={styles.formRow}>
        <span className={styles.label}>Body</span>
        <textarea
          className={styles.textarea}
          value={block.body ?? ""}
          onChange={(event) => onChange({ ...block, body: event.target.value })}
        />
      </label>
    </>
  );
}

interface StaticBlockEditorProps {
  block: StaticPageBlock;
  onChange: (block: StaticPageBlock) => void;
  onDelete: () => void;
}

function StaticBlockEditor({ block, onChange, onDelete }: StaticBlockEditorProps) {
  return (
    <article className={styles.sectionEditor}>
      <header className={styles.sectionHeader}>
        <strong>{block.type}</strong>
        <button type="button" className={styles.dangerButton} onClick={onDelete}>
          Удалить
        </button>
      </header>

      {(block.type === "paragraph" || block.type === "list" || block.type === "links") && (
        <FormField
          label="Title"
          value={block.title ?? ""}
          onChange={(value) => onChange({ ...block, title: optionalText(value) } as StaticPageBlock)}
        />
      )}

      {block.type === "paragraph" && (
        <label className={styles.formRow}>
          <span className={styles.label}>Body</span>
          <textarea
            className={styles.textarea}
            value={block.body}
            onChange={(event) => onChange({ ...block, body: event.target.value })}
          />
        </label>
      )}

      {block.type === "list" && (
        <label className={styles.formRow}>
          <span className={styles.label}>Items</span>
          <textarea
            className={styles.textarea}
            value={joinLines(block.items)}
            onChange={(event) => onChange({ ...block, items: splitLines(event.target.value) })}
          />
        </label>
      )}

      {block.type === "quote" && (
        <>
          <label className={styles.formRow}>
            <span className={styles.label}>Quote</span>
            <textarea
              className={styles.textarea}
              value={block.quote}
              onChange={(event) => onChange({ ...block, quote: event.target.value })}
            />
          </label>
          <FormField
            label="Attribution"
            value={block.attribution ?? ""}
            onChange={(value) => onChange({ ...block, attribution: optionalText(value) })}
          />
        </>
      )}

      {block.type === "links" && (
        <>
          {block.items.map((item, index) => (
            <div className={styles.split} key={`${item.label}-${index}`}>
              <FormField
                label="Label"
                value={item.label}
                onChange={(value) =>
                  onChange({
                    ...block,
                    items: block.items.map((entry, entryIndex) =>
                      entryIndex === index ? { ...entry, label: value } : entry
                    )
                  })
                }
              />
              <FormField
                label="Href"
                value={item.href}
                onChange={(value) =>
                  onChange({
                    ...block,
                    items: block.items.map((entry, entryIndex) =>
                      entryIndex === index ? { ...entry, href: value } : entry
                    )
                  })
                }
              />
              <button
                type="button"
                className={styles.dangerButton}
                onClick={() =>
                  onChange({
                    ...block,
                    items: block.items.filter((_, entryIndex) => entryIndex !== index)
                  })
                }
              >
                Удалить
              </button>
            </div>
          ))}

          <button
            type="button"
            className={styles.ghostButton}
            onClick={() => onChange({ ...block, items: [...block.items, { label: "", href: "#" }] })}
          >
            + Link
          </button>
        </>
      )}
    </article>
  );
}
