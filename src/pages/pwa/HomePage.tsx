import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Calendar, MapPin, BookOpen, Plus, Heart, CalendarDays, ArrowRight, Youtube } from 'lucide-react';
import { type Event, type Announcement } from '@/integrations/supabase/types';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

// --- CONFIGURAÇÃO DO YOUTUBE ---
// IMPORTANTE: Substitua pela sua Chave de API do YouTube.
const YOUTUBE_API_KEY = 'AIzaSyAI6ElLWG73MlKLlQey48z6Di7xnm7IoII'; 
// ID do canal do Ministério da Fé
const YOUTUBE_CHANNEL_ID = 'UC2_epYhGE1zrwFY2dw69H6Q'; 

type YouTubeVideo = {
  id: { videoId: string; };
  snippet: { title: string; description: string; thumbnails: { high: { url: string; }; }; };
};

const QuickActionButton = ({ icon: Icon, label, to }: { icon: React.ElementType, label: string, to: string }) => (
  <Link to={to} className="flex flex-col items-center gap-2 text-center">
    <div className="bg-gray-800/80 backdrop-blur-sm rounded-full h-16 w-16 flex items-center justify-center">
      <Icon className="h-7 w-7 text-white" />
    </div>
    <span className="text-sm font-medium">{label}</span>
  </Link>
);

const HomePage = () => {
  const { user } = useAuth();

  // --- BUSCA ATUALIZADA: Eventos Visíveis ---
  const { data: events, isLoading: isLoadingEvents } = useQuery<Event[]>({
    queryKey: ['visible_future_events', user?.id],
    queryFn: async () => {
      // Obtenha o ID do usuário e os IDs dos grupos (você precisará implementar isso)
      const userId = user?.id || null; // Assumindo que 'user' vem do seu contexto de autenticação
      const userGroupIds = await getUserGroupIds(userId); // Função para obter IDs dos grupos do usuário

      // Chama a função PostgreSQL para obter apenas os eventos visíveis
      const { data, error } = await supabase.rpc('get_visible_events', {
        user_id: userId, // Passe o ID do usuário
        user_group_ids: userGroupIds, // Passe os IDs dos grupos
      });

      if (error) {
        console.error("Error fetching visible events:", error);
        throw new Error(error.message);
      }
      // Limita o resultado a 3 na home page (a função AGORA filtra por visibilidade e grupos,
      // você pode adicionar filtro por data na função SQL também)
      return (data || []).slice(0, 3);
    },
    // CORREÇÃO: A busca só será executada QUANDO a verificação de auth terminar (se aplicável)
    // Se user?.id é suficiente para determinar se o usuário está logado, a queryKey já lida com isso.
    // Se você tiver um estado isLoading de autenticação separado, pode usar 'enabled' aqui.
    // enabled: !isAuthLoading, // Exemplo: descomente se tiver um isAuthLoading
  });

// Exemplo de função para obter IDs dos grupos do usuário (você precisará implementar a lógica real)
async function getUserGroupIds(userId: string | null): Promise<string[]> {
  if (!userId) {
    return []; // Retorna array vazio se usuário não estiver logado
  }
  // Implemente a lógica para buscar os IDs dos grupos do usuário logado
  // Isso provavelmente envolverá outra query ao Supabase para uma tabela de associação de usuários e grupos
  const { data, error } = await supabase.from('user_groups').select('group_id').eq('user_id', userId);

  if (error) {
    console.error('Erro ao buscar grupos do usuário:', error);
    return [];
  }

  return data?.map(item => item.group_id) || [];
}


  // Busca por anúncios
  const { data: announcements, isLoading: isLoadingAnnouncements } = useQuery<Announcement[]>({
    queryKey: ['announcements'],
    queryFn: async () => {
      const { data, error } = await supabase.from('announcements').select('*').order('created_at', { ascending: false }).limit(5);
      if (error) throw new Error(error.message);
      return data || [];
    },
  });

  // --- BUSCA: Vídeos do YouTube ---
  const { data: videos, isLoading: isLoadingVideos, error: videosError } = useQuery<YouTubeVideo[]>({
    queryKey: ['youtube_videos'],
    queryFn: async () => {
        if (YOUTUBE_API_KEY === 'COLE_SUA_CHAVE_DE_API_AQUI') {
            console.warn("Chave de API do YouTube não configurada. A busca de vídeos foi ignorada.");
            return [];
        }
        const response = await fetch(`https://www.googleapis.com/youtube/v3/search?key=${YOUTUBE_API_KEY}&channelId=${YOUTUBE_CHANNEL_ID}&part=snippet,id&order=date&maxResults=5&type=video`);
        if (!response.ok) {
            throw new Error('Falha ao buscar vídeos do YouTube. Verifique sua chave de API.');
        }
        const data = await response.json();
        return data.items || [];
    },
    staleTime: 1000 * 60 * 60,
  });

  const formatEventDateTime = (dateTimeString: string) => {
    return new Date(dateTimeString).toLocaleString('pt-BR', {
      weekday: 'long', day: '2-digit', month: 'long', hour: '2-digit', minute: '2-digit',
    });
  };

  return (
    <div className="pb-8 pt-6 space-y-10">
      <header className="h-48 mx-4 bg-neutral-800 rounded-2xl p-4 flex flex-col justify-end shadow-2xl relative overflow-hidden">
        <img src="https://i.imgur.com/oI0GTcD.png" alt="Banner principal" className="absolute top-0 left-0 w-full h-full object-cover opacity-30" />
        <div className="relative z-10 text-white">
            <h1 className="text-3xl font-bold">Ministério da Fé</h1>
            <p className="text-sm text-neutral-300">Sinop</p>
        </div>
      </header>

      <div className="grid grid-cols-4 gap-4 px-4 -mt-16 relative z-20">
         <QuickActionButton icon={BookOpen} label="Bíblia" to="/app/biblia" />
         <QuickActionButton icon={Plus} label="Pedido de Oração" to="#" />
         <QuickActionButton icon={Heart} label="Envolva-se" to="#" />
         <QuickActionButton icon={CalendarDays} label="Horários" to="#" />
      </div>

      <div className="px-4 space-y-8 -mt-6">
        <section>
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-xl font-bold">Notícias</h2>
            <Link to="/app/announcements" className="text-sm font-semibold text-blue-400 flex items-center gap-1">Ver todos <ArrowRight className="h-4 w-4" /></Link>
          </div>
          {isLoadingAnnouncements ? (
            <div className="space-y-4"><Skeleton className="h-28 w-full rounded-lg" /></div>
          ) : announcements && announcements.length > 0 ? (
            <div className="flex space-x-4 overflow-x-auto pb-4">
               {announcements.map((announcement) => (
                <div key={announcement.id} className="flex-shrink-0 w-80">
                <Link key={announcement.id} to={`/app/announcement/${announcement.id}`}>
                  <Card className="relative overflow-hidden text-white bg-cover bg-center shadow-lg border-0 rounded-xl" style={{ backgroundImage: `linear-gradient(to top, rgba(0, 0, 0, 0.8), rgba(0, 0, 0, 0.2)), url(${announcement.image_url || 'https://placehold.co/600x400/334155/ffffff?text=Notícia'})`, minHeight: '160px' }}>
                    <div className="p-4 flex flex-col justify-end h-full"><CardTitle className="text-lg font-bold drop-shadow-md">{announcement.title}</CardTitle><CardDescription className="text-gray-200 text-sm mt-1 line-clamp-2 drop-shadow-md">{announcement.content}</CardDescription></div>
                  </Card>
                </Link>
                </div>
              ))}
            </div>
          ) : ( <p className="text-sm text-muted-foreground">Nenhuma notícia recente.</p> )}
        </section>
        
        <section>
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-xl font-bold">Agenda</h2>
             <Link to="#" className="text-sm font-semibold text-blue-400 flex items-center gap-1">Ver todos <ArrowRight className="h-4 w-4" /></Link>
          </div>
          {isLoadingEvents ? (
            <div className="space-y-4"><Skeleton className="h-36 w-full rounded-lg" /></div>
          ) : events && events.length > 0 ? (
            <div className="space-y-4">
              {events.map((event) => (
                <Card key={event.id} className="relative overflow-hidden text-white bg-cover bg-center shadow-lg border-0 rounded-xl" style={{ backgroundImage: `linear-gradient(to top, rgba(0, 0, 0, 0.8), rgba(0, 0, 0, 0.2)), url(${event.image_url || 'https://placehold.co/600x400/334155/ffffff?text=Evento'})`, minHeight: '180px' }}>
                  <div className="p-4 flex flex-col justify-end h-full"><CardTitle className="text-xl font-bold drop-shadow-md">{event.title}</CardTitle>{event.description && <CardDescription className="text-gray-200 text-sm mt-1 drop-shadow-md">{event.description}</CardDescription>}<div className="mt-3 text-xs text-gray-100 space-y-1 font-medium"><div className="flex items-center gap-2"><Calendar className="h-4 w-4" /><span>{formatEventDateTime(event.start_time)}</span></div>{event.location && (<div className="flex items-center gap-2"><MapPin className="h-4 w-4" /><span>{event.location}</span></div>)}</div></div>
                </Card>
              ))}
            </div>
          ) : ( <p className="text-sm text-muted-foreground">Nenhum evento agendado no momento.</p> )}
        </section>

        <section>
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-xl font-bold">Vídeos</h2>
            <a href={`https://www.youtube.com/channel/${YOUTUBE_CHANNEL_ID}`} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-blue-400 flex items-center gap-1">Ver todos <ArrowRight className="h-4 w-4" /></a>
          </div>
          {isLoadingVideos ? (
            <div className="flex space-x-4 overflow-x-auto pb-4"><Skeleton className="h-40 w-64 rounded-lg flex-shrink-0" /><Skeleton className="h-40 w-64 rounded-lg flex-shrink-0" /></div>
          ) : videosError ? (
            <Alert variant="destructive"><AlertTitle>Erro</AlertTitle><AlertDescription>Não foi possível carregar os vídeos.</AlertDescription></Alert>
          ) : videos && videos.length > 0 ? (
            <div className="flex space-x-4 overflow-x-auto pb-4 -mx-4 px-4">
              {videos.map((video) => (
                <a key={video.id.videoId} href={`https://www.youtube.com/watch?v=${video.id.videoId}`} target="_blank" rel="noopener noreferrer" className="block w-64 flex-shrink-0">
                  <div className="rounded-lg overflow-hidden shadow-lg">
                    <img src={video.snippet.thumbnails.high.url} alt={video.snippet.title} className="w-full h-36 object-cover" />
                    <div className="p-3 bg-gray-800"><p className="text-sm font-semibold text-white truncate">{video.snippet.title}</p></div>
                  </div>
                </a>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Nenhum vídeo recente.</p>
          )}
        </section>

        <section>
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-xl font-bold">Estudos</h2>
            <Link to="#" className="text-sm font-semibold text-blue-400 flex items-center gap-1">Ver todos <ArrowRight className="h-4 w-4" /></Link>
          </div>
          <p className="text-sm text-muted-foreground">Nenhum estudo recente.</p>
        </section>

      </div>
    </div>
  );
};

export default HomePage;
