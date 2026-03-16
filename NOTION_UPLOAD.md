# Notion PRD Upload (API)

## 1) Prepare env vars

```bash
export NOTION_TOKEN="secret_xxx"
export NOTION_PAGE_ID="310b65c6355480aa9dc6d9e5acfdd84b"
```

- `NOTION_TOKEN`: Internal Integration Token
- `NOTION_PAGE_ID`: target page id from URL (with or without dashes)

## 2) Upload PRD

```bash
npm run notion:upload-prd
```

Optional title:

```bash
npm run notion:upload-prd -- "nemoflow PRD"
```

## 3) Troubleshooting

- `unauthorized`:
  - token is invalid or expired
- `object_not_found`:
  - integration is not connected to the page (`...` → Add connections)
- `restricted_resource`:
  - permission is not `Can edit`
