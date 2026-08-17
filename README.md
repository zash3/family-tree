# شجرة العائلة — Family Tree

تطبيق ويب لعرض شجرة العائلة بالعربية: مخطط تفاعلي (الذكور مربعات زرقاء، الإناث
دوائر وردية)، وبطاقة تفاصيل لكل شخص عند الضغط عليه، وإمكانية إضافة وتعديل وحذف
الأفراد. البيانات تُحفظ في المتصفح.

An Arabic, right-to-left family-tree SPA. Click any node to open a detail sheet
with the person's lineage, branch, parents, spouses and children; add, edit and
delete people; search and filter by branch; export to JSON/PNG or print.

## Running it

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # production bundle in dist/
npm test           # unit tests (layout, store, search)
npm run typecheck
```

`npm run smoke` drives a real browser through the main flow and writes
screenshots to `smoke-shots/` — run `npm run build && npm run preview -- --port 4319`
first.

## Where the data lives

Everything is stored in your browser under `localStorage["family-tree/v1"]` —
there is no server and nothing leaves the device. **Use “تصدير JSON” to take a
backup before clearing site data or switching browsers**; “استيراد JSON” restores
it. On first run the app seeds a small example tree; “استعادة البيانات الأولية”
returns to it and discards your edits.

## How it is put together

| Path | Role |
|---|---|
| `src/model/types.ts` | `Person` / `TreeDoc`. Parent links are the source of truth. |
| `src/model/select.ts` | Children are **derived** from parent links, never stored. |
| `src/model/validate.ts` | No self-parent, no lineage cycle, gender-consistent parent slots. |
| `src/store/treeStore.ts` | Zustand store persisted to localStorage; keeps spouse links symmetric. |
| `src/tree/layout.ts` | Pure geometry: d3 tidy tree, mirrored for RTL, orthogonal connectors. |
| `src/components/` | `TreeView` (SVG + pan/zoom), `PersonDetail`, `PersonForm`, `Header`, `Modal`. |
| `src/i18n/ar.ts` | Every user-facing string, so a second locale stays possible. |

Stack: React 19 + TypeScript + Vite, Tailwind CSS v4, Zustand, d3-hierarchy /
d3-zoom, Radix Dialog, Vitest.
