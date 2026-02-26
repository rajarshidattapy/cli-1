# {{PROJECT_NAME}}

A simple email editor project powered by [Unlayer](https://unlayer.com).

## Getting Started

1. Open `editor.html` in your browser
2. Design your email using the drag-and-drop editor
3. Click **Save Design** to download the design JSON
4. Click **Export HTML** to download the rendered HTML

## Project Structure

```
{{PROJECT_NAME}}/
├── index.html          # Landing page
├── editor.html         # Email editor
├── designs/
│   └── sample.json     # Sample email template
├── output/             # Generated files
└── unlayer.config.json # CLI configuration
```

## Using the CLI

You can use the Unlayer CLI to manage your designs:

```bash
# Pull templates from your project
unlayer pull --output-dir ./designs

# Compare local design against remote
unlayer diff ./designs/sample.json
```

## Configuration

Edit `unlayer.config.json` to customize default settings:

```json
{
  "projectId": null,
  "defaults": {
    "outputDir": "./output"
  }
}
```

## Resources

- [Unlayer Documentation](https://docs.unlayer.com)
- [Examples](https://examples.unlayer.com)
- [API Reference](https://docs.unlayer.com/builder/api)
