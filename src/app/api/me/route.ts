import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { isAdminEmail } from "@/lib/admin";
import { signupMethodFromUser } from "@/lib/signup";
import { supabaseAdmin } from "@/lib/supabase";

// Painel do cliente autenticado (não é admin/barbeiro)
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ ok: false, message: "Não autenticado." }, { status: 401 });
  }
  // Equipe acessa o painel admin, não aqui
  if (isAdminEmail(user.email)) {
    return NextResponse.json({ ok: false, message: "Use o painel da equipe." }, { status: 403 });
  }

  const email = user.email!;

  const customerRes = await supabase.from("customers").select("id").eq("email", email);
  const customerIds = customerRes.data?.map((c) => c.id) ?? [];

  const [
    appointments,
    subscriptions,
    orders,
    customers,
    plans,
    products,
    employees,
    services,
  ] = await Promise.all([
    supabase
      .from("appointments")
      .select("*, services(name, price), employees(name)")
      .eq("client_email", email)
      .order("appointment_date", { ascending: false }),
    supabase
      .from("customer_subscriptions")
      .select("*, plans(name, price, duration_days, cuts_per_period), customers(name), employees(name)")
      .in("customer_id", customerIds),
    supabase
      .from("customer_orders")
      .select("*, customers(name), products(name)")
      .in("customer_id", customerIds),
    supabase.from("customers").select("*").eq("email", email),
    supabase
      .from("plans")
      .select("*")
      .eq("active", true)
      .order("sort_order")
      .order("name"),
    supabase
      .from("products")
      .select("*")
      .eq("active", true)
      .order("sort_order")
      .order("name"),
    supabase
      .from("employees")
      .select("*")
      .eq("active", true)
      .order("name"),
    supabase
      .from("services")
      .select("*")
      .eq("active", true)
      .order("sort_order")
      .order("name"),
  ]);

  return NextResponse.json({
    ok: true,
    data: {
      user: { name: user.user_metadata?.name ?? null, email },
      appointments: appointments.data ?? [],
      subscriptions: subscriptions.data ?? [],
      orders: orders.data ?? [],
      customers: customers.data ?? [],
      plans: plans.data ?? [],
      products: products.data ?? [],
      employees: employees.data ?? [],
      services: services.data ?? [],
    },
  });
}

// Solicitações do cliente
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ ok: false, message: "Não autenticado." }, { status: 401 });
  }
  if (isAdminEmail(user.email)) {
    return NextResponse.json({ ok: false, message: "Use o painel da equipe." }, { status: 403 });
  }

  const body = await request.json();
  const action = String(body.action ?? "");
  const email = user.email!;
  const name = user.user_metadata?.name ?? null;
  const metadataPhone = String(user.user_metadata?.phone ?? "").replace(/\D/g, "");
  const phone =
    String(body.phone ?? "").replace(/\D/g, "") || metadataPhone;

  // Garante um registro de cliente vinculado à conta do usuário
  let customer = (
    await supabase.from("customers").select("*").eq("email", email).maybeSingle()
  ).data;
  if (!customer) {
    // Fallback com service role (ignora RLS e possíveis duplicados)
    const { data: adminRows } = await supabaseAdmin
      .from("customers")
      .select("*")
      .eq("email", email)
      .order("created_at", { ascending: true })
      .limit(1);
    customer = adminRows?.[0] ?? null;
  }
  if (!customer) {
    const signupMethod = signupMethodFromUser(user);
    // Tenta com todos os campos; se o banco tiver schema antigo,
    // repete sem as colunas opcionais (signup_method, phone).
    const baseFields: Record<string, unknown> = {
      name: name ?? email.split("@")[0],
      email,
    };
    let inserted = await supabaseAdmin
      .from("customers")
      .insert({ ...baseFields, signup_method: signupMethod, ...(phone ? { phone } : {}) })
      .select("*")
      .single();
    if (inserted.error) {
      inserted = await supabaseAdmin
        .from("customers")
        .insert(baseFields)
        .select("*")
        .single();
    }
    if (inserted.error) {
      console.error("[api/me] Falha ao criar customer:", inserted.error.message);
      // Pode ser corrida/uniq: tenta localizar novamente
      const { data: retryRows } = await supabaseAdmin
        .from("customers")
        .select("*")
        .eq("email", email)
        .order("created_at", { ascending: true })
        .limit(1);
      customer = retryRows?.[0] ?? null;
      if (!customer) {
        return NextResponse.json(
          {
            ok: false,
            message: `Não foi possível criar seu cadastro de cliente: ${inserted.error.message}`,
          },
          { status: 500 }
        );
      }
    } else {
      customer = inserted.data;
    }
  } else if (phone && !customer.phone) {
    // Sincroniza o celular capturado no cadastro (ou metadata do Google).
    // Se a coluna phone não existir no banco, apenas ignora.
    const updated = await supabaseAdmin
      .from("customers")
      .update({ phone })
      .eq("id", customer.id)
      .select("*")
      .single();
    customer = updated.data ?? customer;
  }
  if (!customer) {
    return NextResponse.json({ ok: false, message: "Não foi possível identificar o cliente." }, { status: 500 });
  }

  // Solicitar ativação de plano (aguarda aprovação do barbeiro escolhido)
  if (action === "request_plan") {
    const planId = String(body.plan_id ?? "");
    const employeeId = String(body.employee_id ?? "");

    if (!planId || !employeeId) {
      return NextResponse.json({ ok: false, message: "Escolha o plano e o barbeiro." }, { status: 400 });
    }

    const { data: plan } = await supabaseAdmin
      .from("plans")
      .select("name, price")
      .eq("id", planId)
      .maybeSingle();

    const { data: employee } = await supabaseAdmin
      .from("employees")
      .select("name, email")
      .eq("id", employeeId)
      .maybeSingle();

    const { error } = await supabaseAdmin
      .from("customer_subscriptions")
      .insert({
        customer_id: customer.id,
        plan_id: planId,
        employee_id: employeeId,
        status: "aguardando",
        start_date: null,
        end_date: null,
      });

    if (error) {
      return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
    }

    // Notifica o barbeiro escolhido para aprovar/recusar (melhor esforço)
    if (employee?.email) {
      try {
        const { sendMail, emailTemplate, buttonHtml, siteUrl } = await import("@/lib/email");
        await sendMail({
          to: employee.email,
          subject: `Solicitação de plano: ${customer.name} quer ativar ${plan?.name ?? "um plano"}`,
          html: emailTemplate(`
            <p style="margin:0 0 12px;">Olá, <strong>${employee.name}</strong>!</p>
            <p style="margin:0 0 12px;">O cliente <strong>${customer.name}</strong> solicitou a ativação do plano <strong>${plan?.name ?? ""}</strong> (${plan?.price != null ? `R$ ${Number(plan.price).toFixed(2).replace(".", ",")}` : ""}) com você.</p>
            <p style="margin:0;">Abra o painel para <strong>aprovar ou recusar</strong>. Ao aprovar, a contagem do plano começa na hora.</p>
            ${buttonHtml(`${siteUrl}/admin`, "Abrir painel ✂️")}
          `),
        });
      } catch {
        // melhor esforço
      }
    }

    return NextResponse.json({ ok: true, message: "Solicitação enviada ao barbeiro!" }, { status: 201 });
  }

  // Solicitar produto (aguarda aprovação do barbeiro escolhido)
  if (action === "request_product") {
    const productId = String(body.product_id ?? "");
    const employeeId = String(body.employee_id ?? "");

    if (!productId || !employeeId) {
      return NextResponse.json({ ok: false, message: "Escolha o produto e o barbeiro." }, { status: 400 });
    }

    const { data: product } = await supabaseAdmin
      .from("products")
      .select("*")
      .eq("id", productId)
      .eq("active", true)
      .maybeSingle();
    if (!product) {
      return NextResponse.json({ ok: false, message: "Produto indisponível." }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from("customer_orders")
      .insert({
        customer_id: customer.id,
        employee_id: employeeId,
        product_id: product.id,
        description: product.name,
        amount: product.price,
        status: "aguardando",
      });

    if (error) {
      return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true, message: "Pedido enviado para aprovação!" }, { status: 201 });
  }

  return NextResponse.json({ ok: false, message: "Ação inválida." }, { status: 400 });
}