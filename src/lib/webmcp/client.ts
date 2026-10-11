import { TOOLS_CATALOG } from "../tools/definitions";
import { executeTool, ToolExecutionResponse } from "../tools/executor";

/**
 * Cliente WebMCP con soporte para navigator.modelContext y conmutación transparente a fallback HTTP
 */
export class WebMCPClient {
  private hasNativeSupport: boolean = false;
  private registeredTools: Set<string> = new Set();

  constructor() {
    this.detectCapabilities();
  }

  /**
   * Detecta si el navegador soporta el estándar experimental navigator.modelContext
   */
  public detectCapabilities(): boolean {
    if (typeof window !== "undefined" && typeof navigator !== "undefined") {
      this.hasNativeSupport = "modelContext" in navigator && typeof (navigator as any).modelContext?.registerTool === "function";
    } else {
      this.hasNativeSupport = false;
    }
    return this.hasNativeSupport;
  }

  public isSupported(): boolean {
    return this.hasNativeSupport;
  }

  /**
   * Registra las 10 tools en el navegador si WebMCP está disponible
   */
  public async registerAllTools(): Promise<{ mode: "native_webmcp" | "http_fallback"; registeredCount: number }> {
    if (this.detectCapabilities()) {
      const modelContext = (navigator as any).modelContext;
      for (const tool of TOOLS_CATALOG) {
        try {
          await modelContext.registerTool({
            name: tool.name,
            description: tool.description,
            execute: async (params: any) => {
              return await this.callTool(tool.name, params);
            },
          });
          this.registeredTools.add(tool.name);
        } catch (err) {
          console.warn(`[WebMCP] Error al registrar tool nativa ${tool.name}:`, err);
        }
      }
      return { mode: "native_webmcp", registeredCount: this.registeredTools.size };
    }

    return { mode: "http_fallback", registeredCount: TOOLS_CATALOG.length };
  }

  /**
   * Invoca una herramienta con contrato idéntico tanto en cliente local como vía API HTTP
   */
  public async callTool(toolName: string, params: unknown): Promise<ToolExecutionResponse> {
    // Si estamos en entorno servidor o Node.js, invocar el ejecutor directamente
    if (typeof window === "undefined") {
      return await executeTool(toolName, params);
    }

    // En navegador cliente: llamar al endpoint HTTP /api/tools/execute (fallback universal)
    try {
      const response = await fetch("/api/tools/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tool: toolName, params }),
      });

      const data = await response.json();
      return data as ToolExecutionResponse;
    } catch (error: any) {
      return {
        tool: toolName,
        exito: false,
        error: error.message || "Fallo en la comunicación con el servidor de herramientas",
        auditId: "client-fetch-error",
      };
    }
  }
}

export const webMCP = new WebMCPClient();

