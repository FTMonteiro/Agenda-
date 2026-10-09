"use client";

import { useEffect, useState } from "react";
import { matchBusinessCategory, type BusinessCategory } from "@slotix/types";

// Os exemplos que os campos mostram por dentro (placeholders), conforme o tipo de espaço:
// numa barbearia o campo do serviço sugere "Corte de cabelo", num pet shop "Banho e tosquia".
export interface CategoryExamples {
  businessName: string;
  serviceName: string;
  serviceDescription: string;
  specialty: string;
  appointmentNotes: string;
}

// Para um espaço que ainda não escolheu o tipo.
const GENERIC: CategoryExamples = {
  businessName: "Nome do estabelecimento",
  serviceName: "Nome do serviço",
  serviceDescription: "Descrição do serviço",
  specialty: "Especialidade do profissional",
  appointmentNotes: "Observações sobre o atendimento...",
};

const EXAMPLES: Record<BusinessCategory, CategoryExamples> = {
  Barbearia: {
    businessName: "Ex: Barbearia Central",
    serviceName: "Ex: Corte de cabelo e barba",
    serviceDescription: "Ex: Corte à máquina ou tesoura, com acabamento à navalha",
    specialty: "Ex: Barbeiro, especialista em degradê",
    appointmentNotes: "Ex: Degradê baixo, barba desenhada",
  },
  Salão: {
    businessName: "Ex: Salão Bela Mulher",
    serviceName: "Ex: Lavagem e brushing",
    serviceDescription: "Ex: Lavagem, hidratação e brushing para qualquer tipo de cabelo",
    specialty: "Ex: Cabeleireira, colorista",
    appointmentNotes: "Ex: Cabelo comprido, quer pintar de castanho",
  },
  Nails: {
    businessName: "Ex: Studio Nails",
    serviceName: "Ex: Unhas de gel",
    serviceDescription: "Ex: Aplicação de gel com decoração à escolha",
    specialty: "Ex: Manicure, nail designer",
    appointmentNotes: "Ex: Formato amêndoa, cor nude",
  },
  SPA: {
    businessName: "Ex: Oásis SPA",
    serviceName: "Ex: Circuito de spa",
    serviceDescription: "Ex: Sauna, banho turco e massagem de relaxamento",
    specialty: "Ex: Terapeuta de spa",
    appointmentNotes: "Ex: Prefere ambiente silencioso, alergia a óleos",
  },
  Estética: {
    businessName: "Ex: Clínica de Estética Pele Viva",
    serviceName: "Ex: Limpeza de pele",
    serviceDescription: "Ex: Limpeza profunda com extração e máscara hidratante",
    specialty: "Ex: Esteticista, cuidados de rosto",
    appointmentNotes: "Ex: Pele sensível, primeira sessão",
  },
  Tranças: {
    businessName: "Ex: Casa das Tranças",
    serviceName: "Ex: Tranças box braids",
    serviceDescription: "Ex: Tranças médias até à cintura, com ou sem extensões",
    specialty: "Ex: Trancista, cabelo afro",
    appointmentNotes: "Ex: Traz as extensões, tranças médias",
  },
  Maquilhagem: {
    businessName: "Ex: Glam Maquilhagem",
    serviceName: "Ex: Maquilhagem para eventos",
    serviceDescription: "Ex: Maquilhagem completa com pestanas, para festas e casamentos",
    specialty: "Ex: Maquilhadora, noivas",
    appointmentNotes: "Ex: Casamento às 15h, tons naturais",
  },
  "Pestanas e sobrancelhas": {
    businessName: "Ex: Studio do Olhar",
    serviceName: "Ex: Extensão de pestanas",
    serviceDescription: "Ex: Aplicação fio a fio, efeito natural ou volume",
    specialty: "Ex: Lash designer, design de sobrancelhas",
    appointmentNotes: "Ex: Volume russo, manutenção de 3 semanas",
  },
  Depilação: {
    businessName: "Ex: Pele Lisa Depilação",
    serviceName: "Ex: Depilação de pernas completas",
    serviceDescription: "Ex: Depilação a cera quente, com loção calmante no fim",
    specialty: "Ex: Depiladora, cera e laser",
    appointmentNotes: "Ex: Pele sensível, prefere cera morna",
  },
  Massagens: {
    businessName: "Ex: Mãos de Ouro Massagens",
    serviceName: "Ex: Massagem de relaxamento",
    serviceDescription: "Ex: Massagem de corpo inteiro com óleos essenciais",
    specialty: "Ex: Massagista, massagem terapêutica",
    appointmentNotes: "Ex: Dores nas costas, pressão média",
  },
  "Tatuagem e piercing": {
    businessName: "Ex: Ink Studio",
    serviceName: "Ex: Tatuagem pequena",
    serviceDescription: "Ex: Tatuagem até 10 cm, a preto, com desenho incluído",
    specialty: "Ex: Tatuador, traço fino",
    appointmentNotes: "Ex: Desenho no antebraço, traz referência",
  },
  "Pet shop": {
    businessName: "Ex: Pet Shop Patinhas",
    serviceName: "Ex: Banho e tosquia",
    serviceDescription: "Ex: Banho, secagem, tosquia e corte de unhas",
    specialty: "Ex: Tosquiador, banho e tosquia",
    appointmentNotes: "Ex: Cão de porte médio, tem medo do secador",
  },
};

export function categoryExamples(category: string | null | undefined): CategoryExamples {
  const matched = matchBusinessCategory(category);
  return matched ? EXAMPLES[matched] : GENERIC;
}

// O tipo do espaço muda raramente: pede-se uma vez e serve a todos os formulários.
let pending: Promise<string> | null = null;

function loadCategory(): Promise<string> {
  pending ??= fetch("/api/business/category", { credentials: "include", cache: "no-store" })
    .then((response) => (response.ok ? response.json() : null))
    .then((data) => (typeof data?.category === "string" ? data.category : ""))
    .catch(() => "");
  return pending;
}

// Chamado quando o dono muda o tipo do espaço nas configurações.
export function setBusinessCategory(category: string): void {
  pending = Promise.resolve(category);
}

// Os exemplos para o espaço de quem está a usar o painel; genéricos enquanto não se sabe o tipo.
export function useCategoryExamples(): CategoryExamples {
  const [category, setCategory] = useState("");

  useEffect(() => {
    let cancelled = false;
    void loadCategory().then((value) => {
      if (!cancelled) setCategory(value);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return categoryExamples(category);
}
