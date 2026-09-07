"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { Service, Employee, AvailableSlot } from "@/lib/types";
import { maskPhone, unmaskPhone, today, formatDateBR } from "@/lib/utils";
import { buildWhatsAppLink, confirmMessage } from "@/lib/whatsapp";
import { OWNER_WHATSAPP } from "@/lib/config";
import { cn } from "@/lib/utils";
import { CheckIcon, ScissorsIcon } from "@/components/icons";
import { SkeletonSlots } from "@/components/Loading";
import { DayStrip } from "@/components/scheduling/DayStrip";
import { TimeSlotGrid } from "@/components/scheduling/TimeSlotGrid";
import { BarberAvailabilityCard } from "@/components/scheduling/BarberAvailabilityCard";

type SlotModal = {
  clientName: string;
  clientPhone: string;
  serviceName: string;
  employeeName: string;
  date: string;
  time: string;
};

export function SchedulingSection() {
  const [services, setServices] = useState<Service[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [slots, setSlots] = useState<AvailableSlot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(true);

  const [employeeId, setEmployeeId] = useState<string>("any");
  const [serviceId, setServiceId] = useState("");
  const [date, setDate] = useState(() => today());
  const [time, setTime] = useState("");

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modal, setModal] = useState<SlotModal | null>(null);

  const minDate = today();

  const fetchAvailability = useCallback(async (emp: string, dt: string) => {
    try {
      const params = new URLSearchParams({ date: dt });
      if (emp && emp !== "any") params.set("employeeId", emp);
      const res = await fetch(`/api/availability?${params.toString()}`);
      const json = await res.json();
      if (!json.ok) {
        setError(json.message || "Erro ao carregar horários.");
        setSlots([]);
        return;
      }
      setServices(json.data.services ?? []);
      setEmployees(json.data.employees ?? []);
      setSlots(json.data.slots ?? []);
    } catch {
      setSlots([]);
      setError("Não foi possível carregar os horários. Tente novamente.");
    } finally {
      setLoadingSlots(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchAvailability(employeeId, date);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const anyEmployee = employeeId === "any";
  const selectedEmployee = useMemo(
    () => employees.find((e) => e.id === employeeId) ?? null,
    [employees, employeeId]
  );

  const selectedService = services.find((s) => s.id === serviceId) ?? null;
  const missing: string[] = [];
  if (!serviceId) missing.push("serviço");
  if (!time) missing.push("horário");
  if (name.trim().length < 2) missing.push("nome");
  if (unmaskPhone(phone).length < 10) missing.push("WhatsApp");
  const canSubmit = missing.length === 0;

  const onEmployeeChange = (id: string) => {
    setEmployeeId(id);
    setTime("");
    setSlots([]);
    setLoadingSlots(true);
    void fetchAvailability(id, date);
  };

  const onDateChange = (value: string) => {
    setDate(value);
    setTime("");
    setSlots([]);
    setLoadingSlots(true);
    void fetchAvailability(employeeId, value);
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientName: name.trim(),
          clientPhone: unmaskPhone(phone),
          employeeId: anyEmployee ? null : employeeId,
          serviceId,
          appointmentDate: date,
          appointmentTime: time,
          notes,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.message || "Não foi possível agendar.");
        return;
      }
      const service = services.find((s) => s.id === serviceId);
      setModal({
        clientName: name.trim(),
        clientPhone: unmaskPhone(phone),
        serviceName: service?.name ?? "Serviço",
        employeeName: selectedEmployee?.name ?? "Profissional",
        date,
        time,
      });
    } catch {
      setError("Não foi possível agendar. Tente novamente.");
    } finally {
      setSubmitting(false);
    }
  };

  const waHref = modal
    ? buildWhatsAppLink(
        OWNER_WHATSAPP,
        confirmMessage({
          clientName: modal.clientName,
          serviceName: modal.serviceName,
          date: modal.date,
          time: modal.time,
          employeeName: modal.employeeName,
        })
      )
    : "#";

  const reset = () => {
    setModal(null);
    setTime("");
    setName("");
    setPhone("");
    setNotes("");
  };

  return (
    <section id="agendar" className="scroll-mt-20 py-16 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <span className="text-xs font-bold uppercase tracking-[0.2em] text-brand-gold">
            Agendamento online
          </span>
          <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">
            Reserve seu <span className="text-gradient-gold">horário</span>
          </h2>
          <p className="mt-3 text-brand-gray">
            Escolha o profissional, o serviço e o horário. A confirmação é feita
            pelo WhatsApp.
          </p>
        </div>

        <form
          onSubmit={onSubmit}
          className="mx-auto mt-12 max-w-3xl rounded-3xl border border-brand-border bg-brand-card p-6 sm:p-8"
        >
          {/* Profissional */}
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-brand-gray">
              1 · Profissional
            </h3>
            <div className="mt-3 flex snap-x gap-2 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <button
                type="button"
                aria-pressed={anyEmployee}
                onClick={() => onEmployeeChange("any")}
                className={cn(
                  "flex min-w-[150px] shrink-0 snap-start items-center gap-3 rounded-2xl border p-3 text-left transition-all duration-200 btn-focus",
                  anyEmployee
                    ? "border-brand-gold bg-brand-gold/10 ring-2 ring-brand-gold/60 shadow-lg shadow-brand-gold/10"
                    : "border-brand-border bg-brand-card hover:border-brand-gold/40 hover:scale-[1.02]"
                )}
              >
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-brand-darker text-brand-gray">
                  <ScissorsIcon className="h-5 w-5" />
                </span>
                <span>
                  <span className="flex items-center gap-1.5">
                    <span className="text-sm font-bold">Qualquer um</span>
                    {anyEmployee && <CheckIcon className="h-4 w-4 text-brand-gold" />}
                  </span>
                  <span className="block text-xs text-brand-gray">
                    Primeiro disponível
                  </span>
                </span>
              </button>
              {employees.map((emp, i) => (
                <BarberAvailabilityCard
                  key={emp.id}
                  employee={emp}
                  index={i}
                  selected={!anyEmployee && employeeId === emp.id}
                  onSelect={() => onEmployeeChange(emp.id)}
                />
              ))}
              {employees.length === 0 && loadingSlots && (
                <div className="flex gap-2">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div
                      key={i}
                      className="h-[76px] w-[170px] shrink-0 animate-pulse rounded-2xl bg-brand-border/50"
                    />
                  ))}
                </div>
              )}
              {employees.length === 0 && !loadingSlots && (
                <p className="text-sm text-brand-gray">
                  Nenhum profissional cadastrado no momento.
                </p>
              )}
            </div>
          </div>

          {/* Serviço */}
          <div className="mt-8">
            <h3 className="text-sm font-bold uppercase tracking-wider text-brand-gray">
              2 · Serviço
            </h3>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {services.map((svc, i) => (
                <button
                  key={svc.id}
                  type="button"
                  aria-pressed={serviceId === svc.id}
                  onClick={() => setServiceId(svc.id)}
                  style={{ "--i": i } as React.CSSProperties}
                  className={cn(
                    "animate-fade-in-up stagger-delay rounded-xl border p-3 text-left transition-all duration-200 btn-focus hover:scale-[1.02]",
                    serviceId === svc.id
                      ? "border-brand-gold bg-brand-gold/15 shadow-lg shadow-brand-gold/10"
                      : "border-brand-border hover:border-brand-gold/40"
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold">{svc.name}</span>
                    <span className="text-sm font-black text-brand-gold">
                      R$ {svc.price.toFixed(2).replace(".", ",")}
                    </span>
                  </div>
                  <span className="mt-1 block text-xs text-brand-gray">
                    {svc.duration_minutes} min
                  </span>
                </button>
              ))}
              {!loadingSlots && services.length === 0 && (
                <p className="rounded-xl border border-dashed border-brand-border p-4 text-sm text-brand-gray sm:col-span-2">
                  Nenhum serviço cadastrado no momento. Fale conosco pelo WhatsApp.
                </p>
              )}
            </div>
          </div>

          {/* Data e horário */}
          <div className="mt-8">
            <h3 className="text-sm font-bold uppercase tracking-wider text-brand-gray">
              3 · Data e horário
            </h3>
            <div className="mt-3">
              <DayStrip
                selectedDate={date}
                minDate={minDate}
                maxDays={30}
                onSelect={onDateChange}
              />
            </div>
            <div className="mt-3 min-h-[120px]">
              {loadingSlots ? (
                <SkeletonSlots />
              ) : slots.length === 0 ? (
                <p className="py-6 text-center text-sm text-brand-gray">
                  Nenhum horário disponível para essa data.
                </p>
              ) : (
                <TimeSlotGrid
                  slots={slots}
                  selectedTime={time}
                  onSelect={setTime}
                />
              )}
            </div>
          </div>

          {/* Dados do cliente */}
          <div className="mt-8">
            <h3 className="text-sm font-bold uppercase tracking-wider text-brand-gray">
              4 · Seus dados
            </h3>
            <div className="mt-3 grid gap-4 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="sched-name"
                  className="mb-1.5 block text-xs font-medium text-brand-gray"
                >
                  Nome *
                </label>
                <input
                  id="sched-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Seu nome"
                  maxLength={80}
                  className="w-full rounded-xl border border-brand-border bg-brand-darker px-4 py-3 text-sm text-brand-text placeholder:text-brand-gray/60 btn-focus"
                />
              </div>
              <div>
                <label
                  htmlFor="sched-phone"
                  className="mb-1.5 block text-xs font-medium text-brand-gray"
                >
                  WhatsApp *
                </label>
                <input
                  id="sched-phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(maskPhone(e.target.value))}
                  placeholder="(11) 99999-9999"
                  className="w-full rounded-xl border border-brand-border bg-brand-darker px-4 py-3 text-sm text-brand-text placeholder:text-brand-gray/60 btn-focus"
                />
              </div>
            </div>
            <div className="mt-4">
              <label
                htmlFor="sched-notes"
                className="mb-1.5 block text-xs font-medium text-brand-gray"
              >
                Observações (opcional)
              </label>
              <textarea
                id="sched-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                placeholder="Alguma preferência para o profissional?"
                maxLength={300}
                className="w-full rounded-xl border border-brand-border bg-brand-darker px-4 py-3 text-sm text-brand-text placeholder:text-brand-gray/60 btn-focus"
              />
            </div>
          </div>

          {/* Resumo da seleção */}
          <div className="mt-8 rounded-2xl border border-brand-border bg-brand-darker p-4">
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
              <span className="font-bold uppercase tracking-wider text-xs text-brand-gray">
                Resumo
              </span>
              <span className={cn(selectedService ? "text-brand-text" : "text-brand-gray")}>
                {selectedService
                  ? `${selectedService.name} · R$ ${selectedService.price.toFixed(2).replace(".", ",")}`
                  : "Serviço não escolhido"}
              </span>
              <span className={cn(time ? "text-brand-text" : "text-brand-gray")}>
                {time ? `${formatDateBR(date)} às ${time}` : "Data/horário não escolhidos"}
              </span>
              <span className={cn(anyEmployee || selectedEmployee ? "text-brand-text" : "text-brand-gray")}>
                {selectedEmployee?.name ?? (anyEmployee ? "Qualquer profissional" : "Profissional livre")}
              </span>
            </div>
            {!canSubmit && missing.length > 0 && (
              <p className="mt-2 text-xs text-brand-gray">
                Falta preencher: <span className="font-semibold text-brand-orange">{missing.join(", ")}</span>.
              </p>
            )}
          </div>

          {error && (
            <p className="mt-5 rounded-xl border border-brand-red/30 bg-brand-red/10 px-4 py-3 text-sm text-brand-red">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={!canSubmit || submitting}
            className={cn(
              "mt-6 w-full rounded-xl bg-gold-gradient px-6 py-4 text-base font-black text-zinc-950 transition-transform btn-focus",
              !canSubmit || submitting
                ? "cursor-not-allowed opacity-50"
                : "hover:scale-[1.01]"
            )}
          >
            {submitting ? "Agendando…" : "Confirmar agendamento"}
          </button>
          <p className="mt-3 text-center text-xs text-brand-gray">
            Ao confirmar, você será direcionado ao WhatsApp para finalizar.
          </p>
        </form>
      </div>

      {/* Modal de sucesso */}
      {modal && (
        <div
          className="fixed inset-0 z-[90] flex items-center justify-center bg-black/70 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md animate-fade-in-up rounded-3xl border border-brand-gold/30 bg-brand-card p-6 sm:p-8">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-brand-green/15">
              <CheckIcon className="h-7 w-7 text-brand-green" />
            </div>
            <h3 className="mt-4 text-center text-2xl font-black">
              Horário reservado!
            </h3>
            <p className="mt-2 text-center text-sm text-brand-gray">
              {modal.clientName}, seu agendamento foi recebido. Finalize a
              confirmação enviando sua mensagem no WhatsApp:
            </p>

            <div className="mt-5 rounded-2xl border border-brand-border bg-brand-darker p-4">
              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-brand-gray">Serviço</span>
                  <span className="font-semibold">{modal.serviceName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-brand-gray">Profissional</span>
                  <span className="font-semibold">{modal.employeeName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-brand-gray">Data</span>
                  <span className="font-semibold">
                    {formatDateBR(modal.date)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-brand-gray">Horário</span>
                  <span className="font-semibold">{modal.time}</span>
                </div>
              </div>
            </div>

            <a
              href={waHref}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-6 grid w-full place-items-center rounded-xl bg-brand-green px-6 py-4 text-base font-black text-brand-text transition-transform hover:scale-[1.01] btn-focus"
            >
              Confirmar no WhatsApp
            </a>
            <button
              type="button"
              onClick={reset}
              className="mt-3 w-full rounded-xl border border-brand-border px-6 py-3 text-sm font-semibold text-brand-gray transition-colors hover:text-brand-text btn-focus"
            >
              Fechar
            </button>
          </div>
        </div>
      )}
    </section>
  );
}