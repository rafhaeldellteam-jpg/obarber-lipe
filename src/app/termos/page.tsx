import type { Metadata } from "next";
import { LegalPage } from "@/components/LegalPage";

export const metadata: Metadata = {
  title: "Termos de Uso",
  description: "Termos de Uso da Obarber Lipe.",
};

export default function TermosPage() {
  return (
    <LegalPage
      title="Termos de Uso"
      updated="6 de setembro de 2026"
      sections={[
        {
          title: "1. Serviço",
          paragraphs: [
            "A Obarber Lipe oferece agendamento online de cortes, barba, combos, planos mensais e produtos. Ao usar o site, você concorda com estes termos.",
          ],
        },
        {
          title: "2. Agendamentos",
          paragraphs: [
            "O horário é reservado ao confirmar o agendamento. Reserve com antecedência; atrasos podem reduzir o tempo do atendimento. O cancelamento pode ser feito pelo cliente ou pelo barbeiro a qualquer momento.",
          ],
        },
        {
          title: "3. Planos mensais",
          paragraphs: [
            "A ativação de planos é feita pelo site e depende da aprovação do barbeiro. O período do plano (contagem de dias) começa a valer somente após a aprovação. A barbearia pode pausar, cancelar ou ajustar planos em caso de uso indevido.",
          ],
        },
        {
          title: "4. Produtos",
          paragraphs: [
            "Os pedidos de produtos passam por aprovação do barbeiro e podem ser recusados. O pagamento é acertado diretamente na barbearia.",
          ],
        },
        {
          title: "5. Preços",
          paragraphs: [
            "Os valores exibidos podem ser atualizados a qualquer momento. O preço aplicado é o vigente na data do agendamento ou da solicitação, salvo ajustes acordados diretamente.",
          ],
        },
        {
          title: "6. Uso adequado",
          paragraphs: [
            "Não use o site para fins ilegais, para burlar o sistema de reservas ou para sobrecarregar os serviços. Podemos encerrar contas que violem estas regras.",
          ],
        },
        {
          title: "7. Limitação de responsabilidade",
          paragraphs: [
            "O site é fornecido \"como está\". A barbearia não se responsabiliza por indisponibilidades temporárias ou por falhas de ferramentas de terceiros (como serviços de mensageria e calendário externo).",
          ],
        },
        {
          title: "8. Alterações",
          paragraphs: [
            "Estes termos podem ser atualizados; a data no topo indica a versão vigente. O uso continuado do site após alterações significa aceitação.",
          ],
        },
        {
          title: "9. Contato",
          paragraphs: [
            "Dúvidas: fale pelo WhatsApp do site ou pelo e-mail comercial.barberlipe@gmail.com.",
          ],
        },
      ]}
    />
  );
}