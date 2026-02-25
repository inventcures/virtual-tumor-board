import Anthropic from "@anthropic-ai/sdk";
import { GoogleGenerativeAI } from "@google/generative-ai";

export type LLMProviderType = "anthropic" | "google";

export interface LLMUsage {
  input: number;
  output: number;
  cacheRead?: number;
  cacheWrite?: number;
}

export interface LLMResponse {
  content: string;
  usage: LLMUsage;
  stopReason?: string;
  toolCalls?: any[];
}

export interface LLMRequest {
  model: string;
  system: any; // Allow complex types for caching
  messages: any[];
  maxTokens: number;
  tools?: any[];
  usePromptCaching?: boolean;
}

export abstract class LLMProvider {
  abstract generate(request: LLMRequest): Promise<LLMResponse>;
}

export class AnthropicProvider extends LLMProvider {
  private client: Anthropic;

  constructor(apiKey: string) {
    super();
    this.client = new Anthropic({ apiKey });
  }

  async generate(request: LLMRequest): Promise<LLMResponse> {
    // Enable prompt caching for Anthropic if requested
    const messages = request.usePromptCaching 
      ? request.messages.map((m, i) => {
          // Cache the last message or large contexts
          if (i === request.messages.length - 1 || (typeof m.content === 'string' && m.content.length > 2000)) {
            return {
              ...m,
              content: [
                { type: "text", text: m.content, cache_control: { type: "ephemeral" } }
              ]
            };
          }
          return m;
        })
      : request.messages;

    const system = request.usePromptCaching && typeof request.system === 'string'
      ? [{ type: "text", text: request.system, cache_control: { type: "ephemeral" } }]
      : request.system;

    const response = await this.client.messages.create({
      model: request.model,
      max_tokens: request.maxTokens,
      system: system,
      tools: request.tools,
      messages: messages,
    });

    return {
      content: response.content
        .filter((block): block is Anthropic.Messages.TextBlock => block.type === "text")
        .map((block) => block.text)
        .join("\n"),
      usage: {
        input: response.usage.input_tokens,
        output: response.usage.output_tokens,
        cacheRead: (response.usage as any).cache_read_input_tokens,
        cacheWrite: (response.usage as any).cache_creation_input_tokens,
      },
      stopReason: response.stop_reason || undefined,
      toolCalls: response.content.filter(block => block.type === "tool_use"),
    };
  }
}

export class GoogleProvider extends LLMProvider {
  private genAI: GoogleGenerativeAI;

  constructor(apiKey: string) {
    super();
    this.genAI = new GoogleGenerativeAI(apiKey);
  }

  async generate(request: LLMRequest): Promise<LLMResponse> {
    const model = this.genAI.getGenerativeModel({ 
      model: request.model,
      systemInstruction: typeof request.system === 'string' ? request.system : JSON.stringify(request.system),
    });

    // Simple conversion of messages to Google format
    // This is a simplified version for now
    const chat = model.startChat({
      history: request.messages.slice(0, -1).map(m => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: typeof m.content === 'string' ? m.content : JSON.stringify(m.content) }],
      })),
    });

    const lastMessage = request.messages[request.messages.length - 1];
    const result = await chat.sendMessage(typeof lastMessage.content === 'string' ? lastMessage.content : JSON.stringify(lastMessage.content));
    const response = await result.response;

    return {
      content: response.text(),
      usage: {
        // Google SDK usage metadata might vary
        input: response.usageMetadata?.promptTokenCount || 0,
        output: response.usageMetadata?.candidatesTokenCount || 0,
      },
      stopReason: "end_turn", // Simplified
    };
  }
}

export class ProviderFactory {
  static create(type: LLMProviderType, apiKey: string): LLMProvider {
    switch (type) {
      case "anthropic":
        return new AnthropicProvider(apiKey);
      case "google":
        return new GoogleProvider(apiKey);
      default:
        throw new Error(`Unsupported provider: ${type}`);
    }
  }
}
