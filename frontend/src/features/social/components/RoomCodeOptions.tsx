import { useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Link2, Ticket } from 'lucide-react';
import { useApiClient } from '@/shared/api/ApiProvider';
import { useSession } from '@/shared/session/SessionProvider';
import { UserAvatar } from '@/shared/ui/avatar/UserAvatar';
import { Button } from '@/shared/ui/Button';
import { createSocialApi } from '../api/socialApi';
import type { DiscoveryDraft } from '../model/schemas';
import { normalizeRoomCode, validRoomCode, roomError } from '../model/roomCode';
import '../styles/rooms.css';
export function RoomCodeOptions({ draft }: { draft?: DiscoveryDraft }) {
  const api = createSocialApi(useApiClient()),
    navigate = useNavigate(),
    cache = useQueryClient();
  const { session } = useSession();
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') === 'olustur' ? 'create' : 'join';
  const [group, setGroup] = useState('');
  const [input, setInput] = useState(params.get('kod') ?? '');
  const requestId = useRef<string | null>(null);
  const groups = useQuery({
    queryKey: ['social', 'groups'],
    queryFn: ({ signal }) => api.groups(signal),
    enabled: !!draft && tab === 'create',
  });
  const groupId = group || groups.data?.[0]?.id || '';
  const code = normalizeRoomCode(input);
  const create = useMutation({
    mutationFn: () => {
      if (!draft || !groupId) throw Error('Missing selection');
      requestId.current ??= crypto.randomUUID();
      return api.createRoom({
        clientRequestId: requestId.current,
        selection: {
          groupId,
          puzzleId: draft.puzzleId,
          subjectId: draft.subjectId,
          gradeLevel: draft.gradeLevel,
          topicId: draft.topicId,
        },
      });
    },
    onSuccess: (room) => {
      void cache.invalidateQueries({ queryKey: ['social', 'active'] });
      navigate('/kesif/oda/' + room.id + '/paylas');
    },
  });
  const join = useMutation({
    mutationFn: () => api.joinRoom(code),
    onSuccess: (room) => {
      void cache.invalidateQueries({ queryKey: ['social', 'active'] });
      navigate('/kesif/lobi/' + room.id);
    },
  });
  const busy = create.isPending || join.isPending;
  return (
    <section className="room-code-page">
      <div className="reference-heading">
        <span className="room-step">3</span>
        <h1>Kod / Link Seçimi</h1>
      </div>
      <h2>Oda Oluştur veya Katıl</h2>
      <p className="room-muted">Arkadaşınla birlikte oynamak için bir yöntem seç.</p>
      <div className="room-tabs">
        <button
          aria-label="Oda oluşturma seçeneği"
          aria-pressed={tab === 'create'}
          disabled={busy}
          onClick={() => setParams({ tab: 'olustur' }, { state: draft })}
        >
          Oda Oluştur
        </button>
        <button
          aria-label="Odaya katılma seçeneği"
          aria-pressed={tab === 'join'}
          disabled={busy}
          onClick={() => setParams({ tab: 'katil' }, { state: draft })}
        >
          Odaya Katıl
        </button>
      </div>
      {tab === 'create' ? (
        draft ? (
          <div className="room-create-grid">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (groupId && !busy) create.mutate();
              }}
            >
              <h3>Oda Oluştur</h3>
              <p className="room-muted">
                Sana özel bir oda kodu oluştur. Aynı Butik grubundan arkadaşın bu kodla katılabilir.
              </p>
              <div className="room-selection">
                {draft.puzzleTitle}
                <small>
                  {draft.gradeLevel}. Sınıf · {draft.subjectName} · {draft.topicName}
                </small>
              </div>
              <label>
                Butik Grubu
                <select
                  value={groupId}
                  disabled={busy || !groups.isSuccess}
                  onChange={(e) => {
                    setGroup(e.target.value);
                    requestId.current = null;
                    create.reset();
                  }}
                >
                  {groups.data?.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </label>
              {groups.isPending && <p role="status">Gruplar yükleniyor…</p>}
              {groups.isError && (
                <p role="alert">
                  Gruplar yüklenemedi.{' '}
                  <Button variant="text" onClick={() => void groups.refetch()}>
                    Tekrar dene
                  </Button>
                </p>
              )}
              {groups.isSuccess && !groups.data.length && (
                <p>Oda oluşturmak için bir Butik grubuna katılmalısın.</p>
              )}
              {create.isError && <p role="alert">{roomError(create.error)}</p>}
              <Button endArrow type="submit" busy={busy} disabled={!groupId || !groups.isSuccess}>
                Oda Oluştur
              </Button>
            </form>
            <aside className="room-link-art">
              <Link2 size={60} />
              <h3>Davet Linkini Paylaş</h3>
              <p>Odan hazır olduğunda kodunu veya bağlantısını kopyalayıp arkadaşınla paylaş.</p>
            </aside>
          </div>
        ) : (
          <p>
            Oda oluşturmak için önce bir görev ve ders seç. <Link to="/kesif">Keşiflere dön →</Link>
          </p>
        )
      ) : (
        <form
          className="room-join-form"
          onSubmit={(e) => {
            e.preventDefault();
            if (validRoomCode(code) && !busy) join.mutate();
          }}
        >
          <div className="room-join-art">
            <UserAvatar identity={session?.user.externalUserId} />
            <Ticket size={35} />
          </div>
          <h2>Oda Kodunu Gir</h2>
          <p className="room-muted">Arkadaşının paylaştığı kodu veya davet linkini kullan.</p>
          <label>
            Oda Kodu veya Davet Linki
            <input
              autoComplete="off"
              spellCheck={false}
              value={input}
              disabled={busy}
              placeholder="8 karakterli oda kodu"
              onChange={(e) => {
                setInput(e.target.value);
                join.reset();
              }}
            />
          </label>
          {input && !validRoomCode(code) && (
            <p className="room-muted">Geçerli bir davet linki veya 8 karakterli oda kodu gir.</p>
          )}
          {join.isError && <p role="alert">{roomError(join.error)}</p>}
          <Button endArrow type="submit" disabled={!validRoomCode(code)} busy={busy}>
            Odaya Katıl
          </Button>
        </form>
      )}
      <Link className="settings-back" to="/kesif">
        <ArrowLeft aria-hidden="true" />
        Keşiflere dön
      </Link>
    </section>
  );
}
