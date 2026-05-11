# Consolidation Audit

`C:\Users\admin\Desktop\random projs\memoir` is the canonical Memoir project root.

Use these scripts when checking for scattered Memoir folders:

```bash
npm run consolidate:audit
npm run consolidate:apply
```

`consolidate:audit` scans common user folders for Memoir-like projects, writes a hash manifest under `archive/consolidation-YYYYMMDD-HHMMSS/manifest.json`, and does not move files.

`consolidate:apply` performs the same hash audit and moves detected external candidate folders into the archive folder. It refuses to move anything that overlaps the canonical project root.

The archive folder is intentionally ignored by Git. Review the generated manifest before deleting any original source folder.

Current consolidation result: `C:\Users\admin\Downloads\stitch\memoir` was verified as a byte-for-byte duplicate of the canonical `wireframes/` tree and moved into the ignored archive. A follow-up audit found no remaining external Memoir candidates.
