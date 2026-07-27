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
  const isPresetAvatar = Boolean(imageUrl?.includes("/assistant-avatars/"));
  const useCharacterVariant = animated || isPresetAvatar;

  return (
    <AnimatedAssistantAvatar
      imageUrl={imageUrl}
      label={label}
      variant={useCharacterVariant ? "character" : "round"}
      animation={animation}
      animated={animated || isPresetAvatar}
      className={cn("catalog-chat-avatar", `catalog-chat-avatar-${size}`, className)}
      imageClassName={
        useCharacterVariant
          ? "assistant-avatar-character-image"
          : "catalog-chat-avatar-image"
      }
    />
  );
}
