import { ArrowLeft, ArrowRight, Clock } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { LessonContent } from "@/components/lesson/LessonContent";
import { ExerciseList } from "@/components/exercise/ExerciseList";
import { trackColor } from "@/components/trackStyle";
import {
  getLesson,
  lessonHref,
  lessonSequence,
  neighbours,
  trackLabels,
} from "@/modules/curriculum";

export function generateStaticParams() {
  return lessonSequence.map((r) => ({
    moduleId: r.module.id,
    lessonId: r.lesson.id,
  }));
}

export async function generateMetadata(
  props: PageProps<"/learn/[moduleId]/[lessonId]">,
): Promise<Metadata> {
  const { moduleId, lessonId } = await props.params;
  const ref = getLesson(moduleId, lessonId);
  return ref
    ? {
        title: `${ref.lesson.title} — ${ref.module.title}`,
        description: ref.lesson.summary,
      }
    : {};
}

export default async function LessonPage(
  props: PageProps<"/learn/[moduleId]/[lessonId]">,
) {
  const { moduleId, lessonId } = await props.params;
  const ref = getLesson(moduleId, lessonId);
  if (!ref) notFound();
  const { module, lesson } = ref;
  const { prev, next } = neighbours(ref);
  const lessonNumber = module.lessons.findIndex((l) => l.id === lesson.id) + 1;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <nav aria-label="Breadcrumb" className="text-muted text-sm">
        <Link href="/roadmap" className="hover:text-fg">
          Roadmap
        </Link>{" "}
        /{" "}
        <span style={{ color: trackColor[module.track] }}>
          {trackLabels[module.track]}
        </span>{" "}
        / {module.title}
      </nav>
      <header className="mt-3">
        <p className="text-muted text-sm">
          Module {module.order} · Lesson {lessonNumber} of{" "}
          {module.lessons.length}
        </p>
        <h1 className="mt-1 text-3xl font-bold">{lesson.title}</h1>
        <p className="text-muted mt-2 flex items-center gap-3">
          <span>{lesson.summary}</span>
          <span className="inline-flex shrink-0 items-center gap-1 text-xs">
            <Clock aria-hidden="true" className="h-3.5 w-3.5" /> ~
            {lesson.minutes} min
          </span>
        </p>
      </header>

      <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
        <section
          aria-labelledby="notes-h"
          className="lg:sticky lg:top-20 lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto lg:pr-2"
        >
          <h2 id="notes-h" className="sr-only">
            Lesson notes
          </h2>
          <LessonContent blocks={lesson.content} />
        </section>
        <section aria-labelledby="practice-h">
          <h2 id="practice-h" className="mb-4 text-xl font-bold">
            Practice
          </h2>
          <ExerciseList exerciseIds={lesson.exercises.map((e) => e.id)} />
        </section>
      </div>

      <nav
        aria-label="Lesson navigation"
        className="border-line mt-12 flex justify-between gap-4 border-t pt-6"
      >
        {prev ? (
          <Link
            href={lessonHref(prev.module.id, prev.lesson.id)}
            className="text-muted hover:text-fg flex items-center gap-2 text-sm"
          >
            <ArrowLeft aria-hidden="true" className="h-4 w-4" />{" "}
            {prev.lesson.title}
          </Link>
        ) : (
          <span />
        )}
        {next && (
          <Link
            href={lessonHref(next.module.id, next.lesson.id)}
            className="bg-brand-solid hover:bg-brand-solid-hover flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white"
          >
            Next: {next.lesson.title}{" "}
            <ArrowRight aria-hidden="true" className="h-4 w-4" />
          </Link>
        )}
      </nav>
    </div>
  );
}
