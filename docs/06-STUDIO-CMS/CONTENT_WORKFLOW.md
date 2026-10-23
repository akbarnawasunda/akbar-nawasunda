# CONTENT_WORKFLOW

1. Create draft → autosave localStorage 30s → upload cover → save draft → preview token → check public preview → Publish → ISR revalidate → live
2. Edit published → becomes dirty → save → preview → Publish again updates publishedAt
3. Unpublish → status draft → public API no longer returns it
4. Delete → confirm dialog, soft delete? For v1 hard delete with backup

- Unsaved guard on navigation
- Refresh: restore from localStorage if exists
- Connectivity loss: keep draft local, show warning
