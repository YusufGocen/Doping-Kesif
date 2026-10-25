import { useOutletContext } from 'react-router-dom';
import type { DashboardOutletContext } from '@/layouts/dashboard/types';
import DiscoveryHomePage from '@/features/discovery/pages/DiscoveryHomePage';
import { DiscoveryShortcuts } from '@/features/discovery/components/DiscoveryShortcuts';
import { DiscoveryGuide } from '@/features/discovery/components/DiscoveryGuide';
import { PuzzleGallery } from '@/features/catalog/components/PuzzleGallery';
export default function DiscoveryEntryPage() {
  const { openHelp } = useOutletContext<DashboardOutletContext>();
  return (
    <DiscoveryHomePage>
      <DiscoveryShortcuts />
      <PuzzleGallery />
      <DiscoveryGuide onOpenHelp={openHelp} />
    </DiscoveryHomePage>
  );
}
