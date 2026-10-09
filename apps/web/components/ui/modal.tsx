import { ReactNode } from "react";
import { X } from "lucide-react";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  title?: string;
}

export function Modal({
  open,
  onClose,
  children,
  title,
}: ModalProps) {
  if (!open) {
    return null;
  }

  return (
    <div
      className="
        fixed
        inset-0
        z-[9999]
        flex
        items-center
        justify-center
        bg-black/50
        p-4
        backdrop-blur-sm
        dark:bg-black/80
      "
      onClick={onClose}
    >
      {/* MODAL */}
      <div
        className="
          flex
          w-full
          max-w-md
          max-h-[90vh]
          flex-col
          overflow-hidden
          rounded-2xl
          border
          border-gray-200
          bg-white
          text-gray-900
          shadow-2xl

          dark:border-gray-800
          dark:bg-black
          dark:text-white
        "
        onClick={(event) => {
          event.stopPropagation();
        }}
      >
        {/* HEADER */}
        <div
          className="
            flex
            shrink-0
            items-center
            justify-between
            border-b
            border-gray-200
            bg-white
            px-6
            py-5

            dark:border-gray-800
            dark:bg-black
          "
        >
          {title ? (
            <h2
              className="
                text-xl
                font-semibold
                text-gray-950

                dark:text-white
              "
            >
              {title}
            </h2>
          ) : (
            <div />
          )}

          <button
            type="button"
            onClick={onClose}
            className="
              flex
              h-9
              w-9
              shrink-0
              items-center
              justify-center
              rounded-lg
              text-gray-400
              transition-all
              duration-200

              hover:bg-gray-100
              hover:text-gray-700

              dark:hover:bg-gray-900
              dark:hover:text-white
            "
            aria-label="Fechar modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* CONTEÚDO */}
        <div
          className="
            min-h-0
            flex-1
            overflow-y-auto
            overscroll-contain
            px-6
            py-5

            scrollbar-thin
            scrollbar-thumb-gray-300
            scrollbar-track-transparent

            dark:scrollbar-thumb-gray-700
          "
        >
          {children}
        </div>
      </div>
    </div>
  );
}