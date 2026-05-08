#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const API_URL = "https://patchwindow.serverdigital.net/api/articles";

interface Article {
  slug: string;
  title: string;
  format: string;
  excerpt: string;
  publishedAt: string;
  tags: string[];
  pathway: string;
  readingTime: number;
  content: string;
}

interface ApiResponse {
  articles: Article[];
  total: number;
  generatedAt: string;
}

type ArticleMeta = Omit<Article, "content">;

let cache: Article[] | null = null;

async function fetchArticles(): Promise<Article[]> {
  if (cache !== null) return cache;

  const res = await fetch(API_URL);
  if (!res.ok) {
    throw new Error(`Patch Window API svarade med ${res.status} ${res.statusText} — kontrollera att patchwindow.serverdigital.net är tillgängligt.`);
  }

  const data = (await res.json()) as ApiResponse;

  if (!Array.isArray(data.articles)) {
    throw new Error("Patch Window API returnerade ett oväntat format — fältet 'articles' saknas eller är inte en array.");
  }

  cache = data.articles;
  return cache;
}

function stripContent(article: Article): ArticleMeta {
  const { content: _content, ...meta } = article;
  return meta;
}

const server = new McpServer({
  name: "patch-window-mcp",
  version: "0.1.0",
});

server.tool(
  "pw_list_articles",
  "Lista alla Patch Window-artiklar med metadata (utan fulltext). Kan filtreras på format och/eller tag.",
  {
    format: z.enum(["deep-dive", "hot-take", "brief"]).optional().describe("Filtrera på artikelformat"),
    tag: z.string().optional().describe("Filtrera på tag, t.ex. 'grafana' eller 'docker'"),
    limit: z.number().int().positive().default(20).describe("Max antal artiklar att returnera (default 20)"),
  },
  async ({ format, tag, limit }) => {
    const articles = await fetchArticles();

    let filtered = articles;
    if (format) filtered = filtered.filter((a) => a.format === format);
    if (tag) filtered = filtered.filter((a) => a.tags.includes(tag));
    filtered = filtered.slice(0, limit);

    const result = filtered.map(stripContent);
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  }
);

server.tool(
  "pw_get_article",
  "Hämta en fullständig Patch Window-artikel inklusive MDX-innehåll.",
  {
    slug: z.string().describe("Artikelns unika slug, t.ex. 'grafana-13-single-host-operators'"),
  },
  async ({ slug }) => {
    const articles = await fetchArticles();
    const article = articles.find((a) => a.slug === slug);

    if (!article) {
      return {
        content: [{ type: "text", text: `Ingen artikel hittades med slug "${slug}". Använd pw_list_articles för att se tillgängliga slugs.` }],
        isError: true,
      };
    }

    return {
      content: [{ type: "text", text: JSON.stringify(article, null, 2) }],
    };
  }
);

server.tool(
  "pw_search",
  "Sök i Patch Window-artiklar på fritext. Söker i titel, excerpt och fulltext.",
  {
    query: z.string().describe("Söksträng att matcha mot titel, excerpt och innehåll"),
    format: z.enum(["deep-dive", "hot-take", "brief"]).optional().describe("Begränsa sökning till ett specifikt format"),
    limit: z.number().int().positive().default(10).describe("Max antal träffar (default 10)"),
  },
  async ({ query, format, limit }) => {
    const articles = await fetchArticles();
    const q = query.toLowerCase();

    let filtered = articles;
    if (format) filtered = filtered.filter((a) => a.format === format);

    const matches = filtered
      .filter(
        (a) =>
          a.title.toLowerCase().includes(q) ||
          a.excerpt.toLowerCase().includes(q) ||
          a.content.toLowerCase().includes(q)
      )
      .slice(0, limit)
      .map(stripContent);

    return {
      content: [{ type: "text", text: JSON.stringify(matches, null, 2) }],
    };
  }
);

server.tool(
  "pw_latest",
  "Hämta de senaste Patch Window-artiklarna sorterade efter publiceringsdatum.",
  {
    limit: z.number().int().positive().default(5).describe("Antal senaste artiklar (default 5)"),
  },
  async ({ limit }) => {
    const articles = await fetchArticles();

    const sorted = [...articles]
      .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
      .slice(0, limit)
      .map(stripContent);

    return {
      content: [{ type: "text", text: JSON.stringify(sorted, null, 2) }],
    };
  }
);

server.tool(
  "pw_list_tags",
  "Lista alla unika tags i Patch Window med antal artiklar per tag, sorterat fallande.",
  {},
  async () => {
    const articles = await fetchArticles();

    const counts: Record<string, number> = {};
    for (const article of articles) {
      for (const tag of article.tags) {
        counts[tag] = (counts[tag] ?? 0) + 1;
      }
    }

    const sorted = Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([tag, count]) => ({ tag, count }));

    return {
      content: [{ type: "text", text: JSON.stringify(sorted, null, 2) }],
    };
  }
);

async function main() {
  await fetchArticles();
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  process.stderr.write(`patch-window-mcp: startup failed — ${err instanceof Error ? err.message : String(err)}\n`);
  process.exit(1);
});
