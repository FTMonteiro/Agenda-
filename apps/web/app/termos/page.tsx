import { BrandLogo } from "@/components/brand/BrandLogo";
import Link from "next/link";
import { ArrowLeft, FileText, Mail } from "lucide-react";

export default function TermosPage() {
  return (
    <main className="min-h-screen bg-[#fafafa] text-gray-900">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 sm:px-6">
          <Link href="/login" className="flex items-center gap-2.5">
            <BrandLogo size={34} />

            <div className="leading-none">
              <p className="mt-1 text-xs font-medium text-gray-400">
                by NEVREX
              </p>
            </div>
          </Link>

          <Link
            href="/login"
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-600 transition hover:border-gray-300 hover:bg-gray-50 hover:text-gray-950"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar ao Agenda+
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-5 py-12 sm:px-6 lg:py-16">
        <div className="grid gap-10 lg:grid-cols-[220px_1fr]">
          <aside className="hidden lg:block">
            <div className="sticky top-8">
              <p className="mb-3 text-xs font-medium text-gray-400">
                Neste documento
              </p>

              <nav className="space-y-1 text-xs text-gray-500">
                <a
                  href="#aceitacao"
                  className="block rounded-md px-2 py-1.5 hover:bg-gray-100 hover:text-gray-900"
                >
                  Aceitação dos termos
                </a>

                <a
                  href="#slotix"
                  className="block rounded-md px-2 py-1.5 hover:bg-gray-100 hover:text-gray-900"
                >
                  Sobre o Agenda+
                </a>

                <a
                  href="#conta"
                  className="block rounded-md px-2 py-1.5 hover:bg-gray-100 hover:text-gray-900"
                >
                  Conta e acesso
                </a>

                <a
                  href="#utilizacao"
                  className="block rounded-md px-2 py-1.5 hover:bg-gray-100 hover:text-gray-900"
                >
                  Utilização
                </a>

                <a
                  href="#dados"
                  className="block rounded-md px-2 py-1.5 hover:bg-gray-100 hover:text-gray-900"
                >
                  Dados
                </a>

                <a
                  href="#pagamentos"
                  className="block rounded-md px-2 py-1.5 hover:bg-gray-100 hover:text-gray-900"
                >
                  Pagamentos
                </a>

                <a
                  href="#propriedade"
                  className="block rounded-md px-2 py-1.5 hover:bg-gray-100 hover:text-gray-900"
                >
                  Propriedade intelectual
                </a>

                <a
                  href="#seguranca"
                  className="block rounded-md px-2 py-1.5 hover:bg-gray-100 hover:text-gray-900"
                >
                  Segurança
                </a>

                <a
                  href="#encerramento"
                  className="block rounded-md px-2 py-1.5 hover:bg-gray-100 hover:text-gray-900"
                >
                  Encerramento
                </a>

                <a
                  href="#contacto"
                  className="block rounded-md px-2 py-1.5 hover:bg-gray-100 hover:text-gray-900"
                >
                  Contacto
                </a>
              </nav>
            </div>
          </aside>

          <article className="min-w-0">
            <div className="mb-10 border-b border-gray-200 pb-10">
              <div className="mb-5 flex h-13 w-40 items-center justify-center">
                <BrandLogo size={34} />
              </div>

              <p className="mb-2 text-xs font-medium text-gray-400">
                NEVREX · Agenda+
              </p>

              <h1 className="text-3xl font-bold tracking-tight text-gray-950 sm:text-4xl">
                Termos de Uso
              </h1>

              <p className="mt-4 max-w-2xl text-sm leading-6 text-gray-500 sm:text-base">
                Estes Termos de Uso estabelecem as condições aplicáveis à
                utilização da plataforma Agenda+.
              </p>

              <p className="mt-4 text-xs text-gray-400">
                Última atualização: 27 de agosto de 2026
              </p>
            </div>

            <div className="space-y-10 text-sm leading-7 text-gray-600">
              <section id="aceitacao">
                <h2 className="text-lg font-semibold text-gray-950">
                  1. Aceitação dos Termos
                </h2>

                <p className="mt-3">
                  Ao criar uma conta, acessar ou utilizar o Agenda+, você declara
                  que leu, compreendeu e concorda com estes Termos de Uso e com
                  a Política de Privacidade.
                </p>

                <p className="mt-3">
                  Caso não concorde com estes termos, não deverá utilizar a
                  plataforma.
                </p>
              </section>

              <section id="slotix">
                <h2 className="text-lg font-semibold text-gray-950">
                  2. Sobre o Agenda+
                </h2>

                <p className="mt-3">
                  O Agenda+ é uma plataforma de software como serviço (SaaS)
                  desenvolvida e disponibilizada pela NEVREX para auxiliar
                  estabelecimentos na gestão de clientes, profissionais,
                  serviços, agendamentos e outras operações relacionadas à
                  atividade do estabelecimento.
                </p>

                <p className="mt-3">
                  As funcionalidades disponibilizadas podem ser alteradas,
                  melhoradas ou ampliadas ao longo do tempo.
                </p>
              </section>

              <section id="conta">
                <h2 className="text-lg font-semibold text-gray-950">
                  3. Conta e acesso
                </h2>

                <p className="mt-3">
                  Algumas funcionalidades do Agenda+ exigem a criação de uma
                  conta.
                </p>

                <p className="mt-3">
                  O utilizador é responsável por fornecer informações corretas e
                  atualizadas e por manter a confidencialidade das suas
                  credenciais de acesso.
                </p>

                <p className="mt-3">
                  O utilizador deve comunicar imediatamente qualquer utilização
                  não autorizada ou suspeita de comprometimento da sua conta.
                </p>
              </section>

              <section id="utilizacao">
                <h2 className="text-lg font-semibold text-gray-950">
                  4. Utilização da plataforma
                </h2>

                <p className="mt-3">
                  O Agenda+ deve ser utilizado de forma lícita, responsável e de
                  acordo com estes Termos.
                </p>

                <p className="mt-3">
                  Não é permitido utilizar a plataforma para atividades
                  fraudulentas, ilegais, abusivas ou que possam comprometer a
                  segurança, disponibilidade ou funcionamento do serviço.
                </p>
              </section>

              <section id="dados">
                <h2 className="text-lg font-semibold text-gray-950">
                  5. Dados inseridos pelo utilizador
                </h2>

                <p className="mt-3">
                  O utilizador é responsável pelos dados que introduz no Agenda+
                  e deve possuir os direitos, autorizações ou bases legais
                  necessárias para realizar esse tratamento.
                </p>

                <p className="mt-3">
                  Isso inclui, quando aplicável, dados de clientes,
                  profissionais, agendamentos e informações relacionadas às
                  atividades do estabelecimento.
                </p>
              </section>

              <section id="pagamentos">
                <h2 className="text-lg font-semibold text-gray-950">
                  6. Pagamentos e subscrições
                </h2>

                <p className="mt-3">
                  Caso o Agenda+ disponibilize planos pagos, preços, períodos de
                  teste ou funcionalidades sujeitas a pagamento, as condições
                  aplicáveis serão apresentadas ao utilizador antes da
                  contratação.
                </p>

                <p className="mt-3">
                  A NEVREX poderá alterar preços e condições para novos períodos
                  de contratação, respeitando as condições aplicáveis às
                  subscrições já realizadas.
                </p>
              </section>

              <section id="propriedade">
                <h2 className="text-lg font-semibold text-gray-950">
                  7. Propriedade intelectual
                </h2>

                <p className="mt-3">
                  A plataforma Agenda+, incluindo sua identidade visual,
                  software, interface, textos, elementos gráficos e demais
                  componentes disponibilizados pela NEVREX, é protegida pela
                  legislação aplicável.
                </p>

                <p className="mt-3">
                  A utilização do Agenda+ não transfere ao utilizador qualquer
                  direito de propriedade sobre a plataforma ou seus componentes.
                </p>
              </section>

              <section id="seguranca">
                <h2 className="text-lg font-semibold text-gray-950">
                  8. Segurança e disponibilidade
                </h2>

                <p className="mt-3">
                  A NEVREX procura aplicar medidas técnicas e organizacionais
                  adequadas para proteger a plataforma e os dados tratados
                  através dela.
                </p>

                <p className="mt-3">
                  Apesar dos esforços para manter o serviço disponível e seguro,
                  nenhum sistema conectado à internet pode ser considerado
                  absolutamente imune a falhas, interrupções ou incidentes de
                  segurança.
                </p>
              </section>

              <section>
                <h2 className="text-lg font-semibold text-gray-950">
                  9. Limitação de responsabilidade
                </h2>

                <p className="mt-3">
                  O utilizador reconhece que o Agenda+ é uma ferramenta de apoio
                  à gestão e que determinadas decisões comerciais, operacionais
                  ou financeiras permanecem sob responsabilidade do
                  estabelecimento.
                </p>

                <p className="mt-3">
                  Na medida permitida pela legislação aplicável, a NEVREX não
                  será responsável por prejuízos decorrentes de utilização
                  inadequada da plataforma, informações incorretas fornecidas
                  pelo utilizador ou eventos fora do seu controlo razoável.
                </p>
              </section>

              <section id="encerramento">
                <h2 className="text-lg font-semibold text-gray-950">
                  10. Suspensão e encerramento
                </h2>

                <p className="mt-3">
                  Uma conta poderá ser suspensa ou encerrada em caso de violação
                  destes Termos, utilização abusiva da plataforma ou outras
                  situações justificadas de acordo com a legislação aplicável.
                </p>

                <p className="mt-3">
                  O utilizador também poderá solicitar o encerramento da sua
                  conta, observadas as obrigações pendentes e as regras de
                  retenção de dados aplicáveis.
                </p>
              </section>

              <section>
                <h2 className="text-lg font-semibold text-gray-950">
                  11. Alterações destes Termos
                </h2>

                <p className="mt-3">
                  Estes Termos poderão ser atualizados para refletir alterações
                  na plataforma, na legislação ou nas práticas da NEVREX.
                </p>

                <p className="mt-3">
                  A versão mais recente estará sempre disponível nesta página.
                </p>
              </section>

              <section>
                <h2 className="text-lg font-semibold text-gray-950">
                  12. Lei aplicável
                </h2>

                <p className="mt-3">
                  Estes Termos deverão ser interpretados de acordo com a
                  legislação aplicável à relação entre a NEVREX e o utilizador,
                  sem prejuízo dos direitos que sejam garantidos
                  obrigatoriamente pela legislação aplicável.
                </p>
              </section>

              <section id="contacto">
                <div className="rounded-2xl border border-gray-200 bg-white p-6 sm:p-7">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-950 text-white">
                    <Mail className="h-[18px] w-[18px]" />
                  </div>

                  <h2 className="mt-4 text-lg font-semibold text-gray-950">
                    13. Contacto
                  </h2>

                  <p className="mt-3">
                    Para dúvidas relacionadas com estes Termos de Uso, entre em
                    contacto com a equipa da NEVREX.
                  </p>

                  <a
                    href="mailto:nevrex.contacto@gmail.com"
                    className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-gray-950 underline underline-offset-4"
                  >
                    <Mail className="h-[18px] w-[18px]" />
                    nevrex.contacto@gmail.com
                  </a>
                </div>
              </section>
            </div>
          </article>
        </div>
      </div>

      <footer className="border-t border-gray-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-5 py-7 text-xs text-gray-400 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>
            © {new Date().getFullYear()} NEVREX. Todos os direitos reservados.
          </p>

          <div className="flex gap-4">
            <Link href="/termos" className="text-gray-600 hover:text-gray-950">
              Termos de Uso
            </Link>

            <Link href="/privacidade" className="hover:text-gray-950">
              Política de Privacidade
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
