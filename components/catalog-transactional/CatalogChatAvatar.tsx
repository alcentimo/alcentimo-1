import { cn } from "@/lib/cn";

type CatalogChatAvatarSize = "sm" | "md" | "lg";

const SIZE_CLASS: Record<CatalogChatAvatarSize, string> = {
  sm: "catalog-chat-avatar-sm",
  md: "catalog-chat-avatar-md",
  lg: "catalog-chat-avatar-lg",
};

interface CatalogChatAvatarProps {
  imageUrl: string | null;
  label: string;
  size?: CatalogChatAvatarSize;
  className?: string;
}

export function CatalogChatAvatar({
  imageUrl,
  label,
  size = "md",
  className,
}: CatalogChatAvatarProps) {
  const initial = label.trim().charAt(0).toUpperCase() || "?";

  return (
    <span
      className={cn("catalog-chat-avatar", SIZE_CLASS[size], className)}
      aria-hidden="true"
    >
      {imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={imageUrl}
          alt=""
          width={size === "lg" ? 56 : size === "md" ? 40 : 32}
          height={size === "lg" ? 56 : size === "md" ? 40 : 32}
          className="catalog-chat-avatar-image"
        />
      ) : (
        <span className="catalog-chat-avatar-fallback">{initial}</span>
      )}
    </span>
  );
}
