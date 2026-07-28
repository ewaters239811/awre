const model = [
  {
    title: "Thoughts shape what you notice",
    body: "Your thoughts affect what you focus on and what story you tell yourself about the day.",
  },
  {
    title: "Actions show what you are choosing",
    body: "Your actions, habits, delays, and choices show what you are practicing in real life.",
  },
  {
    title: "Feelings affect how real it feels",
    body: "Your feelings influence how possible, safe, or believable your desired life feels today.",
  },
  {
    title: "Your state is the full picture",
    body: "Your state is what happens when your thoughts, actions, and feelings are either working together or pulling apart.",
  },
];

export default function AboutPage() {
  return (
    <main className="container py-8 md:py-12">
      <section className="mx-auto max-w-4xl">
        <p className="clearpth-page-kicker">How ClearPth Works</p>
        <h1 className="clearpth-page-title">
          Thoughts + Actions + Feelings
        </h1>
        <p className="mt-6 text-lg leading-8 text-muted-foreground">
          ClearPth is a self-reflection app. It helps you see what you want,
          where you are today, and what next step could bring you closer. It
          is not a medical, therapy, or diagnostic tool.
        </p>
      </section>

      <section className="mx-auto mt-10 grid max-w-4xl gap-5">
        {model.map((item) => (
          <article key={item.title} className="aura-glass rounded-lg p-5">
            <h2 className="font-serif text-2xl font-semibold text-primary">
              {item.title}
            </h2>
            <p className="mt-2 leading-7 text-muted-foreground">{item.body}</p>
          </article>
        ))}
      </section>

      <section className="aura-glass mx-auto mt-8 max-w-4xl rounded-lg p-5">
        <h2 className="font-serif text-2xl font-semibold text-primary">
          A note on support
        </h2>
        <p className="mt-2 leading-7 text-muted-foreground">
          ClearPth is for self-reflection and personal growth. It is not crisis
          support, therapy, medical care, diagnosis, or a replacement for a
          trusted professional. If you may hurt yourself or feel in immediate
          danger, contact emergency services, a trusted person, or in the U.S.
          call or text 988 for the Suicide & Crisis Lifeline.
        </p>
      </section>
    </main>
  );
}
