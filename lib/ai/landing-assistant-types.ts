export interface LandingAssistantMessage {
  role: "user" | "assistant";
  content: string;
}

export interface LandingAssistantRequest {
  messages: LandingAssistantMessage[];
}

export interface LandingAssistantResponse {
  reply: string;
}
