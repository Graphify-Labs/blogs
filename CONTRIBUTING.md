# Write a post

A merged pull request is what publishes. graphify.com rebuilds from this repository. The release bar, header, and footer stay on the marketing site.

Anyone can open a pull request. A post is not live until a maintainer reviews it and the checks pass.

## 1. The file

Add `posts/YYYY-MM-DD-slug.mdx`. The date in the filename is the publish date, not part of the URL:

| File | URL |
| --- | --- |
| `posts/2026-10-02-a-note.mdx` | https://graphify.com/blog/a-note |

Copy [template/post.mdx](template/post.mdx). The `date` field must match the filename prefix. Do not use `categories`, `authors`, `tags`, or `feed.xml` as the slug.

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
| `authors` | yes | Ids from `authors.json`. At most three |
| `categories` | yes | One or more of the four below |
| `tags` | no | Lowercase slugs. Each one is a page at `/blog/tags/<tag>` |
| `imgThumb` | no | Listing image. File name only |
| `imgSocial` | no | Share card. File name only |

If you are a new writer, add your id to `authors.json` in the same pull request: `name`, an optional `role`, an optional `github` handle, an optional `x` handle, and an optional `linkedin` slug (the part after `linkedin.com/in/`). The GitHub handle is only used to show your own picture beside your posts. X and LinkedIn are the links on your author page. No image is stored here.

```json
"your-id": { "name": "Your Name", "role": "What you do", "github": "your-handle", "x": "your_handle", "linkedin": "your-slug" }
```

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

## 3. Tags

A tag is a lowercase slug, the same string as its URL:

| Written as | Page |
| --- | --- |
| `cursor` | https://graphify.com/blog/tags/cursor |
| `mcp` | https://graphify.com/blog/tags/mcp |
| `launch-week` | https://graphify.com/blog/tags/launch-week |

The pill on a post links there. A post opened from that page still lives at `/blog/<slug>`. The tag is a way in, not part of the post's address.

Supabase does not keep a permission list for tags. Their www README never says to ask before adding one. Every tag on a merged post becomes `/blog/tags/<tag>` on its own. Across 430 posts that produced 143 tags, including two spellings of the same word (`ai` and `AI`).

Do the same here, with one rule they do not enforce: one lowercase spelling. You may add a new tag in the pull request for the post that uses it. A maintainer still reviews that pull request, so a tag that does not earn its place can come out in review. Do not add a second spelling, a space, or a tag that only repeats a category (`guides`).

## 4. Images

Put files in `public/images/<slug>/`. In the post, name the file only (`thumb.png`), not a path.

png, jpg, webp, or gif. Each file under 1.5 MB. No SVG in posts: the checker rejects it. A folder under `public/images/` must match a post slug.

Two of those files are the post's covers, and they are different pictures:

| Field | Size | Where it shows |
| --- | --- | --- |
| `imgSocial` | 1200 × 630 | The card X, LinkedIn, Slack and iMessage draw. Put the title on this one |
| `imgThumb` | 2400 × 1600 | `/blog` itself: the lead post, the cards, the small runner-up. No title: the page sets it next to the picture |

Both are optional. A post with no `imgThumb` gets the site's own quiet frame instead, so a post is never held up waiting for art.

## 5. The body

Markdown only. The site compiles the body with JavaScript blocked. The checks fail on:

- an `import` or `export` at the start of a line
- a `<script>` tag
- a React component

A picture in the body is `![what it shows](file.png)`, from the same folder as the covers. The file name only, the same way as `imgThumb`.

`##` and `###` become the contents list, and each one is a link (`What's next?` is `#whats-next`).

Use real commands and real numbers. The package on PyPI is `graphifyy` (two y's). The official site is graphify.com. If a figure is someone else's measurement, name them. Do not invent flags, endpoints, or traction numbers.

## 6. The shape of a post

Start with the point. Then how it works. Then the honest limit: what the open-source on-device engine does, and what Cloud adds. Then proof a reader can check. Then how to install. [template/post.mdx](template/post.mdx) is that outline.

## 7. Local checks

```bash
npm install
npm run check
```

That parses every post and walks the images. GitHub Actions runs the same commands on the pull request.

## 8. Review

GitHub asks [@SyedFahad7](https://github.com/SyedFahad7) to review. An owner of Graphify-Labs still has to turn on branch protection so a post cannot merge without that review and the **Check posts** check.

Keep the pull request to one post, plus that post's images and an `authors.json` row if you are new.

## Maintainers

In the graphify.com project on Vercel: Settings → Git → Deploy Hooks. Create one named `blog`. Store that URL as the Actions secret `VERCEL_DEPLOY_HOOK` on this repository.

`.github/workflows/publish.yml` calls the hook on every push to `main`, and once a day so a post dated in the future can appear.

Protect `main`: require the **Check posts** check, and require a review.

## License

Posts in this repository are [CC BY 4.0](LICENSE). Opening a pull request licenses your post that way.
