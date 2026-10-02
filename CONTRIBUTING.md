# Write a post

A merged pull request is what publishes. graphify.com rebuilds from this repository. The release bar, header, and footer stay on the marketing site.

Anyone can open a pull request. A post is not live until a maintainer reviews it and the checks pass.

## 1. The file

Add `posts/YYYY-MM-DD-slug.mdx`. The date in the filename is the publish date, not part of the URL:

| File | URL |
| --- | --- |
| `posts/2026-10-02-a-note.mdx` | https://graphify.com/blog/a-note |

Copy [template/post.mdx](template/post.mdx). The `date` field must match the filename prefix. Do not use `categories`, `authors`, or `feed.xml` as the slug.

```yaml
---
title: A note
description: One sentence a reader can use as the summary.
date: "2026-10-02"
authors:
  - your-id
categories:
  - guides
tags:
  - graph
imgThumb: thumb.png
imgSocial: og.png
---
```

| Field | Required | Notes |
| --- | --- | --- |
| `title` | yes | Sentence case |
| `description` | yes | One sentence. This is the meta description and the index summary |
| `date` | yes | `YYYY-MM-DD`, quoted, same as the filename |
| `authors` | yes | Ids from `authors.json` |
| `categories` | yes | One or more of the four below |
| `tags` | no | Free-form, used for related links later |
| `imgThumb` | no | Listing image. File name only |
| `imgSocial` | no | Share card. File name only |

If you are a new writer, add your id to `authors.json` in the same pull request: `name`, and an optional `role`.

Someone who does not use git can open the file on GitHub, choose **Edit**, and submit the pull request from the web editor.

## 2. Categories

A post can sit in more than one. The URL stays `/blog/<slug>`. Hubs are `/blog/categories/<category>`.

| Id | Use for |
| --- | --- |
| `guides` | How to do a thing with Graphify |
| `concepts` | How the product thinks: graphs, provenance, extraction |
| `product` | What shipped, and why |
| `engineering` | How we built it |

Do not invent a fifth category.

## 3. Images

Put files in `public/images/<slug>/`. In the post, name the file only (`thumb.png`), not a path.

png, jpg, webp, or gif. Each file under 1.5 MB. No SVG in posts: the checker rejects it. A folder under `public/images/` must match a post slug.

## 4. The body

Markdown only. The site compiles the body with JavaScript blocked. The checks fail on:

- an `import` or `export` at the start of a line
- a `<script>` tag
- a React component

Use real commands and real numbers. The package on PyPI is `graphifyy` (two y's). The official site is graphify.com. If a figure is someone else's measurement, name them. Do not invent flags, endpoints, or traction numbers.

## 5. The shape of a post

Start with the point. Then how it works. Then the honest limit: what the open-source on-device engine does, and what Cloud adds. Then proof a reader can check. Then how to install. [template/post.mdx](template/post.mdx) is that outline.

## 6. Local checks

```bash
npm install
npm run check
```

That parses every post and walks the images. GitHub Actions runs the same commands on the pull request.

## 7. Review

GitHub asks [@SyedFahad7](https://github.com/SyedFahad7) to review. An owner of Graphify-Labs still has to turn on branch protection so a post cannot merge without that review and the **Check posts** check.

Keep the pull request to one post, plus that post's images and an `authors.json` row if you are new.

## Maintainers

In the graphify.com project on Vercel: Settings → Git → Deploy Hooks. Create one named `blog`. Store that URL as the Actions secret `VERCEL_DEPLOY_HOOK` on this repository.

`.github/workflows/publish.yml` calls the hook on every push to `main`, and once a day so a post dated in the future can appear.

Protect `main`: require the **Check posts** check, and require a review.

## License

Posts in this repository are [CC BY 4.0](LICENSE). Opening a pull request licenses your post that way.
