import { getHero } from '@/lib/content/read';
import { HeroEditor } from './HeroEditor';

export default async function AdminHeroPage() {
  const hero = await getHero();
  return <HeroEditor initial={hero} />;
}
