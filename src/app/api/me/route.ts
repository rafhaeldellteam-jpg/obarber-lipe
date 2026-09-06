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
  const phone = String(body.phone ?? "").replace(/\D/g, "");

  // Garante um registro de cliente vinculado à conta do usuário
  let customer = (
    await supabase.from("customers").select("*").eq("email", email).maybeSingle()
  ).data;
  if (!customer) {
    const signupMethod = signupMethodFromUser(user);
    const insertFields: Record<string, unknown> = {
      name: name ?? email.split("@")[0],
      email,
      signup_method: signupMethod,
    };
    if (phone) insertFields.phone = phone;
    customer = (
      await supabaseAdmin
        .from("customers")
        .insert(insertFields)
        .select("*")
        .single()
    ).data;
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