import { AnimatedAssistantAvatar } from "@/components/shared/AnimatedAssistantAvatar";
import { cn } from "@/lib/cn";
import type { AssistantAvatarAnimationKind } from "@/lib/store-settings/assistant-avatar-presets";

type CatalogChatAvatarSize = "sm" | "md" | "lg";

interface CatalogChatAvatarProps {
  imageUrl: string | null;
  label: string;
  size?: CatalogChatAvatarSize;
  className?: string;
  animation?: AssistantAvatarAnimationKind | null;
  animated?: boolean;
}

export function CatalogChatAvatar({
  imageUrl,
  label,
  size = "md",
  className,
  animation = null,
  animated = false,
}: CatalogChatAvatarProps) {
  return (
    <AnimatedAssistantAvatar
      imageUrl={imageUrl}
      label={label}
      animation={animation}
      animated={animated}
      className={cn("catalog-chat-avatar", `catalog-chat-avatar-${size}`, className)}
      imageClassName="catalog-chat-avatar-image"
    />
  );
}
