"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type RowSelectionState,
  type SortingState,
} from "@tanstack/react-table";
import { Button, FormBanner, Input, Select } from "@/components/ui/field";
import { bulkProductAction } from "./actions";

export type ProductRow = {
  id: string;
  name: string;
  slug: string;
  categoryId: string;
  categoryName: string;
  price: string | null;
  priceDisplay: "exact" | "from" | "contact" | "hidden";
  isPublished: boolean;
  publishedAt: string | null;
  imageCount: number;
};

const STATE_LABEL: Record<string, string> = {
  draft: "ฉบับร่าง",
  scheduled: "ตั้งเวลา",
  published: "เผยแพร่",
};

function stateOf(row: ProductRow): keyof typeof STATE_LABEL {
  if (!row.isPublished) return "draft";
  if (row.publishedAt && new Date(row.publishedAt).getTime() > Date.now()) return "scheduled";
  return "published";
}

export function ProductTable({
  rows,
  categories,
}: {
  rows: ProductRow[];
  categories: { id: string; name: string }[];
}) {
  const [selection, setSelection] = useState<RowSelectionState>({});
  const [sorting, setSorting] = useState<SortingState>([]);
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [moveTarget, setMoveTarget] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const columns = useMemo<ColumnDef<ProductRow>[]>(
    () => [
      {
        id: "select",
        header: ({ table }) => (
          <input
            type="checkbox"
            aria-label="เลือกทั้งหมด"
            className="size-4 accent-(--color-brand)"
            checked={table.getIsAllRowsSelected()}
            ref={(el) => {
              if (el)
                el.indeterminate = table.getIsSomeRowsSelected() && !table.getIsAllRowsSelected();
            }}
            onChange={table.getToggleAllRowsSelectedHandler()}
          />
        ),
        cell: ({ row }) => (
          <input
            type="checkbox"
            aria-label={`เลือก ${row.original.name}`}
            className="size-4 accent-(--color-brand)"
            checked={row.getIsSelected()}
            onChange={row.getToggleSelectedHandler()}
          />
        ),
        enableSorting: false,
      },
      {
        accessorKey: "name",
        header: "ชื่อสินค้า",
        cell: ({ row }) => (
          <Link
            href={`/admin/products/${row.original.id}`}
            className="text-(--color-heading) hover:underline"
          >
            {row.original.name}
          </Link>
        ),
      },
      { accessorKey: "categoryName", header: "หมวดหมู่" },
      {
        accessorKey: "price",
        header: "ราคา",
        cell: ({ row }) =>
          row.original.priceDisplay === "contact"
            ? "สอบถามราคา"
            : row.original.price
              ? `${Number(row.original.price).toLocaleString("th-TH")} บาท`
              : "—",
      },
      {
        id: "state",
        header: "สถานะ",
        accessorFn: (r) => stateOf(r),
        cell: ({ row }) => STATE_LABEL[stateOf(row.original)],
      },
      {
        accessorKey: "imageCount",
        header: "รูป",
        cell: ({ row }) =>
          row.original.imageCount === 0 ? (
            <span className="text-(--color-brand)">ยังไม่มีรูป</span>
          ) : (
            row.original.imageCount
          ),
      },
    ],
    [],
  );

  const filtered = useMemo(
    () => (categoryFilter ? rows.filter((r) => r.categoryId === categoryFilter) : rows),
    [rows, categoryFilter],
  );

  const table = useReactTable({
    data: filtered,
    columns,
    state: { rowSelection: selection, sorting, globalFilter: query },
    onRowSelectionChange: setSelection,
    onSortingChange: setSorting,
    onGlobalFilterChange: setQuery,
    getRowId: (r) => r.id,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const selectedIds = Object.keys(selection).filter((id) => selection[id]);

  function runBulk(action: "publish" | "unpublish" | "move" | "delete") {
    setStatus(null);
    startTransition(async () => {
      const result = await bulkProductAction(selectedIds, action, moveTarget || undefined);
      setStatus(result.message ?? null);
      if (!result.message?.startsWith("กรุณา")) setSelection({});
    });
  }

  return (
    <div className="space-y-4">
      {status ? <FormBanner kind="success">{status}</FormBanner> : null}

      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-48 flex-1">
          <Input
            id="q"
            placeholder="ค้นหาชื่อสินค้า"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="mt-0"
          />
        </div>
        <Select
          id="categoryFilter"
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="mt-0 max-w-56"
        >
          <option value="">ทุกหมวดหมู่</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
        <p className="text-sm text-(--color-text-muted)">
          แสดง {table.getRowModel().rows.length} รายการ
        </p>
      </div>

      {selectedIds.length > 0 ? (
        <div className="flex flex-wrap items-center gap-3 rounded-(--radius-card) border border-(--color-border) bg-(--color-surface) p-3">
          <span className="text-sm text-(--color-heading)">
            เลือกแล้ว {selectedIds.length} รายการ
          </span>
          <Button
            type="button"
            variant="secondary"
            onClick={() => runBulk("publish")}
            disabled={pending}
          >
            เผยแพร่
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => runBulk("unpublish")}
            disabled={pending}
          >
            ยกเลิกเผยแพร่
          </Button>
          <Select
            id="moveTarget"
            value={moveTarget}
            onChange={(e) => setMoveTarget(e.target.value)}
            className="mt-0 max-w-48"
          >
            <option value="">ย้ายไปหมวดหมู่…</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
          <Button
            type="button"
            variant="secondary"
            onClick={() => runBulk("move")}
            disabled={pending || !moveTarget}
          >
            ย้าย
          </Button>
          <Button
            type="button"
            variant="danger"
            onClick={() => runBulk("delete")}
            disabled={pending}
          >
            ลบ
          </Button>
        </div>
      ) : null}

      <div className="overflow-x-auto rounded-(--radius-card) border border-(--color-border) bg-(--color-bg)">
        <table className="w-full min-w-[44rem] text-start text-sm">
          <thead className="border-b border-(--color-border) text-(--color-text-muted)">
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id}>
                {hg.headers.map((h) => (
                  <th key={h.id} scope="col" className="px-4 py-3 text-start font-medium">
                    {h.isPlaceholder ? null : h.column.getCanSort() ? (
                      <button
                        type="button"
                        onClick={h.column.getToggleSortingHandler()}
                        className="hover:text-(--color-brand)"
                      >
                        {flexRender(h.column.columnDef.header, h.getContext())}
                        {{ asc: " ↑", desc: " ↓" }[h.column.getIsSorted() as string] ?? ""}
                      </button>
                    ) : (
                      flexRender(h.column.columnDef.header, h.getContext())
                    )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-8 text-center text-(--color-text)">
                  ไม่พบสินค้าที่ตรงกับเงื่อนไข
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row) => (
                <tr key={row.id} className="border-b border-(--color-border) last:border-0">
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-4 py-3">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
