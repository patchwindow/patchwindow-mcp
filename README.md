# patch-window-mcp

MCP server that gives AI assistants access to all [Patch Window](https://patchwindow.serverdigital.net) articles via a read-only JSON API.

Articles are fetched once at startup and cached in memory.

## Installation

```bash
npm install -g patch-window-mcp
```

Or run directly with npx:

```bash
npx patch-window-mcp
```

## Claude Desktop configuration

Add the following to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "patch-window": {
      "command": "npx",
      "args": ["patch-window-mcp"]
    }
  }
}
```

If installed globally:

```json
{
  "mcpServers": {
    "patch-window": {
      "command": "patch-window-mcp"
    }
  }
}
```

## Tools

### `pw_list_articles`

List all articles with metadata (no full content).

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `format` | `"deep-dive" \| "hot-take" \| "brief"` | No | — | Filter by article format |
| `tag` | `string` | No | — | Filter by tag, e.g. `"grafana"` |
| `limit` | `number` | No | `20` | Maximum number of articles to return |

---

### `pw_get_article`

Fetch a full article including MDX content.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `slug` | `string` | Yes | Article slug, e.g. `"grafana-13-single-host-operators"` |

---

### `pw_search`

Full-text search across title, excerpt, and content.

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `query` | `string` | Yes | — | Search string |
| `format` | `"deep-dive" \| "hot-take" \| "brief"` | No | — | Limit search to a specific format |
| `limit` | `number` | No | `10` | Maximum number of results |

---

### `pw_latest`

Fetch the most recently published articles.

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `limit` | `number` | No | `5` | Number of articles to return |

---

### `pw_list_tags`

List all unique tags with article counts, sorted descending.

No parameters.

## Development

```bash
npm install
npm run build
node dist/index.js
```

## License

MIT
