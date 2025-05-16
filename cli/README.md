# Hack Helper CLI

A command-line interface for interacting with the Hack Helper Mastra agents API.

## Features

- Initialize new projects from idea prompts
- Add features to existing projects
- Deploy projects to various platforms
- Check server status

## Installation

```bash
# Install globally
npm install -g hack-helper-cli

# Or run without installing
npx hack-helper-cli
```

## Usage

### Initialize a New Project

```bash
hack-helper init "Create a React app with Tailwind CSS for a blog site"
```

Options:
- `-o, --output <dir>` - Output directory (default: './output')

### Add a Feature

```bash
hack-helper add "Add authentication using Firebase"
```

Options:
- `-p, --path <path>` - Project path (default: current directory)

### Deploy a Project

```bash
hack-helper deploy --platform vercel
```

Options:
- `-p, --path <path>` - Project path (default: current directory)
- `--platform <platform>` - Platform to deploy to (default: 'vercel')

### Check Server Status

```bash
hack-helper status
```

## Configuration

The CLI can be configured using environment variables:

- `API_URL` - URL of the Mastra API server (default: 'http://localhost:4441')
- `API_KEY` - Your API key for authentication

You can create a `.env` file in your project directory with these variables.

## Development

```bash
# Install dependencies
npm install

# Build the CLI
npm run build

# Run in development mode
npm run dev
```

## License

ISC
