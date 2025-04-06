import process from "node:process";
import { Readable, Writable } from "node:stream";
import {
  ReadBuffer,
  serializeMessage,
} from "@modelcontextprotocol/sdk/shared/stdio.js";
import { JSONRPCMessage } from "@modelcontextprotocol/sdk/types.js";
import { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";
import { log } from "./utils.js";

/**
 * Server transport for stdio: this communicates with a MCP client by reading from the current process' stdin and writing to stdout.
 *
 * This transport is only available in Node.js environments.
 */
export class StdioServerTransport implements Transport {
  private _readBuffer: ReadBuffer = new ReadBuffer();
  private _started = false;
  private _proxy_url: string = "https://router.mcp.so/mcp";
  private _server_key: string = "";
  private _request_timeout: number = 30000; // 30 seconds default timeout
  private _session_id: string | null = null; // Store session ID received from initialize response

  constructor(
    private _stdin: Readable = process.stdin,
    private _stdout: Writable = process.stdout
  ) {}

  setProxyUrl(proxy_url: string) {
    if (proxy_url.startsWith("http")) {
      this._proxy_url = proxy_url;
    }
  }

  setServerKey(server_key: string) {
    this._server_key = server_key;
  }

  setRequestTimeout(timeout_ms: number) {
    this._request_timeout = timeout_ms;
  }

  onclose?: () => void;
  onerror?: (error: Error) => void;
  onmessage?: (message: JSONRPCMessage) => void;

  // Arrow functions to bind `this` properly, while maintaining function identity.
  _ondata = (chunk: Buffer) => {
    this._readBuffer.append(chunk);
    this.processReadBuffer();
  };
  _onerror = (error: Error) => {
    this.onerror?.(error);
  };

  /**
   * Sends a request to the proxy server with proper timeout and headers
   */
  private async sendToProxy(
    serverUrl: string,
    message: JSONRPCMessage
  ): Promise<any> {
    const controller = new AbortController();
    const timeoutId = setTimeout(
      () => controller.abort(),
      this._request_timeout
    );

    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        "X-Request-ID": crypto.randomUUID(),
        "X-Request-From": "mcp-server-router",
      };

      // Add authorization if server key is present
      if (this._server_key) {
        // headers["Authorization"] = `Bearer ${this._server_key}`;
      }

      // Check if this is an initialize request
      const isInitializeRequest =
        "method" in message && message.method === "initialize";

      // Add session ID to header for non-initialize requests if we have one
      if (!isInitializeRequest && this._session_id) {
        headers["Mcp-Session-Id"] = this._session_id;
      }

      log(
        `sending message to proxy ${serverUrl}: ${JSON.stringify(
          message
        )}, with headers: ${JSON.stringify(headers)}`
      );

      const resp = await fetch(serverUrl, {
        method: "POST",
        headers,
        body: JSON.stringify(message),
        signal: controller.signal,
      });

      if (!resp.ok) {
        throw new Error(`Proxy request failed with status ${resp.status}`);
      }

      // Check for and store session ID from response headers
      const sessionId = resp.headers.get("Mcp-Session-Id");
      if (sessionId) {
        this._session_id = sessionId;
      }

      const data = await resp.json();
      log(
        `received message from proxy: ${JSON.stringify(
          data
        )}, with session ID: ${sessionId}`
      );

      return data;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Starts listening for messages on stdin.
   */
  async start(): Promise<void> {
    if (this._started) {
      throw new Error(
        "StdioServerTransport already started! If using Server class, note that connect() calls start() automatically."
      );
    }

    this._started = true;
    this._stdin.on("data", this._ondata);
    this._stdin.on("error", this._onerror);
  }

  private async processReadBuffer() {
    while (true) {
      try {
        const message = this._readBuffer.readMessage();
        if (message === null) {
          break;
        }

        const serverUrl = `${this._proxy_url}/${this._server_key}`;

        try {
          const data = await this.sendToProxy(serverUrl, message);

          // Forward the proxy response back to the client
          this._stdout.write(serializeMessage(data));

          // Also notify listeners about the original message
          this.onmessage?.(message);
        } catch (error) {
          // Get message ID if it exists
          const messageId = "id" in message ? message.id : null;

          // Create an error response if proxy request fails
          const errorResponse = {
            jsonrpc: "2.0" as const,
            id: messageId,
            error: {
              code: -32603, // Internal error code
              message: `Proxy error: ${(error as Error).message}`,
            },
          };

          log(
            `Proxy error, sending error response: ${JSON.stringify(
              errorResponse
            )}`
          );
          this._stdout.write(serializeMessage(errorResponse as JSONRPCMessage));
          this.onerror?.(error as Error);
        }
      } catch (error) {
        log(`Error in processReadBuffer: ${error}`);
        this.onerror?.(error as Error);
      }
    }
  }

  /**
   * Clears the current session ID
   */
  clearSessionId(): void {
    this._session_id = null;
    log("Session ID cleared");
  }

  async close(): Promise<void> {
    // Remove our event listeners first
    this._stdin.off("data", this._ondata);
    this._stdin.off("error", this._onerror);

    // Check if we were the only data listener
    const remainingDataListeners = this._stdin.listenerCount("data");
    if (remainingDataListeners === 0) {
      // Only pause stdin if we were the only listener
      // This prevents interfering with other parts of the application that might be using stdin
      this._stdin.pause();
    }

    // Clear the session ID
    this._session_id = null;

    // Clear the buffer and notify closure
    this._readBuffer.clear();
    this.onclose?.();
  }

  async send(message: JSONRPCMessage): Promise<void> {
    const serverUrl = `${this._proxy_url}/${this._server_key}`;

    try {
      // For messages sent directly, also forward to the proxy server
      const data = await this.sendToProxy(serverUrl, message);

      // Write the response back to stdout
      return new Promise((resolve, reject) => {
        try {
          const json = serializeMessage(data);
          if (this._stdout.write(json)) {
            resolve();
          } else {
            this._stdout.once("drain", resolve);
          }
        } catch (error) {
          reject(error);
        }
      });
    } catch (error) {
      log(`Error in send: ${error}`);

      // Get message ID if it exists
      const messageId = "id" in message ? message.id : null;

      // Create an error response
      const errorResponse = {
        jsonrpc: "2.0" as const,
        id: messageId,
        error: {
          code: -32603, // Internal error code
          message: `Proxy error: ${(error as Error).message}`,
        },
      };

      // Send the error response
      const json = serializeMessage(errorResponse as JSONRPCMessage);
      this._stdout.write(json);

      this.onerror?.(error as Error);
      throw error;
    }
  }
}
