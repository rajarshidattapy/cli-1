# {{PROJECT_NAME}}

A Next.js email editor project powered by [Unlayer](https://unlayer.com).

## Getting Started

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) to see the landing page, then click "Open Email Editor" to start designing.

## Project Structure

```
{{PROJECT_NAME}}/
├── app/
│   ├── page.tsx          # Landing page
│   ├── editor/
│   │   └── page.tsx      # Email editor page
│   ├── layout.tsx        # Root layout
│   └── globals.css       # Global styles
├── public/
│   └── designs/
│       └── sample.json   # Sample email template
├── output/               # Generated files (CLI)
└── unlayer.config.json   # CLI configuration
```

## Using the CLI

You can use the Unlayer CLI to manage your designs:

```bash
# Pull templates from your project
unlayer pull --output-dir ./public/designs

# Compare local design against remote
unlayer diff ./public/designs/sample.json
```

## Configuration

1. Get your Project ID from [console.unlayer.com](https://console.unlayer.com)
2. Update `app/editor/page.tsx` with your Project ID

## Resources

- [Unlayer Documentation](https://docs.unlayer.com)
- [React Email Editor](https://github.com/unlayer/react-email-editor)
- [Next.js Documentation](https://nextjs.org/docs)
