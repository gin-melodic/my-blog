// @ts-check
import { defineConfig } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';
import rehypeMermaid from "rehype-mermaid";
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex'
import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  site: 'https://antinomy.me',
  markdown: {
    rehypePlugins: [rehypeMermaid, rehypeKatex],
    remarkPlugins: [remarkMath],
  },
  integrations: [sitemap()],
  vite: {
    plugins: [tailwindcss()],
    resolve: {
      alias: {
        'three': 'three'
      }
    }
  }
});