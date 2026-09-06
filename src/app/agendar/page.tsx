"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { useAuth } from "@/lib/AuthContext";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Loading } from "@/components/Loading";

const SchedulingSection = dynamic(() =>
  import("@/components/SchedulingSection").then((m) => m.SchedulingSection)
);

export default function AgendarPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.replace("/");
  }, [loading, user, router]);

  if (loading || !user) {
    return (
      <main className="grid min-h-screen place-items-center">
        <Loading />
      </main>
    );
  }

  return (
    <>
      <Header />
      <main>
        <SchedulingSection />
      </main>
      <Footer />
    </>
  );
}