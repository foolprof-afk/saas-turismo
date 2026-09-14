"use client";

import { use } from "react";
import { LoginForm } from "@/components/login-form";

export default function AgenciaLoginPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  return <LoginForm agenciaSlug={slug} />;
}
