// House handbooks ("Supported Living Handbook") offered as downloads on each home profile.
//
// The PDFs live in Supabase Storage, in a public bucket called `house-guides`.
// A download only appears when NEXT_PUBLIC_HOUSE_GUIDES_URL is set to the bucket's
// public base URL, so no button shows before the files are uploaded:
//   https://<project-ref>.supabase.co/storage/v1/object/public/house-guides
//
// Size and review date come from each handbook's cover page. Emerald House has
// no handbook yet, so it has no entry. See supabase-house-guides.sql and
// assets/3-documentos-pearl/casas/handbooks-web/ for the files and bucket setup.

export type HomeGuide = {
  /** File name inside the bucket. */
  file: string;
  /** Approximate size shown to visitors. */
  size: string;
  /** "Reviewed date" from the handbook cover. */
  reviewed: string;
};

export const homeGuides: Record<string, HomeGuide> = {
  crimsworth: { file: 'sapphire-house-handbook.pdf', size: '18 MB', reviewed: '1 October 2026' },
  coulsdon: { file: 'garnet-house-handbook.pdf', size: '14 MB', reviewed: '1 October 2026' },
  heathfields: { file: 'ruby-house-handbook.pdf', size: '17 MB', reviewed: '1 October 2026' },
  'friday-road': { file: 'onyx-house-handbook.pdf', size: '14 MB', reviewed: '2 November 2026' },
};

/** The guide for a home with its download URL, or null when there is none to offer yet. */
export function guideFor(slug: string) {
  const base = process.env.NEXT_PUBLIC_HOUSE_GUIDES_URL;
  const guide = homeGuides[slug];
  if (!base || !guide) return null;
  // `?download=` asks Supabase to send the file as an attachment.
  const url = `${base.replace(/\/$/, '')}/${guide.file}?download=${encodeURIComponent(guide.file)}`;
  return { ...guide, url };
}
