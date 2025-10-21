/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      colors: {
        'bauhaus-blue': '#005fec',
        'bauhaus-yellow': '#ffd600',
        'bauhaus-red': '#d50000',
        'bauhaus-bg': '#f0f0f0',
        'bauhaus-dark': '#1a1a1a',
      },
      fontFamily: {
        // 我们使用一个无衬线字体，比如 Inter 或 Poppins
        // 你需要在布局文件中从 Google Fonts 引入它
        sans: ['Inter', 'sans-serif'],
      },
      backdropBlur: {
        'md-strong': 'blur(20px)',
      }
    },
  },
  plugins: [
    // 引入官方的排版插件，美化 Markdown 输出的样式
    require('@tailwindcss/typography'),
  ],
}