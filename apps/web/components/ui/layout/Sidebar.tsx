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
          className="finance-fade-in fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
        />
      )}

      {/* SIDEBAR */}
      <aside
        id="menu-lateral"
        className={`fixed inset-y-0 left-0 z-50 flex w-72 max-w-[85vw] flex-col border-r border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] shadow-xl transition-transform duration-300 ease-out lg:sticky lg:top-0 lg:z-auto lg:h-screen lg:w-[264px] lg:max-w-none lg:translate-x-0 lg:shadow-none ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Brilho da marca no topo */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-48 bg-gradient-to-b from-primary/[0.07] to-transparent" />

        {/* LOGO */}
        <div className="relative flex h-[84px] shrink-0 items-center justify-between px-6">
          <Link href="/dashboard" onClick={onClose} aria-label="agenda+ — início" className="flex h-full items-center">
            <BrandLogo size={38} tagline className="text-[var(--foreground)]" />
          </Link>

          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar menu"
            className="rounded-xl p-2 text-[var(--muted)] transition-all duration-200 hover:bg-[var(--surface-secondary)] hover:text-[var(--foreground)] lg:hidden"
          >
            <X size={20} strokeWidth={2} />
          </button>
        </div>

        <div className="mx-6 h-px bg-gradient-to-r from-transparent via-[var(--border)] to-transparent" />

        {/* MENU PRINCIPAL */}
        <div className="finance-scroll relative flex-1 overflow-y-auto px-4 py-5">
          <nav aria-label="Menu principal" className="flex flex-col gap-6">
            {visibleGroups.map((group) => (
              <div key={group.title}>
                <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--muted)] opacity-70">
                  {group.title}
                </p>

                <div className="flex flex-col gap-1">
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={onClose}
                        aria-current={isActive ? "page" : undefined}
                        className={`sidebar-link group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
                          isActive
                            ? "bg-primary text-white shadow-[0_8px_20px_-8px_var(--brand)]"
                            : "text-[var(--muted)] hover:bg-[var(--surface-secondary)] hover:text-[var(--foreground)]"
                        }`}
                      >
                        <span
                          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors duration-200 ${
                            isActive
                              ? "bg-white/15"
                              : "bg-[var(--surface-secondary)] group-hover:bg-primary/10 group-hover:text-primary"
                          }`}
                        >
                          <Icon size={17} strokeWidth={isActive ? 2.2 : 1.9} className="sidebar-icon" />
                        </span>

                        <span className="flex-1">{item.label}</span>

                        {/* O "+" da marca: um ponto menta no item ativo */}
                        {isActive && <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-mint shadow-[0_0_10px_#8fffc7]" />}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>
        </div>

        {/* UTILIZADOR */}
        <div className="relative shrink-0 p-4">
          {loadingUser ? (
            <div className="h-[68px] animate-pulse rounded-2xl bg-[var(--surface-secondary)]" />
          ) : (
            <Link
              href="/configuracoes?tab=perfil"
              onClick={onClose}
              className="brand-sheen group flex items-center gap-3 rounded-2xl bg-gradient-to-br from-primary to-primary-deep p-3 text-white shadow-[0_14px_30px_-16px_var(--brand)] transition duration-300 hover:-translate-y-0.5"
            >
              {profileImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={profileImage} alt="" className="h-10 w-10 shrink-0 rounded-xl object-cover ring-2 ring-white/25" />
              ) : (
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/15 text-sm font-bold ring-1 ring-white/20">
                  {userName.charAt(0).toUpperCase()}
                </span>
              )}

              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold leading-tight">{userName}</span>
                <span className="mt-1 flex items-center gap-1.5 text-[11px] text-white/75">
                  <span className="h-1.5 w-1.5 rounded-full bg-mint" />
                  {roleLabel(user?.role)}
                </span>
              </span>

              <Settings size={16} className="shrink-0 text-white/70 transition duration-500 group-hover:rotate-90" />
            </Link>
          )}
        </div>
      </aside>
    </>
  );
}
