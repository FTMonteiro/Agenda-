"use client";

import { BrandLogo } from "@/components/brand/BrandLogo";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  LayoutDashboard,
  Users,
  CalendarDays,
  UsersRound,
  Settings,
  X,
  ListChecks,
  WalletCards,
  Images,
  type LucideIcon,
} from "lucide-react";

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

interface CurrentUser {
  id: string;
  name: string;
  email: string;
  role: string;
  businessId: string;
  avatar?: string | null;
}

interface MenuItem {
  label: string;
  href: string;
  icon: LucideIcon;
  ownerOnly?: boolean;
}

/*
 * O menu em grupos: o dia a dia primeiro, depois a gestão do negócio e a conta.
 */
const menuGroups: { title: string; items: MenuItem[] }[] = [
  {
    title: "Principal",
    items: [
      { label: "Home", href: "/dashboard", icon: LayoutDashboard },
      { label: "Agenda", href: "/appointments", icon: CalendarDays },
      { label: "Clientes", href: "/clientes", icon: Users },
    ],
  },
  {
    title: "Negócio",
    items: [
      { label: "Serviços", href: "/services", icon: ListChecks },
      { label: "Equipa", href: "/equipe", icon: UsersRound, ownerOnly: true },
      { label: "Finança", href: "/financeiro", icon: WalletCards, ownerOnly: true },
      { label: "Galeria", href: "/galeria", icon: Images, ownerOnly: true },
    ],
  },
  {
    title: "Conta",
    items: [{ label: "Configurações", href: "/configuracoes", icon: Settings }],
  },
];

function roleLabel(role?: string) {
  switch (role?.toUpperCase()) {
    case "OWNER":
      return "Proprietário";
    case "EMPLOYEE":
      return "Profissional";
    default:
      return "Utilizador";
  }
}

export function Sidebar({ open, onClose }: SidebarProps) {
  const pathname = usePathname();

  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);

  /*
   * CARREGAR UTILIZADOR
   */
  useEffect(() => {
    let cancelled = false;

    fetch("/api/auth/me", { credentials: "include", cache: "no-store" })
      .then(async (response) => {
        if (response.status === 401) return null;
        const data = await response.json().catch(() => null);
        if (!response.ok) throw new Error(data?.error || "Não foi possível carregar o utilizador.");
        return (data?.user ?? null) as CurrentUser | null;
      })
      .catch((error) => {
        console.error("Erro ao carregar utilizador no Sidebar:", error);
        return null;
      })
      .then((loaded) => {
        if (cancelled) return;
        setUser(loaded);
        setLoadingUser(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  /*
   * FOTO OU NOME ALTERADOS EM CONFIGURAÇÕES › PERFIL
   */
  useEffect(() => {
    function handleProfileUpdated(event: Event) {
      const { avatar, name } = (event as CustomEvent<{ avatar?: string | null; name?: string }>).detail;
      setUser((current) => (current ? { ...current, avatar: avatar ?? null, name: name ?? current.name } : current));
    }

    window.addEventListener("profile-updated", handleProfileUpdated);
    return () => window.removeEventListener("profile-updated", handleProfileUpdated);
  }, []);

  /*
   * FECHAR MENU COM ESC E BLOQUEAR O SCROLL NO MOBILE
   */
  useEffect(() => {
    if (!open) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onClose]);

  const isOwner = user?.role?.toUpperCase() === "OWNER";

  // Menus só do proprietário ficam escondidos enquanto o utilizador carrega.
  const visibleGroups = menuGroups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => !item.ownerOnly || (!loadingUser && isOwner)),
    }))
    .filter((group) => group.items.length > 0);

  const userName = user?.name?.trim() || "Utilizador";
  const profileImage = user?.avatar || null;

  return (
    <>
      {/* OVERLAY MOBILE */}
      {open && (
        <div
          onClick={onClose}
          aria-hidden="true"
          className="finance-fade-in fixed inset-0 z-40 bg-black/40 lg:hidden"
        />
      )}

      {/* SIDEBAR */}
      <aside
        id="menu-lateral"
        className={`fixed inset-y-0 left-0 z-50 flex w-72 max-w-[85vw] flex-col border-r border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] shadow-xl transition-transform duration-300 ease-out lg:sticky lg:top-0 lg:z-auto lg:h-screen lg:w-[264px] lg:max-w-none lg:translate-x-0 lg:shadow-none ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* LOGO */}
        <div className="relative flex h-[72px] shrink-0 items-center justify-between border-b border-[var(--border)] px-5">
          <Link href="/dashboard" onClick={onClose} aria-label="agenda+ — início" className="flex h-full items-center">
            <BrandLogo size={38} tagline className="text-[var(--foreground)]" />
          </Link>

          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar menu"
            className="rounded-xl p-2 text-[var(--muted)] transition-all duration-200 hover:bg-[var(--surface-secondary)] hover:text-[var(--foreground)] lg:hidden"
          >
            <X size={22} strokeWidth={2} />
          </button>
        </div>

        {/* MENU PRINCIPAL */}
        <div className="finance-scroll relative flex-1 overflow-y-auto px-3 py-4">
          <nav aria-label="Menu principal" className="flex flex-col gap-5">
            {visibleGroups.map((group) => (
              <div key={group.title}>
                <p className="mb-1 px-3 text-xs font-medium text-[var(--subtle)]">
                  {group.title}
                </p>

                <div className="flex flex-col gap-0.5">
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={onClose}
                        aria-current={isActive ? "page" : undefined}
                        className={`group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors duration-150 ${
                          isActive
                            ? "bg-primary/10 font-semibold text-[var(--brand-text)]"
                            : "font-medium text-[var(--muted)] hover:bg-[var(--surface-secondary)] hover:text-[var(--foreground)]"
                        }`}
                      >
                        {/* Marcador do item ativo, encostado à esquerda */}
                        {isActive && (
                          <span aria-hidden="true" className="absolute inset-y-2 left-0 w-[3px] rounded-r-full bg-primary" />
                        )}

                        <Icon size={20} strokeWidth={isActive ? 2 : 1.75} className="shrink-0" />

                        <span className="flex-1">{item.label}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>
        </div>

        {/* UTILIZADOR */}
        <div className="relative shrink-0 border-t border-[var(--border)] p-3">
          {loadingUser ? (
            <div className="h-[60px] animate-pulse rounded-xl bg-[var(--surface-secondary)]" />
          ) : (
            <Link
              href="/configuracoes?tab=perfil"
              onClick={onClose}
              className="group flex items-center gap-3 rounded-xl p-2.5 transition-colors hover:bg-[var(--surface-secondary)]"
            >
              {profileImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={profileImage} alt="" className="h-9 w-9 shrink-0 rounded-full object-cover" />
              ) : (
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-[var(--brand-text)]">
                  {userName.charAt(0).toUpperCase()}
                </span>
              )}

              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold leading-tight text-[var(--foreground)]">{userName}</span>
                <span className="mt-0.5 block truncate text-xs text-[var(--muted)]">{roleLabel(user?.role)}</span>
              </span>

              <Settings size={18} className="shrink-0 text-[var(--subtle)] transition-colors group-hover:text-[var(--foreground)]" />
            </Link>
          )}
        </div>
      </aside>
    </>
  );
}
