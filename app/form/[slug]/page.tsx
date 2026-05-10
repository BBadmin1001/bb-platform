import { notFound } from "next/navigation";
import { createClient as createServerClient } from "@/lib/supabase/server";
import PublicFormRenderer from "@/components/PublicFormRenderer";
import type { FormField } from "@/lib/forms";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createServerClient();
  const { data: form } = await supabase
    .from("forms")
    .select("title, description")
    .eq("slug", slug)
    .eq("is_published", true)
    .maybeSingle();
  if (!form) return { title: "Form" };
  return {
    title: `${form.title} | Samina Bilal`,
    description: form.description ?? undefined,
  };
}

export default async function PublicFormPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createServerClient();
  const { data: form } = await supabase
    .from("forms")
    .select(
      "id, slug, title, description, fields, submit_label, success_message, is_published",
    )
    .eq("slug", slug)
    .eq("is_published", true)
    .maybeSingle();

  if (!form) notFound();

  return (
    <section className="min-h-screen bg-cream-soft pt-32 pb-24 px-6">
      <div className="max-w-2xl mx-auto">
        <p
          className="text-[0.65rem] tracking-[0.32em] uppercase text-ink/55 mb-3 text-center"
          style={{ fontWeight: 500 }}
        >
          Form
        </p>
        <h1
          className="text-3xl md:text-4xl text-ink text-center mb-4"
          style={{ fontWeight: 300, letterSpacing: "0.02em" }}
        >
          {form.title}
        </h1>
        {form.description && (
          <p className="text-sm md:text-base text-ink/70 text-center max-w-xl mx-auto mb-12 leading-relaxed">
            {form.description}
          </p>
        )}

        <PublicFormRenderer
          formId={form.id as string}
          slug={form.slug as string}
          fields={(form.fields as FormField[]) ?? []}
          submitLabel={form.submit_label as string}
          successMessage={form.success_message as string}
        />
      </div>
    </section>
  );
}
