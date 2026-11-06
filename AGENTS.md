# Agents writing a Graphify post

Read [CONTRIBUTING.md](CONTRIBUTING.md) first. Open a pull request. Do not push to `main`.

- One post per pull request: `posts/YYYY-MM-DD-slug.mdx`, images under `public/images/<slug>/`.
- Copy [template/post.mdx](template/post.mdx).
- Categories are only `guides`, `concepts`, `product`, `engineering`.
- If the writer is not already in `authors.json`, add their own entry in the same pull request and use that id on the post. If they are already listed, reuse the id. Do not remove someone else's entry.
- A portrait is optional. Leave `author_image_url` off and the site uses the GitHub avatar for the `github` handle. To use another picture, set `author_image_url` to `/authors/<file>.png` and put the file in `public/authors/`.
- The body is markdown. No imports, exports, scripts, or React components.
- Do not invent commands, flags, or numbers. The PyPI package is `graphifyy`. The site is graphify.com. If a figure comes from one person, name that person.
- Order: the point, how it works, the honest limit, proof, then how to install.
- Follow section 7 of CONTRIBUTING (Search): set `keyword`, answer it in the first paragraph, link two graphify.com pages, describe every image. Never write a second version of the post for AI.
- Run `npm run check` before you finish. It must report no search errors.
