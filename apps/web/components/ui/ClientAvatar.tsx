"use client";

import { useState } from "react";

/*
 * Foto de perfil do cliente (quem tem conta na app), ou as iniciais do nome quando não
 * há foto — ou quando a foto não carrega.
 */

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
}

export function ClientAvatar({
  name,
  src,
  className = "h-10 w-10 text-xs",
}: {
  name: string;
  src?: string | null;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);

  if (src && !failed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt=""
        loading="lazy"
        onError={() => setFailed(true)}
        className={`shrink-0 rounded-full object-cover ${className}`}
      />
    );
  }

  return (
    <span
      aria-hidden="true"
      className={`flex shrink-0 items-center justify-center rounded-full bg-primary/10 font-bold text-[var(--brand-text)] ${className}`}
    >
      {initials(name)}
    </span>
  );
}
