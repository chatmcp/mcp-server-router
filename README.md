[![MseeP.ai Security Assessment Badge](https://mseep.net/pr/chatmcp-mcp-server-router-badge.png)](https://mseep.ai/app/chatmcp-mcp-server-router)

# mcprouter MCP Server

proxy for remote mcp servers.

## Quick Start

1. Get Remote MCP Server Key

go to [MCP.so](https://mcp.so), select a hosting server,

click `Connect` to generate your exclusive server_key.

2. Configure MCP Server in any MCP Client

take `Claude Desktop` for example:

```json
{
  "mcpServers": {
    "fetch": {
      "command": "npx",
      "args": ["-y", "mcprouter"],
      "env": {
        "SERVER_KEY": "xxx"
      }
    }
  }
}
```

## Development

Install dependencies:

```bash
npm install
```

Build the server:

```bash
npm run build
```

For development with auto-rebuild:

```bash
npm run watch
```

## Installation

To use with Claude Desktop, add the server config:

On MacOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
On Windows: `%APPDATA%/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "mcprouter": {
      "command": "/path/to/mcprouter/build/index.js"
    }
  }
}
```

### Debugging

Since MCP servers communicate over stdio, debugging can be challenging. We recommend using the [MCP Inspector](https://github.com/modelcontextprotocol/inspector), which is available as a package script:

```bash
npm run inspector
```

The Inspector will provide a URL to access debugging tools in your browser.
