type Doc = { title: string; updated: string; intro: string; sections: readonly { heading: string; body: readonly string[] }[] };

/** Renders a legal page (privacy policy / terms) from the i18n dictionary. */
export function LegalDocument({ doc }: { doc: Doc }) {
  return (
    <main className="mx-auto max-w-3xl px-5 py-12 sm:py-16">
      <h1 className="text-3xl font-black sm:text-4xl">{doc.title}</h1>
      <p className="mt-2 text-sm text-ink-500">{doc.updated}</p>
      <p className="mt-6 text-pretty leading-relaxed text-ink-300">{doc.intro}</p>
      {doc.sections.map((s) => (
        <section key={s.heading} className="mt-9">
          <h2 className="text-lg font-bold text-ink-100">{s.heading}</h2>
          {s.body.map((p) => (
            <p key={p} className="mt-3 text-pretty leading-relaxed text-ink-300">{p}</p>
          ))}
        </section>
      ))}
    </main>
  );
}
