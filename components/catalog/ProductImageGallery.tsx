"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, Expand, X } from "lucide-react";
import { CatalogProductImage } from "@/components/catalog/CatalogProductImage";
import { CatalogProductMediaFallback } from "@/components/catalog/CatalogProductMediaFallback";
import { GiftCardCorporateVisual } from "@/components/catalog/GiftCardCorporateVisual";
import { GiftCardProductArt } from "@/components/catalog/GiftCardProductArt";
import {
  resolveCatalogProductImages,
  type CatalogProductGalleryImage,
} from "@/lib/products/product-gallery-types";
import {
  GIFT_CARD_PRODUCT_SLUG,
  isGiftCardCatalogItem,
} from "@/lib/gift-cards/catalog";
import { cn } from "@/lib/cn";

interface ProductImageGalleryProps {
  product: {
    product_name: string;
    product_slug?: string | null;
    category_slug?: string | null;
    metadata?: Record<string, unknown> | null;
    image_alt?: string | null;
    thumb_url?: string | null;
    gallery_images?: unknown;
  };
  images?: CatalogProductGalleryImage[];
  mode?: "card" | "detail";
  className?: string;
  imageClassName?: string;
  fallbackClassName?: string;
  sizes?: string;
  loading?: "lazy" | "eager";
  /** Click en la foto (no en flechas/puntos) para abrir ficha o navegar. */
  onMediaClick?: () => void;
}

const DESKTOP_GALLERY_MQ =
  "(hover: hover) and (pointer: fine) and (min-width: 1024px)";

function galleryDisplayUrl(
  image: CatalogProductGalleryImage,
  mode: "card" | "detail",
): string {
  if (mode === "detail") {
    return image.full_url ?? image.medium_url ?? image.thumb_url;
  }
  return image.thumb_url;
}

function matchesDesktopGallery(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia(DESKTOP_GALLERY_MQ).matches
  );
}

export function ProductImageGallery({
  product,
  images: imagesOverride,
  mode = "card",
  className,
  imageClassName,
  fallbackClassName,
  sizes = "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw",
  loading = "lazy",
  onMediaClick,
}: ProductImageGalleryProps) {
  const images = useMemo(() => {
    if (imagesOverride && imagesOverride.length > 0) {
      return imagesOverride;
    }
    return resolveCatalogProductImages(product);
  }, [imagesOverride, product]);

  const [activeIndex, setActiveIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxMounted, setLightboxMounted] = useState(false);
  const [magnifierOn, setMagnifierOn] = useState(false);
  const [lensStyle, setLensStyle] = useState<{
    width: number;
    height: number;
    left: number;
    top: number;
  } | null>(null);
  const [zoomPaneStyle, setZoomPaneStyle] = useState<CSSProperties | null>(null);
  const [desktopGallery, setDesktopGallery] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const zoomFactor = 2.45;

  const activeImage: CatalogProductGalleryImage | null =
    images[activeIndex] ?? images[0] ?? null;
  const alt = product.image_alt ?? product.product_name;
  const isGiftCard = isGiftCardCatalogItem({
    metadata: product.metadata ?? null,
    product_slug: product.product_slug ?? "",
    category_slug: product.category_slug ?? "",
  });
  const isDetail = mode === "detail";
  const hasMultiple = images.length > 1;
  const showThumbs = isDetail && desktopGallery && images.length > 0;

  const goTo = useCallback(
    (index: number) => {
      if (images.length === 0) return;
      const wrapped =
        ((index % images.length) + images.length) % images.length;
      setActiveIndex(wrapped);
    },
    [images.length],
  );

  const goPrev = useCallback(() => goTo(activeIndex - 1), [activeIndex, goTo]);
  const goNext = useCallback(() => goTo(activeIndex + 1), [activeIndex, goTo]);
  const canEnlarge = isDetail && !onMediaClick && desktopGallery;

  useEffect(() => {
    setActiveIndex(0);
  }, [product.product_name, images.length, images[0]?.id]);

  useEffect(() => {
    const media = window.matchMedia(DESKTOP_GALLERY_MQ);
    const sync = () => {
      const matches = media.matches;
      setDesktopGallery(matches);
      if (!matches) {
        setMagnifierOn(false);
        setZoomPaneStyle(null);
        setLensStyle(null);
        setLightboxOpen(false);
      }
    };
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    setLightboxMounted(true);
  }, []);

  useEffect(() => {
    if (!lightboxOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.stopPropagation();
        setLightboxOpen(false);
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        goPrev();
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        goNext();
      }
    }

    window.addEventListener("keydown", handleKeyDown, true);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown, true);
    };
  }, [lightboxOpen, goPrev, goNext]);

  function canUseHoverZoom() {
    return desktopGallery || matchesDesktopGallery();
  }

  function updateMagnifier(event: React.MouseEvent<HTMLDivElement>) {
    if (!canEnlarge || lightboxOpen) return;
    if (!canUseHoverZoom()) return;
    const rect = stageRef.current?.getBoundingClientRect();
    if (!rect || rect.width < 8 || rect.height < 8) return;
    const xPx = event.clientX - rect.left;
    const yPx = event.clientY - rect.top;
    const lensW = rect.width / zoomFactor;
    const lensH = rect.height / zoomFactor;
    const left = Math.min(Math.max(0, xPx - lensW / 2), rect.width - lensW);
    const top = Math.min(Math.max(0, yPx - lensH / 2), rect.height - lensH);
    setLensStyle({
      width: lensW,
      height: lensH,
      left,
      top,
    });
    if (!activeImage) return;
    const zoomSrc = galleryDisplayUrl(activeImage, "detail");
    setZoomPaneStyle({
      backgroundImage: `url("${zoomSrc}")`,
      backgroundRepeat: "no-repeat",
      backgroundSize: `${rect.width * zoomFactor}px ${rect.height * zoomFactor}px`,
      backgroundPosition: `${-left * zoomFactor}px ${-top * zoomFactor}px`,
    });
  }

  function handleTouchStart(event: React.TouchEvent) {
    touchStartX.current = event.touches[0]?.clientX ?? null;
    setMagnifierOn(false);
    setZoomPaneStyle(null);
    setLensStyle(null);
  }

  function handleTouchEnd(event: React.TouchEvent) {
    if (touchStartX.current == null || !hasMultiple) return;
    const endX = event.changedTouches[0]?.clientX;
    if (endX == null) return;
    const delta = endX - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(delta) < 40) return;
    if (delta > 0) goPrev();
    else goNext();
  }

  if (isGiftCard) {
    return (
      <div
        className={cn(
          "product-image-gallery",
          isDetail && "product-image-gallery-detail",
          !isDetail && "product-image-gallery-card",
          className,
        )}
        onClick={onMediaClick}
        onKeyDown={
          onMediaClick
            ? (event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onMediaClick();
                }
              }
            : undefined
        }
        role={onMediaClick ? "button" : undefined}
        tabIndex={onMediaClick ? 0 : undefined}
      >
        <div className="product-image-gallery-stage">
          <GiftCardCorporateVisual alt={alt} className={imageClassName} />
        </div>
      </div>
    );
  }

  if (!activeImage) {
    if (product.product_slug === GIFT_CARD_PRODUCT_SLUG) {
      return (
        <GiftCardProductArt
          alt={alt}
          className={cn(fallbackClassName, className)}
        />
      );
    }
    return (
      <CatalogProductMediaFallback
        alt={alt}
        className={cn(fallbackClassName, className)}
      />
    );
  }

  return (
    <div
        className={cn(
          "product-image-gallery",
          isDetail && "product-image-gallery-detail",
          isDetail &&
            (desktopGallery
              ? "product-image-gallery-detail--desktop"
              : "product-image-gallery-detail--mobile"),
          !isDetail && "product-image-gallery-card",
          hasMultiple && "product-image-gallery-multi",
          magnifierOn && desktopGallery && "product-image-gallery-zooming",
          className,
        )}
      onTouchStart={hasMultiple ? handleTouchStart : undefined}
      onTouchEnd={hasMultiple ? handleTouchEnd : undefined}
    >
      <div
        ref={stageRef}
        className={cn(
          "product-image-gallery-stage",
          (onMediaClick || canEnlarge) && "cursor-pointer",
          canEnlarge && "product-image-gallery-stage-zoomable",
          magnifierOn && canEnlarge && "product-image-gallery-stage-zooming",
        )}
        onMouseEnter={(event) => {
          if (!canEnlarge) return;
          if (!canUseHoverZoom()) return;
          setMagnifierOn(true);
          updateMagnifier(event);
        }}
        onMouseMove={canEnlarge ? updateMagnifier : undefined}
        onMouseLeave={() => {
          setMagnifierOn(false);
          setLensStyle(null);
          setZoomPaneStyle(null);
        }}
        onClick={
          onMediaClick || canEnlarge
            ? (event) => {
                if ((event.target as HTMLElement).closest("button")) return;
                if (onMediaClick) {
                  onMediaClick();
                  return;
                }
                if (!canUseHoverZoom()) return;
                setMagnifierOn(false);
                setLightboxOpen(true);
              }
            : undefined
        }
      >
        <div className="product-image-gallery-magnifier">
          <CatalogProductImage
            src={galleryDisplayUrl(activeImage, mode)}
            previewSrc={
              isDetail && activeImage.thumb_url
                ? activeImage.thumb_url
                : null
            }
            alt={alt}
            className={imageClassName}
            loading={loading}
            sizes={sizes}
            priority={loading === "eager"}
          />
        </div>
        {magnifierOn && lensStyle ? (
          <div
            className="product-image-gallery-zoom-lens"
            style={{
              width: lensStyle.width,
              height: lensStyle.height,
              transform: `translate(${lensStyle.left}px, ${lensStyle.top}px)`,
            }}
            aria-hidden
          />
        ) : null}

        {canEnlarge ? (
          <button
            type="button"
            className="product-image-gallery-zoom"
            aria-label="Ampliar foto"
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              setLightboxOpen(true);
            }}
          >
            <Expand className="h-4 w-4" />
          </button>
        ) : null}

        {hasMultiple ? (
          <>
            <span className="product-image-gallery-count" aria-hidden="true">
              {activeIndex + 1}/{images.length}
            </span>

            <button
              type="button"
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                goPrev();
              }}
              className="product-image-gallery-nav product-image-gallery-nav-prev"
              aria-label="Foto anterior"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                goNext();
              }}
              className="product-image-gallery-nav product-image-gallery-nav-next"
              aria-label="Foto siguiente"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
            <div
              className="product-image-gallery-dots"
              role="tablist"
              aria-label="Fotos del producto"
            >
              {images.map((image, index) => (
                <button
                  key={image.id}
                  type="button"
                  role="tab"
                  aria-selected={index === activeIndex}
                  aria-label={`Ver foto ${index + 1}`}
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    goTo(index);
                  }}
                  className={cn(
                    "product-image-gallery-dot",
                    index === activeIndex && "product-image-gallery-dot-active",
                  )}
                />
              ))}
            </div>
          </>
        ) : null}
      </div>

      {isDetail && desktopGallery && magnifierOn && zoomPaneStyle ? (
        <div
          className="product-image-gallery-zoom-pane"
          style={zoomPaneStyle}
          aria-hidden
        />
      ) : null}

      {showThumbs ? (
        <div
          className={cn(
            "product-image-gallery-thumbs",
            "product-image-gallery-thumbs-detail",
            !hasMultiple && "product-image-gallery-thumbs-single",
          )}
          role="tablist"
          aria-label="Miniaturas del producto"
          onClick={(event) => event.stopPropagation()}
          onKeyDown={(event) => event.stopPropagation()}
        >
          {images.map((image, index) => {
            const selected = index === activeIndex;
            return (
              <button
                key={image.id}
                type="button"
                role="tab"
                aria-selected={selected}
                aria-label={`Ver foto ${index + 1}`}
                onClick={(event) => {
                  event.stopPropagation();
                  goTo(index);
                }}
                className={cn(
                  "product-image-gallery-thumb",
                  selected && "product-image-gallery-thumb-active",
                  "product-image-gallery-thumb-lg",
                )}
              >
                <CatalogProductImage
                  src={image.thumb_url}
                  alt=""
                  className="product-image-gallery-thumb-image"
                  loading="lazy"
                  sizes="64px"
                />
              </button>
            );
          })}
        </div>
      ) : null}

      {lightboxMounted && lightboxOpen && activeImage
        ? createPortal(
            <div className="product-gallery-lightbox" role="dialog" aria-modal="true">
              <button
                type="button"
                className="product-gallery-lightbox-backdrop"
                aria-label="Cerrar vista ampliada"
                onClick={() => setLightboxOpen(false)}
              />
              <div className="product-gallery-lightbox-frame">
                <button
                  type="button"
                  className="product-gallery-lightbox-close"
                  aria-label="Cerrar"
                  onClick={() => setLightboxOpen(false)}
                >
                  <X className="h-5 w-5" />
                </button>
                <div className="product-gallery-lightbox-stage">
                  <CatalogProductImage
                    src={galleryDisplayUrl(activeImage, "detail")}
                    previewSrc={activeImage.thumb_url}
                    alt={alt}
                    className="product-gallery-lightbox-image"
                    loading="eager"
                    sizes="100vw"
                    priority
                  />
                  {hasMultiple ? (
                    <>
                      <button
                        type="button"
                        className="product-image-gallery-nav product-image-gallery-nav-prev"
                        aria-label="Foto anterior"
                        onClick={goPrev}
                      >
                        <ChevronLeft className="h-6 w-6" />
                      </button>
                      <button
                        type="button"
                        className="product-image-gallery-nav product-image-gallery-nav-next"
                        aria-label="Foto siguiente"
                        onClick={goNext}
                      >
                        <ChevronRight className="h-6 w-6" />
                      </button>
                    </>
                  ) : null}
                </div>
                {hasMultiple ? (
                  <div
                    className="product-gallery-lightbox-thumbs"
                    role="tablist"
                    aria-label="Miniaturas del producto"
                  >
                    {images.map((image, index) => (
                      <button
                        key={image.id}
                        type="button"
                        role="tab"
                        aria-selected={index === activeIndex}
                        aria-label={`Ver foto ${index + 1}`}
                        onClick={() => goTo(index)}
                        className={cn(
                          "product-image-gallery-thumb product-image-gallery-thumb-lg",
                          index === activeIndex &&
                            "product-image-gallery-thumb-active",
                        )}
                      >
                        <CatalogProductImage
                          src={image.thumb_url}
                          alt=""
                          className="product-image-gallery-thumb-image"
                          loading="lazy"
                          sizes="72px"
                        />
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
