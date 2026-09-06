export function buildWhatsAppLink(phone: string, message: string) {
  const clean = phone.replace(/\D/g, "");
  const encoded = encodeURIComponent(message);
  return `https://wa.me/${clean}?text=${encoded}`;
}

export function confirmMessage(params: {
  clientName: string;
  serviceName: string;
  date: string;
  time: string;
  employeeName: string;
}) {
  const [dd, mm, yyyy] = params.date.split("-");
  return `Olá! Agendei na *Obarber Lipe*\n\n` +
    `Cliente: ${params.clientName}\n` +
    `Serviço: ${params.serviceName}\n` +
    `Profissional: ${params.employeeName}\n` +
    `Data: ${dd}/${mm}/${yyyy}\n` +
    `Horário: ${params.time}\n\n` +
    `Pode confirmar meu horário? Obrigado!`;
}

export function notifyAdminMessage(params: {
  clientName: string;
  serviceName: string;
  date: string;
  time: string;
  employeeName: string;
  clientPhone: string;
}) {
  const [dd, mm, yyyy] = params.date.split("-");
  return `*NOVO AGENDAMENTO - Obarber Lipe*\n\n` +
    `Cliente: ${params.clientName}\n` +
    `Celular: ${params.clientPhone}\n` +
    `Serviço: ${params.serviceName}\n` +
    `Profissional: ${params.employeeName}\n` +
    `Data: ${dd}/${mm}/${yyyy}\n` +
    `Horário: ${params.time}\n\n` +
    `Acesse o painel para confirmar.`;
}

export function statusWhatsAppMessage(params: {
  clientName: string;
  date: string;
  time: string;
  status: string;
}) {
  const [dd, mm, yyyy] = params.date.split("-");
  if (params.status === "confirmado") {
    return `Oi, ${params.clientName}! Seu horário *${dd}/${mm}/${yyyy} às ${params.time}* na Obarber Lipe foi *CONFIRMADO*\n\nTe esperamos lá!`;
  }
  if (params.status === "cancelado") {
    return `Oi, ${params.clientName}! Infelizmente seu horário de *${dd}/${mm}/${yyyy} às ${params.time}* foi *CANCELADO*\n\nPode entrar em contato para remarcar quando quiser.`;
  }
  if (params.status === "concluido") {
    return `Oi, ${params.clientName}! Obrigado pela visita na *Obarber Lipe*\n\nEsperamos você de volta em breve!`;
  }
  return "";
}