import { WaitingInvitation } from './WaitingInvitation';
import { useState, useRef } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Search, Users, CheckCircle2 } from 'lucide-react';
import { useApiClient } from '@/shared/api/ApiProvider';
import { useSession } from '@/shared/session/SessionProvider';
import { UserAvatar } from '@/shared/ui/avatar/UserAvatar';
import { Button } from '@/shared/ui/Button';
import { createSocialApi } from '../api/socialApi';
import type { DiscoveryDraft } from '../model/schemas';
import '../styles/social.css';
export function FriendSelection({ draft }: { draft: DiscoveryDraft }) {
  const api = createSocialApi(useApiClient());
  const { session } = useSession();
  const [group, setGroup] = useState('');
  const [friend, setFriend] = useState('');
  const [search, setSearch] = useState('');
  const requestId = useRef<string | null>(null);
  const groups = useQuery({
    queryKey: ['social', 'groups'],
    queryFn: ({ signal }) => api.groups(signal),
  });
  const groupId = group || groups.data?.[0]?.id || '';
  const friends = useQuery({
    queryKey: ['social', 'friends', groupId],
    queryFn: ({ signal }) => api.friends(groupId, signal),
    enabled: !!groupId,
  });
  const selected = friends.data?.find(
    (item) =>
      item.externalUserId === friend && item.externalUserId !== session?.user.externalUserId,
  );
  const invite = useMutation({
    mutationFn: () => {
      requestId.current ??= crypto.randomUUID();
      return api.invite({
        clientRequestId: requestId.current,
        selection: {
          groupId,
          puzzleId: draft.puzzleId,
          gradeLevel: draft.gradeLevel,
          subjectId: draft.subjectId,
          topicId: draft.topicId,
        },
        inviteeExternalUserId: friend,
      });
    },
  });
  const cancel = useMutation({
    mutationFn: () => api.cancel(invite.data!.id),
    onSuccess: () => {
      invite.reset();
      requestId.current = null;
      setFriend('');
    },
  });
  if (invite.isSuccess)
    return (
      <WaitingInvitation
        roomId={invite.data.roomId}
        friend={selected}
        discovery={{
          title: draft.puzzleTitle,
          grade: draft.gradeLevel,
          subject: draft.subjectName,
        }}
        onCancel={() => cancel.mutate()}
        cancelling={cancel.isPending}
        cancelError={cancel.isError}
      />
    );
  return (
    <section className="friend-selection">
      <p className="friend-note">Butik grubundan bir arkadaşını seç.</p>
      <div className="friend-selection-summary">
        {draft.puzzleTitle} · {draft.gradeLevel}. Sınıf · {draft.subjectName} · {draft.topicName}
      </div>
      {groups.isPending && <p role="status">Gruplar yükleniyor…</p>}
      {groups.isError && (
        <div role="alert">
          Gruplar yüklenemedi.{' '}
          <Button variant="text" onClick={() => void groups.refetch()}>
            Tekrar dene
          </Button>
        </div>
      )}
      {groups.isSuccess && groups.data.length === 0 && <p>Henüz bir Butik grubun bulunmuyor.</p>}
      {!!groups.data?.length && (
        <>
          <label className="group-label">
            <Users size={18} />
            Butik Grubu
            <select
              aria-label="Butik Grubu"
              value={groupId}
              disabled={invite.isPending}
              onChange={(e) => {
                setGroup(e.target.value);
                setFriend('');
                requestId.current = null;
              }}
            >
              {groups.data.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name} · {item.memberCount} üye
                </option>
              ))}
            </select>
          </label>
          <label className="friend-search">
            <Search size={17} />
            <input
              aria-label="Arkadaş ara"
              placeholder="Arkadaş ara…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>
        </>
      )}
      {groupId && friends.isPending && <p role="status">Arkadaşlar yükleniyor…</p>}
      {friends.isError && (
        <div role="alert">
          Arkadaşlar yüklenemedi.{' '}
          <Button variant="text" onClick={() => void friends.refetch()}>
            Tekrar dene
          </Button>
        </div>
      )}
      <div className="friend-list" role="radiogroup" aria-label="Oyun arkadaşın">
        {friends.data
          ?.filter(
            (item) =>
              item.externalUserId !== session?.user.externalUserId &&
              item.displayName.toLocaleLowerCase('tr').includes(search.toLocaleLowerCase('tr')),
          )
          .map((item) => (
            <label
              className={'friend-row ' + (friend === item.externalUserId ? 'selected' : '')}
              key={item.externalUserId}
            >
              <UserAvatar identity={item.externalUserId} />
              <strong>{item.displayName}</strong>
              <input
                type="radio"
                name="friend"
                value={item.externalUserId}
                checked={friend === item.externalUserId}
                disabled={invite.isPending}
                onChange={() => {
                  setFriend(item.externalUserId);
                  requestId.current = null;
                  invite.reset();
                }}
              />
              {friend === item.externalUserId && <CheckCircle2 size={19} aria-hidden="true" />}
            </label>
          ))}
      </div>
      {friends.isSuccess &&
        !friends.data.some(
          (item) =>
            item.externalUserId !== session?.user.externalUserId &&
            item.displayName.toLocaleLowerCase('tr').includes(search.toLocaleLowerCase('tr')),
        ) && <p>Bu aramaya uygun arkadaş bulunamadı.</p>}
      {invite.isError && (
        <p role="alert">Davet gönderilemedi. Seçimini ve mevcut odanı kontrol edip tekrar dene.</p>
      )}
      <Button
        endArrow
        className="settings-continue"
        disabled={!selected || !friends.isSuccess || !groups.isSuccess}
        busy={invite.isPending}
        onClick={() => invite.mutate()}
      >
        Oyun Daveti Gönder
      </Button>
    </section>
  );
}
