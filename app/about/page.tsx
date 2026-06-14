const model = [
  {
    title: "Thinking directs perception",
    body: "Your thoughts determine what receives attention, what receives meaning, and what becomes the story of the day.",
  },
  {
    title: "Willing directs behavior",
    body: "Your will translates invisible intention into visible movement, habit, discipline, avoidance, or inspired action.",
  },
  {
    title: "Feeling charges identity",
    body: "Your emotional state gives weight and electricity to the self you believe you are becoming.",
  },
  {
    title: "Being is the integrated state",
    body: "Being is the felt quality that emerges when thought, action, and emotional charge are no longer pulling in separate directions.",
  },
];

export default function AboutPage() {
  return (
    <main className="container py-8 md:py-12">
      <section className="mx-auto max-w-4xl">
        <p className="clearpth-page-kicker">The ClearPth Model</p>
        <h1 className="clearpth-page-title">
          Thinking | Willing | Feeling = Being
        </h1>
        <p className="mt-6 text-lg leading-8 text-muted-foreground">
          ClearPth is a self-reflection and personal growth app. It helps you look
          at the relationship between what you think, what you do, what you
          feel, and the integrated state others experience from you. It is not a
          medical, therapy, or diagnostic tool.
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
    </main>
  );
}
