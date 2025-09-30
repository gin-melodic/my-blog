// @ts-check
import { defineConfig } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';
import rehypeMermaid from "rehype-mermaid";
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex'
import sitemap from '@astrojs/sitemap';
import mdx from '@astrojs/mdx';

// https://astro.build/config
export default defineConfig({
  site: 'https://antinomy.me',
  markdown: {
    rehypePlugins: [rehypeMermaid, rehypeKatex],
    remarkPlugins: [remarkMath],
  },
  integrations: [sitemap(), mdx()],
  vite: {
    plugins: [tailwindcss()],
    resolve: {
      alias: {
        'three': 'three'
      }
    }
  }
});