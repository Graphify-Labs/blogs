## Post

- Title:
- Slug (`/blog/<slug>`):
- Date:
- Categories:

## Checklist

- [ ] File is `posts/YYYY-MM-DD-slug.mdx`
- [ ] `date` matches the filename prefix
- [ ] Every author id is in `authors.json` (add a new writer in this pull request)
- [ ] Images, if any, are in `public/images/<slug>/` and under 1.5 MB
- [ ] Body is markdown: no `import`, `export`, `<script>`, or React components
- [ ] Commands, flags, and numbers are real
- [ ] `keyword` is a phrase people search for, and the title and first paragraph use it
- [ ] The post links at least two graphify.com pages, and every image has a description
- [ ] `npm run check` passes with no search errors

## Before merge

- [ ] I opened the Vercel preview and read the post there, not just the diff
- [ ] One cover: `imgThumb` is not repeated as an image in the body
- [ ] CTAs are plain links in a sentence, no bold emoji "buttons"
- [ ] Sign-off is exactly as agreed (for example "Syed Fahad and the Graphify team")
- [ ] Commands are right per tool: `pip install graphifyy`, `/graphify` in Claude Code, `$graphify` in Codex
- [ ] The keyword is in the title
- [ ] Any canonical URL is `https://graphify.com/blog/<slug>`
- [ ] Encoding is clean: no `â`, `Ã`, `�` or byte-order mark (`npm run check` catches these)
- [ ] This pull request is still open (if it was merged, branch from the latest `main` instead)
