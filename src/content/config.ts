// src/content/config.ts
import { defineCollection, z } from 'astro:content';

const blogCollection = defineCollection({
  schema: z.object({
    title: z.string(),
    pubDate: z.union([z.date(), z.string()]).transform((val) => {
      if (typeof val === 'string') {
        const date = new Date(val);
        if (isNaN(date.getTime())) {
          throw new Error(`Invalid date: ${val}`);
        }
        return date;
      }
      return val;
    }),
    description: z.string(),
    tags: z.array(z.string()),
    draft: z.boolean().optional(),
  }),
});                         

export const collections = {
  'blog': blogCollection,
};