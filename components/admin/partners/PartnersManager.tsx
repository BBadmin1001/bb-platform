"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  Pencil,
  X,
  Save,
  Eye,
  EyeOff,
} from "lucide-react";
import {
  createCategory,
  updateCategory,
  deleteCategory,
  reorderCategories,
  createPartner,
  updatePartner,
  deletePartner,
  type PartnerFormInput,
} from "@/app/admin/partners/actions";
import ImagePicker, {
  type LibraryItem,
} from "@/components/admin/media/ImagePicker";
import type { CropArea } from "@/components/admin/media/CropEditor";
import { cldUrl } from "@/lib/cloudinary";
import {
  DEFAULT_PARTNER_PHOTO,
  DEFAULT_PARTNER_LOGO,
} from "@/lib/imageDefaults";

export type CategoryRow = {
  id: string;
  title: string;
  description: string | null;
  display_order: number;
  is_visible: boolean;
};

export type PartnerRow = {
  id: string;
  category_id: string | null;
  name: string;
  role: string | null;
  company: string | null;
  phone: string | null;
  email: string | null;
  display_order: number;
  is_visible: boolean;
  photo_id: string | null;
  photo_crop: CropArea | null;
  logo_id: string | null;
  logo_crop: CropArea | null;
};

export default function PartnersManager({
  categories,
  partners,
  library,
}: {
  categories: CategoryRow[];
  partners: PartnerRow[];
  library: LibraryItem[];
}) {
  const router = useRouter();
  const [cats, setCats] = useState<CategoryRow[]>(categories);
  const [, startTransition] = useTransition();
  const [editingCat, setEditingCat] = useState<CategoryRow | null>(null);
  const [addingCat, setAddingCat] = useState(false);

  const partnersByCategory = new Map<string, PartnerRow[]>();
  for (const p of partners) {
    if (!p.category_id) continue;
    const arr = partnersByCategory.get(p.category_id) ?? [];
    arr.push(p);
    partnersByCategory.set(p.category_id, arr);
  }

  function moveCategory(i: number, delta: number) {
    const j = i + delta;
    if (j < 0 || j >= cats.length) return;
    const next = [...cats];
    [next[i], next[j]] = [next[j], next[i]];
    setCats(next);
    startTransition(async () => {
      await reorderCategories(next.map((c) => c.id));
      router.refresh();
    });
  }

  function handleDeleteCategory(id: string) {
    if (
      !confirm(
        "Delete this category? All partners under it will be detached but kept.",
      )
    )
      return;
    startTransition(async () => {
      await deleteCategory(id);
      setCats((prev) => prev.filter((c) => c.id !== id));
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => setAddingCat(true)}
          className="admin-btn"
        >
          <Plus size={14} className="mr-2" /> New category
        </button>
      </div>

      {cats.length === 0 && (
        <div className="admin-card p-10 text-center text-sm text-ink/65">
          No categories yet — click <strong>New category</strong> to add one.
        </div>
      )}

      {cats.map((cat, i) => (
        <CategoryBlock
          key={cat.id}
          category={cat}
          partners={partnersByCategory.get(cat.id) ?? []}
          library={library}
          isFirst={i === 0}
          isLast={i === cats.length - 1}
          onMoveUp={() => moveCategory(i, -1)}
          onMoveDown={() => moveCategory(i, 1)}
          onEdit={() => setEditingCat(cat)}
          onDelete={() => handleDeleteCategory(cat.id)}
        />
      ))}

      {(addingCat || editingCat) && (
        <CategoryDialog
          existing={editingCat ?? undefined}
          onClose={() => {
            setAddingCat(false);
            setEditingCat(null);
          }}
          onSaved={() => {
            setAddingCat(false);
            setEditingCat(null);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}

// =============================================================================
// Category Block — header + partner list + add/edit partner dialog
// =============================================================================
function CategoryBlock({
  category,
  partners,
  library,
  isFirst,
  isLast,
  onMoveUp,
  onMoveDown,
  onEdit,
  onDelete,
}: {
  category: CategoryRow;
  partners: PartnerRow[];
  library: LibraryItem[];
  isFirst: boolean;
  isLast: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState<PartnerRow | null>(null);
  const [adding, setAdding] = useState(false);
  const [, startTransition] = useTransition();

  function handleDeletePartner(id: string) {
    if (!confirm("Delete this partner?")) return;
    startTransition(async () => {
      await deletePartner(id);
      router.refresh();
    });
  }

  return (
    <div className="admin-card p-5">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-start gap-2 min-w-0">
          <div className="flex flex-col gap-0.5 pt-1.5">
            <button
              type="button"
              onClick={onMoveUp}
              disabled={isFirst}
              className="text-ink/40 hover:text-ink disabled:opacity-30"
            >
              <ChevronUp size={14} />
            </button>
            <button
              type="button"
              onClick={onMoveDown}
              disabled={isLast}
              className="text-ink/40 hover:text-ink disabled:opacity-30"
            >
              <ChevronDown size={14} />
            </button>
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3
                className="text-base text-ink"
                style={{ fontWeight: 500 }}
              >
                {category.title}
              </h3>
              {!category.is_visible && (
                <EyeOff size={12} className="text-ink/40" />
              )}
            </div>
            {category.description && (
              <p className="text-xs text-ink/55 mt-1">
                {category.description}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onEdit}
            className="text-xs text-navy hover:underline inline-flex items-center gap-1"
          >
            <Pencil size={12} /> Edit
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="text-xs text-ink/55 hover:text-red-600 inline-flex items-center gap-1"
          >
            <Trash2 size={12} /> Delete
          </button>
        </div>
      </div>

      <div className="space-y-2">
        {partners.length === 0 ? (
          <p className="text-xs text-ink/45 italic px-2">No partners yet.</p>
        ) : (
          partners.map((p) => {
            const photo = library.find((m) => m.id === p.photo_id);
            const logo = library.find((m) => m.id === p.logo_id);
            const photoSrc = photo?.cloudinary_public_id
              ? cldUrl(photo.cloudinary_public_id, { crop: "square", width: 80 })
              : photo?.url;
            const logoSrc = logo?.cloudinary_public_id
              ? cldUrl(logo.cloudinary_public_id, { width: 80 })
              : logo?.url;
            return (
              <div
                key={p.id}
                className="border border-black/8 rounded-md p-3 bg-white grid grid-cols-1 md:grid-cols-12 gap-2 items-center"
              >
                <div className="md:col-span-1 flex items-center">
                  <div className="w-9 h-9 rounded-full overflow-hidden bg-cream-soft ring-1 ring-black/8 shrink-0">
                    {photoSrc && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={photoSrc}
                        alt={p.name}
                        className="w-full h-full object-cover"
                      />
                    )}
                  </div>
                </div>
                <div className="md:col-span-3">
                  <p className="text-sm" style={{ fontWeight: 500 }}>
                    {p.name}
                  </p>
                  {p.role && (
                    <p className="text-[11px] text-ink/55">{p.role}</p>
                  )}
                </div>
                <div className="md:col-span-3 text-xs text-ink/70 truncate flex items-center gap-2">
                  {logoSrc && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={logoSrc}
                      alt={`${p.company} logo`}
                      className="h-5 w-auto max-w-[40px] object-contain shrink-0"
                    />
                  )}
                  <span className="truncate">{p.company}</span>
                </div>
                <div className="md:col-span-2 text-xs text-ink/70 truncate">
                  {p.phone}
                </div>
                <div className="md:col-span-2 text-xs text-ink/70 truncate">
                  {p.email}
                </div>
                <div className="md:col-span-1 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setEditing(p)}
                    className="text-ink/55 hover:text-navy"
                  >
                    <Pencil size={13} />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeletePartner(p.id)}
                    className="text-ink/55 hover:text-red-600"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            );
          })
        )}
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="inline-flex items-center gap-1.5 text-xs text-navy hover:underline mt-1"
        >
          <Plus size={13} /> Add partner
        </button>
      </div>

      {(adding || editing) && (
        <PartnerDialog
          categoryId={category.id}
          existing={editing ?? undefined}
          library={library}
          onClose={() => {
            setAdding(false);
            setEditing(null);
          }}
          onSaved={() => {
            setAdding(false);
            setEditing(null);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}

// =============================================================================
// Dialogs
// =============================================================================
function CategoryDialog({
  existing,
  onClose,
  onSaved,
}: {
  existing?: CategoryRow;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [title, setTitle] = useState(existing?.title ?? "");
  const [description, setDescription] = useState(existing?.description ?? "");
  const [isVisible, setIsVisible] = useState(existing?.is_visible ?? true);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function save() {
    setError(null);
    startTransition(async () => {
      const res = existing
        ? await updateCategory(existing.id, {
            title,
            description,
            is_visible: isVisible,
          })
        : await createCategory({ title, description });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      onSaved();
    });
  }

  return (
    <Modal title={existing ? "Edit category" : "New category"} onClose={onClose}>
      <div className="p-5 space-y-4">
        <div>
          <label className="admin-label">Title</label>
          <input
            className="admin-input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Lenders"
          />
        </div>
        <div>
          <label className="admin-label">Description</label>
          <textarea
            rows={4}
            className="admin-input"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="A short editorial blurb about this category."
          />
        </div>
        {existing && (
          <label className="inline-flex items-center gap-2">
            <input
              type="checkbox"
              checked={isVisible}
              onChange={(e) => setIsVisible(e.target.checked)}
            />
            <span className="text-sm text-ink/75">Show on public site</span>
          </label>
        )}
        {error && <p className="text-xs text-red-700">{error}</p>}
      </div>
      <Footer onClose={onClose} onSave={save} pending={pending} />
    </Modal>
  );
}

function PartnerDialog({
  categoryId,
  existing,
  library,
  onClose,
  onSaved,
}: {
  categoryId: string;
  existing?: PartnerRow;
  library: LibraryItem[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [v, setV] = useState<PartnerFormInput>({
    category_id: categoryId,
    name: existing?.name ?? "",
    role: existing?.role ?? "",
    company: existing?.company ?? "",
    phone: existing?.phone ?? "",
    email: existing?.email ?? "",
    is_visible: existing?.is_visible ?? true,
    photo_id: existing?.photo_id ?? null,
    photo_crop: existing?.photo_crop ?? null,
    logo_id: existing?.logo_id ?? null,
    logo_crop: existing?.logo_crop ?? null,
  });
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof PartnerFormInput>(k: K, val: PartnerFormInput[K]) {
    setV((p) => ({ ...p, [k]: val }));
  }

  function save() {
    setError(null);
    startTransition(async () => {
      const res = existing
        ? await updatePartner(existing.id, v)
        : await createPartner(v);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      onSaved();
    });
  }

  return (
    <Modal title={existing ? "Edit partner" : "New partner"} onClose={onClose}>
      <div className="p-5 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="admin-label">Name</label>
            <input
              className="admin-input"
              value={v.name}
              onChange={(e) => set("name", e.target.value)}
            />
          </div>
          <div>
            <label className="admin-label">Role</label>
            <input
              className="admin-input"
              value={v.role}
              onChange={(e) => set("role", e.target.value)}
            />
          </div>
          <div>
            <label className="admin-label">Company</label>
            <input
              className="admin-input"
              value={v.company}
              onChange={(e) => set("company", e.target.value)}
            />
          </div>
          <div>
            <label className="admin-label">Phone</label>
            <input
              className="admin-input"
              value={v.phone}
              onChange={(e) => set("phone", e.target.value)}
            />
          </div>
          <div className="sm:col-span-2">
            <label className="admin-label">Email</label>
            <input
              type="email"
              className="admin-input"
              value={v.email}
              onChange={(e) => set("email", e.target.value)}
            />
          </div>
        </div>

        {/* Photo + logo pickers */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          <ImagePicker
            label="Headshot Photo"
            crop="square"
            value={v.photo_id}
            onChange={(id) => set("photo_id", id)}
            cropArea={v.photo_crop ?? null}
            onCropAreaChange={(c) => set("photo_crop", c)}
            library={library}
            emptyText="Default headshot shown until you pick or upload."
            fallbackUrl={DEFAULT_PARTNER_PHOTO}
          />
          <ImagePicker
            label="Company Logo"
            crop="free"
            value={v.logo_id}
            onChange={(id) => set("logo_id", id)}
            cropArea={v.logo_crop ?? null}
            onCropAreaChange={(c) => set("logo_crop", c)}
            library={library}
            emptyText="Default logo placeholder shown until you pick or upload."
            fallbackUrl={DEFAULT_PARTNER_LOGO}
          />
        </div>

        <label className="inline-flex items-center gap-2">
          <input
            type="checkbox"
            checked={v.is_visible}
            onChange={(e) => set("is_visible", e.target.checked)}
          />
          <span className="text-sm text-ink/75">Show on public site</span>
        </label>
        {error && <p className="text-xs text-red-700">{error}</p>}
      </div>
      <Footer onClose={onClose} onSave={save} pending={pending || !v.name} />
    </Modal>
  );
}

function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-6 overflow-y-auto"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-md max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="px-5 py-4 border-b border-black/10 flex items-center justify-between sticky top-0 bg-white z-10">
          <h3 className="text-sm" style={{ fontWeight: 500 }}>
            {title}
          </h3>
          <button onClick={onClose} className="text-ink/55 hover:text-ink">
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Footer({
  onClose,
  onSave,
  pending,
}: {
  onClose: () => void;
  onSave: () => void;
  pending: boolean;
}) {
  return (
    <div className="px-5 py-4 border-t border-black/10 flex items-center justify-end gap-2 sticky bottom-0 bg-white">
      <button onClick={onClose} className="admin-btn admin-btn-secondary">
        Cancel
      </button>
      <button onClick={onSave} disabled={pending} className="admin-btn">
        <Save size={14} className="mr-2" /> Save
      </button>
    </div>
  );
}
