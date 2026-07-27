"use client";

import { cn } from "@/lib/cn";
import type { AssistantAvatarAnimationKind } from "@/lib/store-settings/assistant-avatar-presets";

type AnimatedAssistantAvatarSize = "xs" | "sm" | "md" | "lg";

const SIZE_CLASS: Record<AnimatedAssistantAvatarSize, string> = {
  xs: "assistant-avatar-xs",
  sm: "assistant-avatar-sm",
  md: "assistant-avatar-md",
  lg: "assistant-avatar-lg",
};

interface AnimatedAssistantAvatarProps {
  imageUrl: string | null;
  label: string;
  size?: AnimatedAssistantAvatarSize;
  animation?: AssistantAvatarAnimationKind | null;
  animated?: boolean;
  className?: string;
  imageClassName?: string;
}

export function AnimatedAssistantAvatar({
  imageUrl,
  label,
  size = "md",
  animation = null,
  animated = false,
  className,
  imageClassName,
}: AnimatedAssistantAvatarProps) {
  const initial = label.trim().charAt(0).toUpperCase() || "?";
  const animationClass =
    animated && animation ? `assistant-avatar-animate-${animation}` : null;
  const sizeClass = SIZE_CLASS[size];

  return (
    <span
      className={cn(
        "assistant-avatar-shell",
        sizeClass,
        animated && "assistant-avatar-shell-animated",
        animationClass,
        className,
      )}
      aria-hidden="true"
    >
      {imageUrl ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageUrl}
            alt=""
            className={cn("assistant-avatar-image", imageClassName)}
          />
          {animated ? (
            <>
              <span className="assistant-avatar-shine" aria-hidden="true" />
              <span className="assistant-avatar-glow-ring" aria-hidden="true" />
            </>
          ) : null}
        </>
      ) : (
        <span className="assistant-avatar-fallback">{initial}</span>
      )}
    </span>
  );
}
