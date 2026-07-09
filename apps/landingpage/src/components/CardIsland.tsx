import type { ReactNode, ReactElement } from "react";
import { useEffect, useState, isValidElement } from "react";

type Props = {
  children?: ReactNode;
  className?: string;
  content?: ReactNode;
  title?: string;
  description?: string;
};

export function CardIsland({
  children,
  className,
  content,
  title,
  description,
}: Props) {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);

    const handleContentLoad = () => {
      if (!content) {
        setIsLoading(false);
        return;
      }

      const safetyTimeout = setTimeout(() => {
        setIsLoading(false);
      }, 5000);

      if (isValidElement(content)) {
        const element = content as ReactElement<{ src?: string }>;

        if (element.type === "img") {
          const img = new Image();
          img.onload = () => {
            clearTimeout(safetyTimeout);
            setIsLoading(false);
          };
          img.onerror = () => {
            clearTimeout(safetyTimeout);
            setIsLoading(false);
          };
          if (element.props.src) {
            img.src = element.props.src;
          } else {
            clearTimeout(safetyTimeout);
            setIsLoading(false);
          }
          return;
        }

        if (element.type === "video") {
          const video = document.createElement("video");
          video.onloadeddata = () => {
            clearTimeout(safetyTimeout);
            setIsLoading(false);
          };
          video.onerror = () => {
            clearTimeout(safetyTimeout);
            setIsLoading(false);
          };
          if (element.props.src) {
            video.src = element.props.src;
          } else {
            clearTimeout(safetyTimeout);
            setIsLoading(false);
          }
          return;
        }
      }

      clearTimeout(safetyTimeout);
      setIsLoading(false);
    };

    handleContentLoad();
  }, [content]);

  return (
    <div
      className={`rounded-xl border border-outline bg-surface-container overflow-hidden transition-colors duration-150 ease-out hover:border-outline-strong ${className ?? ""}`}
    >
      {content && (
        <div
          className={`w-full flex items-center justify-center p-4 sm:p-8 ${
            isLoading ? "bg-surface-container animate-pulse" : "bg-surface-container-low"
          }`}
        >
          {isLoading ? (
            <div className="h-55" />
          ) : (
            <div
              className={`flex items-center justify-center h-45 sm:h-55 w-full [&>img]:max-h-full [&>img]:w-auto [&>img]:object-contain`}
            >
              {content}
            </div>
          )}
        </div>
      )}

      {title && (
        <div className="w-full flex flex-col gap-1 sm:gap-4 p-4 sm:p-8 border-t border-outline-variant">
          {isLoading ? (
            <>
              <div className="h-7 sm:h-8 bg-surface-container-high animate-pulse rounded w-3/4" />
              {description && (
                <>
                  <div className="h-5 sm:h-6 bg-surface-container animate-pulse rounded w-11/12" />
                  <div className="h-5 sm:h-6 bg-surface-container animate-pulse rounded w-2/4 mt-0.5" />
                </>
              )}
            </>
          ) : (
            <>
              <h3 className="text-on-surface font-medium font-display text-xl sm:text-2xl">
                {title}
              </h3>
              {description && (
                <p className="text-on-surface-variant font-normal text-sm sm:text-base max-w-lg">
                  {description}
                </p>
              )}
            </>
          )}
        </div>
      )}

      {children}
    </div>
  );
}
