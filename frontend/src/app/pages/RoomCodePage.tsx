import { useLocation } from 'react-router-dom';
import { useSession } from '@/shared/session/SessionProvider';
import { draftSchema } from '@/features/social/model/schemas';
import { RoomCodeOptions } from '@/features/social/components/RoomCodeOptions';
export default function RoomCodePage() {
  const location = useLocation();
  const { session } = useSession();
  const draft = draftSchema.safeParse(location.state);
  return (
    <RoomCodeOptions
      key={session?.user.id + location.key}
      draft={draft.success && draft.data.ownerId === session?.user.id ? draft.data : undefined}
    />
  );
}
