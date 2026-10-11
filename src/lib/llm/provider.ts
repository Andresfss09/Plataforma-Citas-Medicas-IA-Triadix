export interface ChatMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  name?: string;
  toolCallId?: string;
  toolCalls?: ToolCall[];
}

export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, any>;
}

export interface LLMResponse {
  content: string;
  toolCalls?: ToolCall[];
  provider: string;
  latencyMs: number;
  tokensUsed?: number;
}

export interface LLMProvider {
  name: string;
  generateResponse(
    messages: ChatMessage[],
    tools?: Array<{ name: string; description: string; parameters: any }>
  ): Promise<LLMResponse>;
}

