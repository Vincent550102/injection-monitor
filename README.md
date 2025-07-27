# Injection Monitor

<img width="1024" height="1024" alt="image" src="https://github.com/user-attachments/assets/1919f02f-3689-417d-a98c-0a70e4d53445" />


A web tool that checks whether a command combined with injection payloads is properly balanced in real-time.

## Features

1. **Real-time analysis** – Detect unclosed brackets, quotes, and block comments while you type.
2. **Multi-language syntax highlighting** – Powered by `highlight.js` with automatic language detection or manual selection.
3. **Comment awareness** – Understands `//`, `--`, and `/* … */` comments to avoid false positives.

## Quick Start

```bash
# Install dependencies
npm install

# Start the development server
npm run dev

# Then open http://localhost:3000 in your browser
```

## Usage

1. Enter your original command or code in the **Command** text area.
2. Enter one or more payloads in the **Injection List**.
3. To choose specific injection positions, insert placeholders such as `{{INJECT}}`, `{{INJECT2}}`, … inside the command. If no placeholder is present the first injection is appended to the end.
4. The combined result is shown instantly with syntax highlighting and balance status.

## Project Structure

| Path | Purpose |
| ---- | ------- |
| `app/page.tsx` | Main UI and logic |
| `app/globals.css` | Global styles and `highlight.js` theme |
| `package.json` | Project dependencies (includes `highlight.js`) |

## Deployment

The app is a standard Next.js 15 (App Router) project and can be deployed directly to Vercel or any Node.js hosting service.

## License

MIT
