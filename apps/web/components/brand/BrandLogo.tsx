import Image from "next/image";

// Importado (e não "/agenda-icon.png") para o endereço mudar com o ficheiro: assim, ao trocar
// o ícone, nem o Next nem o browser continuam a servir a versão antiga em cache.
import agendaIcon from "../../public/agenda-icon.png";

/*
 * A marca agenda+ no painel: o ícone da app e o nome escrito, como no logótipo.
 * É texto e não uma imagem do nome, por isso acompanha o tema claro/escuro do sítio
 * onde é usado (a cor do nome vem de `className`; o "+" é o azul da marca, ou
 * `plusClassName` sobre fundos escuros). Com `descriptor` é o logótipo completo: o traço
 * vertical e "Sistema Agenda+ · Produtividade inteligente" à direita (some em ecrãs estreitos).
 */
export function BrandIcon({ size = 36, className = "" }: { size?: number; className?: string }) {
  return (
    <Image
      src={agendaIcon}
      alt=""
      width={size}
      height={size}
      priority
      className={`shrink-0 ${className}`}
      style={{ width: size, height: size, borderRadius: size * 0.225 }}
    />
  );
}

export function BrandLogo({
  size = 36,
  className = "",
  tagline = false,
  descriptor = false,
  iconClassName = "",
  plusClassName = "text-blue-600 dark:text-blue-400",
}: {
  size?: number;
  className?: string;
  tagline?: boolean;
  descriptor?: boolean;
  iconClassName?: string;
  plusClassName?: string;
}) {
  return (
    <span className={`inline-flex items-center gap-3 ${className}`} aria-label="Agenda+">
      <BrandIcon size={size} className={iconClassName} />
      <span className="flex flex-col leading-none">
        <span className="font-bold tracking-[-0.03em]" style={{ fontSize: size * 0.62 }}>
          Agenda<span className={`ml-[0.16em] ${plusClassName}`}>+</span>
        </span>
        {tagline ? (
          <span className="mt-1.5 text-[10px] font-medium tracking-[0.01em] opacity-60">
            organize hoje. avance amanhã.
          </span>
        ) : null}
      </span>
      {descriptor ? (
        <span
          className="ml-3 hidden flex-col justify-center gap-1.5 border-l border-current/15 pl-5 uppercase leading-none sm:flex"
          style={{ minHeight: size }}
        >
          <span className="text-[9px] font-semibold tracking-[0.16em]">Sistema Agenda+</span>
          <span className="text-[8px] font-medium tracking-[0.16em] opacity-60">Produtividade inteligente</span>
        </span>
      ) : null}
    </span>
  );
}
