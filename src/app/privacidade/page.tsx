import type { Metadata } from "next";
import { LegalPage } from "@/components/LegalPage";

export const metadata: Metadata = {
  title: "Política de Privacidade",
  description: "Política de Privacidade da Obarber Lipe.",
};

export default function PrivacidadePage() {
  return (
    <LegalPage
      title="Política de Privacidade"
      updated="6 de setembro de 2026"
      sections={[
        {
          title: "1. Quem somos",
          paragraphs: [
            "A Obarber Lipe é uma barbearia que oferece agendamento online de cortes, serviços e produtos. Esta política explica como tratamos os dados pessoais dos clientes.",
          ],
        },
        {
          title: "2. Dados que coletamos",
          paragraphs: [
            "Para usar o agendamento online, coletamos: nome, telefone, e-mail (quando você cria conta) e os agendamentos realizados (data, horário, serviço e barbeiro).",
            "Ao ativar planos ou pedir produtos, registramos também a solicitação e o status da aprovação pelo barbeiro.",
          ],
        },
        {
          title: "3. Para que usamos os dados",
          paragraphs: [
            "Usamos seus dados para: confirmar e gerenciar agendamentos, manter seu histórico de clientes, processar pedidos de produtos e ativações de planos, e entrar em contato pelo WhatsApp quando necessário.",
          ],
        },
        {
          title: "4. Sincronização com o Google Agenda",
          paragraphs: [
            "Os agendamentos podem ser sincronizados com o Google Agenda do barbeiro responsável, com a sua autorização. Nesse caso, o evento do seu horário (nome, data/horário e serviço) fica visível apenas no calendário pessoal do barbeiro. Não misturamos as agendas entre barbeiros.",
          ],
        },
        {
          title: "5. Compartilhamento",
          paragraphs: [
            "Não vendemos nem compartilhamos seus dados com terceiros, exceto: (a) com os profissionais da própria barbearia, para prestar o serviço; e (b) quando exigido por lei ou ordem judicial.",
          ],
        },
        {
          title: "6. Armazenamento e segurança",
          paragraphs: [
            "Seus dados ficam armazenados em serviços na nuvem com criptografia em trânsito. Empregamos práticas razoáveis de segurança, mas nenhum sistema é 100% seguro.",
          ],
        },
        {
          title: "7. Seus direitos",
          paragraphs: [
            "Você pode solicitar acesso, correção ou exclusão dos seus dados a qualquer momento pelos canais de contato abaixo. Pedidos de exclusão podem limitar o uso do agendamento online.",
          ],
        },
        {
          title: "8. Contato",
          paragraphs: [
            "Dúvidas sobre esta política: fale com a barbearia pelo WhatsApp do site ou pelo e-mail comercial.barberlipe@gmail.com.",
          ],
        },
      ]}
    />
  );
}