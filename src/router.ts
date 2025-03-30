export class RouterClient {
  private apiBaseUrl: string;
  private serverKey: string;

  constructor(serverKey: string, apiBaseUrl?: string) {
    this.serverKey = serverKey;
    this.apiBaseUrl = apiBaseUrl || "https://router.mcp.so/v1";
  }

  async listTools() {
    return this.request("/list-tools");
  }

  async callTool(name: string, args: any) {
    return this.request("/call-tool", { name, arguments: args });
  }

  async request(uri: string, body?: any) {
    try {
      const url = `${this.apiBaseUrl}${uri}`;

      const resp = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.serverKey}`,
        },
        body: JSON.stringify(body),
      });

      if (!resp.ok) {
        throw new Error(`request failed: ${resp.statusText}`);
      }

      const { code, message, data } = await resp.json();
      if (code !== 0) {
        throw new Error(`request failed: ${message}`);
      }

      return data;
    } catch (error) {
      throw error;
    }
  }
}
