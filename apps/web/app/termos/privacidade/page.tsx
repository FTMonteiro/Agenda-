import Link from "next/link";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { ArrowLeft, Mail, ShieldCheck } from "lucide-react";

export default function PrivacidadePage() {
  return (
    <main className="min-h-screen bg-[#fafafa] text-gray-900">
      {/* HEADER */}
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 sm:px-6">
          <Link href="/login" className="flex items-center gap-2.5">
            <div className="mb-5 flex h-13 w-30 items-center justify-center">
              <BrandLogo size={34} />
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

      {/* CONTENT */}
      <div className="mx-auto max-w-6xl px-5 py-12 sm:px-6 lg:py-16">
        <div className="grid gap-10 lg:grid-cols-[220px_1fr]">
          {/* SIDEBAR */}
          <aside className="hidden lg:block">
            <div className="sticky top-8">
              <p className="mb-3 text-xs font-medium text-gray-400">
                Neste documento
              </p>

              <nav className="space-y-1 text-xs text-gray-500">
                <a
                  href="#responsavel"
                  className="block rounded-md px-2 py-1.5 hover:bg-gray-100 hover:text-gray-900"
                >
                  Quem somos
                </a>

                <a
                  href="#dados"
                  className="block rounded-md px-2 py-1.5 hover:bg-gray-100 hover:text-gray-900"
                >
                  Dados recolhidos
                </a>

                <a
                  href="#finalidade"
                  className="block rounded-md px-2 py-1.5 hover:bg-gray-100 hover:text-gray-900"
                >
                  Finalidades
                </a>

                <a
                  href="#clientes"
                  className="block rounded-md px-2 py-1.5 hover:bg-gray-100 hover:text-gray-900"
                >
                  Dados de clientes
                </a>

                <a
                  href="#seguranca"
                  className="block rounded-md px-2 py-1.5 hover:bg-gray-100 hover:text-gray-900"
                >
                  Segurança
                </a>

                <a
                  href="#partilha"
                  className="block rounded-md px-2 py-1.5 hover:bg-gray-100 hover:text-gray-900"
                >
                  Partilha
                </a>

                <a
                  href="#cookies"
                  className="block rounded-md px-2 py-1.5 hover:bg-gray-100 hover:text-gray-900"
                >
                  Cookies
                </a>

                <a
                  href="#direitos"
                  className="block rounded-md px-2 py-1.5 hover:bg-gray-100 hover:text-gray-900"
                >
                  Direitos
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

          {/* DOCUMENT */}
          <article className="min-w-0">
            {/* HERO */}
            <div className="mb-10 border-b border-gray-200 pb-10">
              <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-950 text-white">
                <ShieldCheck className="h-5 w-5" />
              </div>

              <p className="mb-2 text-xs font-medium text-gray-400">
                NEVREX · Agenda+
              </p>

              <h1 className="text-3xl font-bold tracking-tight text-gray-950 sm:text-4xl">
                Política de Privacidade
              </h1>

              <p className="mt-4 max-w-2xl text-sm leading-6 text-gray-500 sm:text-base">
                Esta Política de Privacidade explica como os dados são tratados
                quando você utiliza o Agenda+.
              </p>

              <p className="mt-4 text-xs text-gray-400">
                Última atualização: 27 de agosto de 2026
              </p>
            </div>

            <div className="space-y-10 text-sm leading-7 text-gray-600">
              <section id="responsavel">
                <h2>1. Quem somos</h2>

                <p>
                  O Agenda+ é uma plataforma desenvolvida e disponibilizada pela
                  NEVREX.
                </p>

                <p>
                  Esta Política explica, de forma transparente, quais
                  informações podem ser tratadas através da plataforma, por que
                  são utilizadas e quais medidas são adotadas para protegê-las.
                </p>
              </section>

              <section id="dados">
                <h2>2. Dados que podemos recolher</h2>

                <p>
                  Dependendo da forma como o Agenda+ é utilizado, podemos tratar
                  diferentes categorias de informações.
                </p>

                <h3>2.1. Dados de conta</h3>

                <p>
                  Podem incluir nome, endereço de email, número de telefone,
                  informações de autenticação e outros dados necessários para
                  criar e administrar uma conta.
                </p>

                <h3>2.2. Dados de utilização</h3>

                <p>
                  Podemos tratar informações relacionadas à utilização da
                  plataforma, como ações realizadas, funcionalidades utilizadas,
                  informações técnicas, endereço IP, navegador e informações
                  necessárias para segurança e funcionamento do serviço.
                </p>

                <h3>2.3. Dados introduzidos no sistema</h3>

                <p>
                  O estabelecimento pode inserir informações relacionadas às
                  suas operações, incluindo dados de clientes, profissionais,
                  serviços, agendamentos e outras informações necessárias para
                  utilização do Agenda+.
                </p>
              </section>

              <section id="finalidade">
                <h2>3. Como utilizamos os dados</h2>

                <p>Os dados podem ser utilizados para:</p>

                <ul>
                  <li>fornecer e operar as funcionalidades do Agenda+;</li>

                  <li>criar e administrar contas;</li>

                  <li>permitir a gestão de clientes e agendamentos;</li>

                  <li>manter a segurança da plataforma;</li>

                  <li>
                    detectar e prevenir utilização abusiva ou fraudulenta;
                  </li>

                  <li>melhorar a experiência e o funcionamento do serviço;</li>

                  <li>prestar suporte;</li>

                  <li>cumprir obrigações legais aplicáveis.</li>
                </ul>
              </section>

              <section id="clientes">
                <h2>4. Dados dos clientes dos estabelecimentos</h2>

                <p>
                  Quando um estabelecimento utiliza o Agenda+ para cadastrar e
                  gerir informações dos seus próprios clientes, o
                  estabelecimento permanece responsável por garantir que possui
                  autorização ou outra base legal adequada para realizar esse
                  tratamento.
                </p>

                <p>
                  O estabelecimento também é responsável por fornecer aos seus
                  clientes as informações e garantias exigidas pela legislação
                  aplicável ao tratamento desses dados.
                </p>
              </section>

              <section id="seguranca">
                <h2>5. Segurança</h2>

                <p>
                  A NEVREC adota medidas técnicas e organizacionais destinadas a
                  proteger os dados contra acesso não autorizado, perda,
                  alteração, divulgação indevida ou destruição.
                </p>

                <p>
                  Entretanto, nenhum serviço online pode garantir segurança
                  absoluta. Por isso, também é importante que os utilizadores
                  protejam suas credenciais e utilizem senhas fortes e
                  confidenciais.
                </p>
              </section>

              <section id="partilha">
                <h2>6. Partilha de dados</h2>

                <p>
                  Os dados poderão ser tratados por fornecedores que prestem
                  serviços necessários ao funcionamento do Agenda+, como
                  infraestrutura tecnológica, armazenamento, autenticação,
                  segurança e outros serviços essenciais.
                </p>

                <p>
                  Esses fornecedores somente deverão ter acesso às informações
                  necessárias para prestar os serviços correspondentes, de
                  acordo com as condições aplicáveis.
                </p>

                <p>
                  Também poderemos divulgar informações quando isso for
                  necessário para cumprir uma obrigação legal, proteger direitos
                  ou segurança, ou responder a solicitações legítimas das
                  autoridades competentes.
                </p>
              </section>

              <section id="cookies">
                <h2>7. Cookies e tecnologias semelhantes</h2>

                <p>
                  O Agenda+ pode utilizar cookies ou tecnologias semelhantes para
                  manter sessões, garantir segurança, guardar preferências e
                  melhorar o funcionamento da plataforma.
                </p>

                <p>
                  Algumas tecnologias podem ser essenciais para que determinadas
                  funcionalidades funcionem corretamente.
                </p>
              </section>

              <section>
                <h2>8. Retenção dos dados</h2>

                <p>
                  Os dados serão mantidos pelo período necessário para cumprir
                  as finalidades descritas nesta Política, fornecer o serviço,
                  cumprir obrigações legais, resolver conflitos e proteger os
                  interesses legítimos aplicáveis.
                </p>
              </section>

              <section id="direitos">
                <h2>9. Direitos dos titulares</h2>

                <p>
                  Dependendo da legislação aplicável, os titulares dos dados
                  poderão possuir direitos relacionados aos seus dados pessoais,
                  incluindo solicitar acesso, correção, atualização ou
                  eliminação dos dados, bem como exercer outros direitos
                  previstos pela legislação aplicável.
                </p>

                <p>
                  Solicitações relacionadas a dados devem ser encaminhadas
                  através do nosso contacto oficial.
                </p>
              </section>

              <section>
                <h2>10. Dados de menores</h2>

                <p>
                  O Agenda+ não foi concebido especificamente para recolher dados
                  de menores sem a participação ou autorização adequada dos
                  responsáveis, quando exigida pela legislação aplicável.
                </p>
              </section>

              <section>
                <h2>11. Alterações desta Política</h2>

                <p>
                  Esta Política poderá ser atualizada periodicamente para
                  refletir alterações no Agenda+, nos processos de tratamento de
                  dados ou na legislação aplicável.
                </p>

                <p>A versão mais recente será disponibilizada nesta página.</p>
              </section>

              <section id="contacto">
                <div className="rounded-2xl border border-gray-200 bg-white p-6 sm:p-7">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-950 text-white">
                    <Mail className="h-[18px] w-[18px]" />
                  </div>

                  <h2 className="mt-4">12. Contacto</h2>

                  <p>
                    Se tiver dúvidas, pedidos ou questões relacionadas com
                    privacidade e proteção de dados, entre em contacto com a
                    NEVREX.
                  </p>

                  <a
                    href="mailto:nevrec.contacto@gmail.com"
                    className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-gray-950 underline underline-offset-4"
                  >
                    nevrex.contacto@gmail.com
                  </a>
                </div>
              </section>
            </div>
          </article>
        </div>
      </div>

      {/* FOOTER */}
      <footer className="border-t border-gray-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-5 py-7 text-xs text-gray-400 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>
            © {new Date().getFullYear()} NEVREX. Todos os direitos reservados.
          </p>

          <div className="flex gap-4">
            <Link href="/termos" className="hover:text-gray-950">
              Termos de Uso
            </Link>

            <Link
              href="/privacidade"
              className="text-gray-600 hover:text-gray-950"
            >
              Política de Privacidade
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
