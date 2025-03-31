export interface ClientInfo {
  name: string;
  version: string;
}

export class RouterClient {
  private proxyUrl: string;
  private serverKey: string;
  private client: ClientInfo;

  constructor(serverKey: string, proxyUrl?: string, client?: ClientInfo) {
    this.serverKey = serverKey;
    this.proxyUrl = proxyUrl || "https://router.mcp.so/v1";
    this.client = client || {
      name: "mcprouter-client",
      version: "0.1.3",
    };
  }

  async listTools() {
    return this.request("/list-tools");
  }

  async callTool(name: string, args: any) {
    return this.request("/call-tool", { name, arguments: args });
  }

  async request(uri: string, body?: any) {
    try {
      const url = `${this.proxyUrl}${uri}`;

      const resp = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.serverKey}`,
          "X-Client-Info": JSON.stringify(this.client),
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
