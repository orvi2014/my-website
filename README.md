# The Book of Robat Das Orvi

A personal website built with Astro, featuring a book-like interface with chapters, stories, and interactive elements.

## Features

- 📚 Book-like interface with page-turning animations
- 📖 Multiple content sections (Chapters, Stories, etc.)
- 🔍 Global search functionality
- 📱 Responsive design for all devices
- 🎨 Beautiful typography and animations
- 🔒 SEO optimized

## Tech Stack

- [Astro](https://astro.build/) - Static Site Generator
- [TypeScript](https://www.typescriptlang.org/) - Type Safety
- [Vercel](https://vercel.com) - Hosting & Deployment

## Getting Started

### Prerequisites

- Node.js (v18 or later)
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/personal-website.git
cd personal-website
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

4. Build for production:
```bash
npm run build
```

## Project Structure

```
src/
├── components/     # Reusable components
├── layouts/        # Page layouts
├── pages/         # Route pages
│   ├── api/       # API endpoints
│   ├── chapters/  # Chapter pages
│   └── stories/   # Story pages
└── styles/        # Global styles
```

## Deployment

This project is configured for deployment on Vercel. Simply connect your GitHub repository to Vercel for automatic deployments.

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Contact

Robat Das Orvi - [@yourtwitter](https://twitter.com/yourtwitter)

Project Link: [https://github.com/yourusername/personal-website](https://github.com/yourusername/personal-website)

## The Book of Life

A digital book exploring thoughts, experiences, and discoveries through stories and chapters.

## Contributing Content

### Adding a New Post

1. Create a new markdown file in `src/content/stories/` with the following frontmatter:
```markdown
---
title: "Your Post Title"
description: "A brief description of your post"
category: "category-slug"  # Must match an existing category
pubDate: YYYY-MM-DD       # Use the current date
author: "Your Name"
image: "https://your-image-url.jpg"  # Optional: Add a featured image
readingTime: X            # Estimated reading time in minutes
---

# Your Content Here

## Tags
#tag1 #tag2 #tag3
```

2. Add your content using markdown formatting:
   - Use `#` for headings
   - Use `**bold**` and `*italic*` for emphasis
   - Use `![alt text](image-url)` for images
   - Use `> ` for blockquotes
   - Use `- ` for lists
   - Use `---` for horizontal rules
   - Add tags at the bottom using `#tag`

### Adding a New Chapter

1. Create a new markdown file in `src/content/categories/` with the following frontmatter:
```markdown
---
title: "Chapter Title"
description: "Chapter description"
order: X                  # Order in the table of contents
icon: "emoji"            # Optional: Add an emoji icon
---

Chapter introduction text here.
```

2. The chapter will automatically appear in the table of contents and organize posts under its category.

### Image Guidelines

1. Use high-quality images with appropriate licenses
2. Recommended image dimensions: 1200x630px for featured images
3. Supported formats: JPG, PNG, WebP
4. For external images, use HTTPS URLs
5. For local images, place them in the `public/images/` directory

### Best Practices

1. Keep posts focused and well-structured
2. Use clear headings and subheadings
3. Include a featured image when possible
4. Add relevant tags at the bottom of your post
5. Keep reading time estimates accurate
6. Proofread your content before submitting

## Development

// ... existing development content ...

```sh
npm create astro@latest -- --template minimal
```

[![Open in StackBlitz](https://developer.stackblitz.com/img/open_in_stackblitz.svg)](https://stackblitz.com/github/withastro/astro/tree/latest/examples/minimal)
[![Open with CodeSandbox](https://assets.codesandbox.io/github/button-edit-lime.svg)](https://codesandbox.io/p/sandbox/github/withastro/astro/tree/latest/examples/minimal)
[![Open in GitHub Codespaces](https://github.com/codespaces/badge.svg)](https://codespaces.new/withastro/astro?devcontainer_path=.devcontainer/minimal/devcontainer.json)

> 🧑‍🚀 **Seasoned astronaut?** Delete this file. Have fun!

## 🚀 Project Structure

Inside of your Astro project, you'll see the following folders and files:

```text
/
├── public/
├── src/
│   └── pages/
│       └── index.astro
└── package.json
```

Astro looks for `.astro` or `.md` files in the `src/pages/` directory. Each page is exposed as a route based on its file name.

There's nothing special about `src/components/`, but that's where we like to put any Astro/React/Vue/Svelte/Preact components.

Any static assets, like images, can be placed in the `public/` directory.

## 🧞 Commands

All commands are run from the root of the project, from a terminal:

| Command                   | Action                                           |
| :------------------------ | :----------------------------------------------- |
| `npm install`             | Installs dependencies                            |
| `npm run dev`             | Starts local dev server at `localhost:4321`      |
| `npm run build`           | Build your production site to `./dist/`          |
| `npm run preview`         | Preview your build locally, before deploying     |
| `npm run astro ...`       | Run CLI commands like `astro add`, `astro check` |
| `npm run astro -- --help` | Get help using the Astro CLI                     |

## 👀 Want to learn more?

Feel free to check [our documentation](https://docs.astro.build) or jump into our [Discord server](https://astro.build/chat).

## Adding Images

### Regular Blog Images
For regular blog content, screenshots, or illustrations, use standard markdown image syntax:
```markdown
![Description of the image](path/to/image.jpg)
```

### Photography
For photography where you want to preserve the original composition and add a caption, use the photography figure class:

```markdown
<figure class="photography">
  <img src="path/to/photo.jpg" alt="Description of the photo" />
  <figcaption>Photo by John Doe | Location, 2024</figcaption>
</figure>
```

The photography class provides:
- Natural image display (no forced dimensions)
- Centered images
- Proper spacing
- Styled captions
- Responsive behavior while maintaining original proportions

### Image Guidelines
1. **File Format**: Use `.jpg` for photographs, `.png` for screenshots or images with transparency
2. **Size**: 
   - Maximum width: 2000px
   - Recommended size: 1200-1600px wide
   - Keep file size under 500KB when possible
3. **Aspect Ratios**:
   - Photography: Natural dimensions preserved
   - Regular blog images: 16:9 (recommended)
4. **Alt Text**: Always include descriptive alt text for accessibility
5. **Captions**: Use captions for photography to provide context and attribution

### Example Post with Images
```markdown
---
title: "My Photography Journey"
description: "Exploring the art of photography"
category: "photography"
pubDate: 2024-03-20
author: "Your Name"
image: "/images/featured-photo.jpg"
readingTime: 5
tags: ["photography", "travel"]
---

# My Photography Journey

Regular blog image:
![City skyline at sunset](/images/city-sunset.jpg)

Photography with caption:
<figure class="photography">
  <img src="/images/mountain-lake.jpg" alt="Serene mountain lake at dawn" />
  <figcaption>Photo by John Doe | Lake Tahoe, California, 2024</figcaption>
</figure>

More content...
```
