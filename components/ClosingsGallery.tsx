import { getClosings } from "@/lib/closingsLoader";
import { getSection } from "@/lib/contentLoader";
import ClosingsGalleryClient from "@/components/ClosingsGalleryClient";

type ClosingsTeaser = {
  eyebrow: string;
  heading: string;
  subtitle: string;
  cta?: { label: string; href: string };
};

export default async function ClosingsGallery({
  preview = false,
}: {
  preview?: boolean;
}) {
  const [items, c] = await Promise.all([
    getClosings(),
    getSection<ClosingsTeaser>("home", "closingsTeaser"),
  ]);
  return <ClosingsGalleryClient items={items} content={c} preview={preview} />;
}
