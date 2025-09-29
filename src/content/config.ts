// src/content/config.ts
import { defineCollection, z } from 'astro:content';

const blogCollection = defineCollection({
  schema: z.object({
    title: z.string(),
    pubDate: z.string().transform((str) => {
      const date = new Date(str);
      if (isNaN(date.getTime())) {
        throw new Error(`Invalid date: ${str}`);
      }
      return date;
    }),
    description: z.string(),
    tags: z.array(z.string()),
  }),
});

export const collections = {
  'blog': blogCollection,
};
