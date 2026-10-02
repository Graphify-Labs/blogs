# Graphify Blog

Writing for [graphify.com/blog](https://graphify.com/blog).

This repository is the posts. graphify.com clones it at build time and renders each one inside the live site, so the release bar, header, and footer stay one copy.

A merged pull request rebuilds the site. The post is live when that build finishes.

## Write a post

Read [CONTRIBUTING.md](CONTRIBUTING.md). Agents: [AGENTS.md](AGENTS.md).

```
posts/YYYY-MM-DD-slug.mdx
public/images/<slug>/
authors.json
```

`posts/2026-10-02-a-note.mdx` is published at `/blog/a-note`. The date prefix is the publish date, not part of the URL.

Categories are `guides`, `concepts`, `product`, and `engineering`. A new writer adds their id to `authors.json` in the same pull request.

```bash
npm install
npm run check
```

## License

Posts and their images are [CC BY 4.0](LICENSE). Opening a pull request licenses the work that way. Validation scripts and repository configuration are MIT.
