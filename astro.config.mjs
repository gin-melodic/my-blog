// @ts-check
import { defineConfig } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';
import rehypeMermaid from "rehype-mermaid";
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex'

// https://astro.build/config
export default defineConfig({
  markdown: {
    rehypePlugins: [rehypeMermaid, rehypeKatex],
    remarkPlugins: [remarkMath],
  },
  vite: {
    plugins: [tailwindcss()],
    resolve: {
      alias: {
        'three': 'three'
      }
    }
  }
});