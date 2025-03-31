#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { RouterClient } from "./router.js";

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
    version: "0.1.3",
  },
  {
    capabilities: {
      resources: {},
      tools: {},
      prompts: {},
    },
  }
);

async function getRouterClient(server: Server): Promise<RouterClient> {
  const client = await server.getClientVersion();

  return new RouterClient(server_key, proxy_url, client);
}

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
  const routerClient = await getRouterClient(server);

  const tools = await routerClient.listTools();

  return tools;
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const routerClient = await getRouterClient(server);

  const name = request.params.name;
  const args = request.params.arguments;

  const result = await routerClient.callTool(name, args);

  return result;
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

  transport.onmessage = (message) => {
    console.log("message", message);
  };

  await server.connect(transport);
}

main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});
