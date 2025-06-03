#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "./transport.js";
import {
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

/**
 * Parse command line arguments
 * Example: node index.js --server_key=xxx
 */
function parseArgs() {
  const args: Record<string, string> = {};
  process.argv.slice(2).forEach((arg) => {
    if (arg.startsWith("--")) {
      const [key, value] = arg.slice(2).split("=");
      args[key] = value;
    }
  });
  return args;
}

const args = parseArgs();
const server_key = args.server_key || process.env.SERVER_KEY || "";
const proxy_url = args.proxy_url || process.env.PROXY_URL || "";

/**
 * Create an MCP server to proxy requests to the router.
 */
const server = new Server(
  {
    name: "mcprouter",
    version: "0.1.7",
  },
  {
    capabilities: {
      resources: {},
      tools: {},
      prompts: {},
    },
  }
);

server.setRequestHandler(ListResourcesRequestSchema, async () => {
  // todo: get resources from remote server
  return {
    resources: [],
  };
});

server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  // todo: get resource from remote server
  return {
    contents: [],
  };
});

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  return {
    type: "text",
    text: [
      {
        content: "not implemented",
      },
    ],
  };
});

server.setRequestHandler(ListPromptsRequestSchema, async () => {
  // todo: get prompts from remote server
  return {
    prompts: [],
  };
});

server.setRequestHandler(GetPromptRequestSchema, async (request) => {
  // todo: get prompt from remote server
  return {
    messages: [],
  };
});

/**
 * Start the server using stdio transport.
 * This allows the server to communicate via standard input/output streams.
 */
async function main() {
  const transport = new StdioServerTransport();
  transport.setProxyUrl(proxy_url);
  transport.setServerKey(server_key);

  transport.onmessage = (message) => {
    console.log("message", message);
  };

  await server.connect(transport);
}

main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});
