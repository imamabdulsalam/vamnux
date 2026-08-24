import { Archive, CheckSquare, Eye, FolderOpen, GripVertical, Pencil, RotateCcw, Square, X } from "lucide-react";
import { useMemo, useState } from "react";
import { GAMES_PLATFORM_SUBCATEGORIES } from "@shared/gamesPlatformCategories";
import "./adminGamesSubcategories.css";

export type CategoryOperationCategory = {
  id: number;
  slug: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  sortOrder: number;
  visible: boolean;
  featured: boolean;
  status: "active" | "archived";
  createdAt: Date;
  updatedAt: Date;
};

export type CategoryOperationProduct = { id: number; name: string; supplierKey: string | null; displayPrice: number; baseCurrency: string; storefrontStatus: string; platformCode?: string | null };

type BulkAction = "hide" | "archive" | "show" | "restore";

function label(value: string) { return value.replaceAll("_", " "); }

export function CategoryOperationsWorkspace({
  categories, productsForCategory, onUpdate, onBulk, onEdit, onEditProduct, onReorder,
}: {
  categories: CategoryOperationCategory[];
  productsForCategory: (category: CategoryOperationCategory) => CategoryOperationProduct[];
  onUpdate: (category: CategoryOperationCategory, change: Partial<Pick<CategoryOperationCategory, "visible" | "status">>) => void;
  onBulk: (ids: number[], action: BulkAction) => void;
  onEdit: (category: CategoryOperationCategory) => void;
  onEditProduct: (productId: number) => void;
  onReorder: (ids: number[]) => void;
}) {
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [quickViewId, setQuickViewId] = useState<number | null>(null);
  const [draggedId, setDraggedId] = useState<number | null>(null);
  const allSelected = categories.length > 0 && categories.every((category) => selectedIds.includes(category.id));
  const selectedCategories = useMemo(() => categories.filter((category) => selectedIds.includes(category.id)), [categories, selectedIds]);
  const quickView = categories.find((category) => category.id === quickViewId) || null;
  const toggle = (id: number) => setSelectedIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  const runBulk = (action: BulkAction) => {
    if (!selectedIds.length) return;
    const actionLabel = action === "restore" ? "restore and show" : action;
    if (!window.confirm(`Confirm ${actionLabel} for ${selectedIds.length} selected VAMNUX categories. Products remain stored and no supplier inventory is deleted.`)) return;
    onBulk(selectedIds, action);
    setSelectedIds([]);
  };
  const move = (targetId: number) => {
    if (!draggedId || draggedId === targetId) return;
    const ids = categories.map((category) => category.id);
    const from = ids.indexOf(draggedId); const to = ids.indexOf(targetId);
    if (from < 0 || to < 0) return;
    ids.splice(to, 0, ids.splice(from, 1)[0]);
    onReorder(ids);
  };

  return <section className="admin-category-operations">
    <div className="admin-category-bulkbar">
      <button type="button" className="admin-secondary-action" onClick={() => setSelectedIds(allSelected ? [] : categories.map((category) => category.id))}>{allSelected ? <CheckSquare size={14} /> : <Square size={14} />}{allSelected ? "Clear selection" : "Select all"}</button>
      <strong>{selectedIds.length} selected</strong>
      <button type="button" className="admin-secondary-action" disabled={!selectedIds.length} onClick={() => runBulk("hide")}>Hide selected</button>
      <button type="button" className="admin-danger-action" disabled={!selectedIds.length} onClick={() => runBulk("archive")}>Archive selected</button>
      <button type="button" className="admin-primary-action" disabled={!selectedIds.length || !selectedCategories.some((category) => !category.visible)} onClick={() => runBulk("show")}>Show selected</button>
      <button type="button" className="admin-primary-action" disabled={!selectedIds.length || !selectedCategories.some((category) => category.status === "archived")} onClick={() => runBulk("restore")}><RotateCcw size={14} />Restore selected</button>
    </div>
    <p className="admin-category-helper">Drag the handle to reorder storefront categories. Hidden or archived rows are excluded from marketplace navigation; restore makes an archived category active and visible again.</p>
    <div className="admin-category-operation-list">
      {categories.map((category) => {
        const products = productsForCategory(category);
        const isArchived = category.status === "archived";
        const isGames = category.slug === "games";
        return <article key={category.id} className={isArchived ? "archived" : category.visible ? "" : "hidden"} draggable onDragStart={() => setDraggedId(category.id)} onDragEnd={() => setDraggedId(null)} onDragOver={(event) => event.preventDefault()} onDrop={() => move(category.id)}>
          <div className="admin-category-operation-ident">
            <button type="button" className="admin-category-checkbox" aria-label={`Select ${category.name}`} onClick={() => toggle(category.id)}>{selectedIds.includes(category.id) ? <CheckSquare size={16} /> : <Square size={16} />}</button>
            <span className="admin-category-drag" aria-label={`Drag ${category.name} to change order`}><GripVertical size={16} /></span>
            <div><strong>{category.name}</strong><small>{category.slug} · {products.length} mapped products · display order {category.sortOrder}</small><div className="admin-category-state"><span className={isArchived ? "admin-status danger" : "admin-status active"}>{category.status}</span><span className={category.visible && !isArchived ? "admin-status active" : "admin-status muted"}>{category.visible && !isArchived ? "shown" : "hidden"}</span></div></div>
          </div>
          <div className="admin-category-operation-actions">
            <button type="button" className="admin-secondary-action" onClick={() => setQuickViewId(category.id)}><Eye size={14} />Quick view</button>
            <button type="button" className="admin-secondary-action" onClick={() => onEditProduct(products[0]?.id)} disabled={!products.length}><FolderOpen size={14} />Products ({products.length})</button>
            <button type="button" className="admin-secondary-action" onClick={() => onEdit(category)}><Pencil size={14} />Edit</button>
            {isArchived ? <button type="button" className="admin-primary-action" onClick={() => { if (window.confirm(`Restore ${category.name} to visible marketplace discovery? Its product records remain unchanged.`)) onUpdate(category, { status: "active", visible: true }); }}><RotateCcw size={14} />Restore</button> : <><button type="button" className={category.visible ? "admin-secondary-action" : "admin-primary-action"} onClick={() => onUpdate(category, { visible: !category.visible })}>{category.visible ? "Hide" : "Show"}</button><button type="button" className="admin-danger-action" onClick={() => { if (window.confirm(`Archive ${category.name}? It will be removed from marketplace navigation. Products are preserved and you can restore the category later.`)) onUpdate(category, { status: "archived", visible: false }); }}><Archive size={14} />Archive</button></>}
          </div>
          {isGames && <div className="admin-games-subcategory-list"><strong>Games subcategories</strong><p>Shared platform subcategories use stored platform metadata. All retains every Games product.</p><div>{GAMES_PLATFORM_SUBCATEGORIES.map((platform) => { const matching = platform.code === "all" ? products : products.filter((product) => product.platformCode === platform.code); return <button key={platform.code} type="button" onClick={() => onEditProduct(matching[0]?.id)} disabled={!matching.length}>{platform.label}<span>{matching.length} products</span></button>; })}</div></div>}
        </article>;
      })}
    </div>
    {quickView && <div className="admin-category-quickview" role="dialog" aria-modal="true" aria-label={`${quickView.name} quick view`}><div className="admin-category-quickview-card"><button type="button" className="admin-category-quickview-close" onClick={() => setQuickViewId(null)} aria-label="Close quick view"><X size={18} /></button><p className="admin-form-kicker">CATEGORY QUICK VIEW</p><h3>{quickView.name}</h3><p>{quickView.description || "No category description has been saved."}</p><div className="admin-category-state"><span className={quickView.status === "archived" ? "admin-status danger" : "admin-status active"}>{quickView.status}</span><span className={quickView.visible && quickView.status === "active" ? "admin-status active" : "admin-status muted"}>{quickView.visible && quickView.status === "active" ? "shown" : "hidden"}</span></div><h4>Mapped products ({productsForCategory(quickView).length})</h4>{productsForCategory(quickView).length ? <div className="admin-category-quickview-products">{productsForCategory(quickView).map((product) => <button type="button" key={product.id} onClick={() => onEditProduct(product.id)}><strong>{product.name}</strong><span>{product.supplierKey || "Admin managed"} · {product.baseCurrency} {product.displayPrice.toFixed(2)} · {label(product.storefrontStatus)}</span></button>)}</div> : <p className="admin-category-empty">No stored VAMNUX product currently maps to this category.</p>}</div></div>}
  </section>;
}
