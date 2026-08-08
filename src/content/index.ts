import { lazy, type ComponentType } from 'react';

export interface LessonMeta {
  title: string;
  component?: string;
  steps?: LessonStep[];
  system?: string;

  review: 'draft' | 'reviewed';
  reviewer?: string;
  reviewedOn?: string;
}

export interface LessonStep {
  title: string;
  body: string;

  focus?: string;

  system?: string;
}

export type MdxModule = { default: ComponentType<Record<string, unknown>>; meta?: LessonMeta };

const componentLoaders = import.meta.glob<MdxModule>('./components/*.mdx');
const lessonLoaders = import.meta.glob<MdxModule>('./lessons/*.mdx');
const lessonMeta = import.meta.glob<LessonMeta>('./lessons/*.mdx', { eager: true, import: 'meta' });

const slugOf = (path: string) => path.replace(/^.*[/]/, '').replace(/\.mdx$/, '');

const bySlug = <T,>(record: Record<string, T>): Map<string, T> =>
  new Map(Object.entries(record).map(([path, value]) => [slugOf(path), value]));

const COMPONENT_LOADERS = bySlug(componentLoaders);
const LESSON_LOADERS = bySlug(lessonLoaders);
const LESSON_META = bySlug(lessonMeta);

export const hasComponentLesson = (slug: string): boolean => COMPONENT_LOADERS.has(slug);

export const componentLessonSlugs = (): string[] => [...COMPONENT_LOADERS.keys()];

export const loadComponentLesson = (slug: string): (() => Promise<MdxModule>) | null =>
  COMPONENT_LOADERS.get(slug) ?? null;

export interface GuidedLesson extends LessonMeta {
  id: string;
}

export const guidedLessons: GuidedLesson[] = [...LESSON_META.entries()]
  .map(([id, meta]) => ({ id, ...meta }))
  .sort((a, b) => a.title.localeCompare(b.title));

const lazyCache = new Map<string, ComponentType<Record<string, unknown>>>();

export function guidedLessonBody(id: string): ComponentType<Record<string, unknown>> | null {
  const loader = LESSON_LOADERS.get(id);
  if (!loader) return null;
  const cached = lazyCache.get(id);
  if (cached) return cached;
  const Lazy = lazy(async () => ({ default: (await loader()).default }));
  lazyCache.set(id, Lazy);
  return Lazy;
}
