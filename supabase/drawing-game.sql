-- Global plaza migration. Run once in the Supabase SQL Editor.
-- Existing room artwork, guesses, and reactions are copied into the shared plaza.

create extension if not exists pgcrypto;

create table if not exists public.drawing_global_keywords (
  keyword text primary key
);

insert into public.drawing_global_keywords(keyword) values
  ('钥匙'), ('雨伞'), ('冰箱'), ('牙刷'), ('书包'), ('杯子'), ('眼镜'), ('鞋子'), ('台灯'), ('闹钟'),
  ('沙发'), ('枕头'), ('被子'), ('镜子'), ('梳子'), ('电梯'), ('地铁'), ('自行车'), ('汽车'), ('飞机'),
  ('火车'), ('雨衣'), ('帽子'), ('口罩'), ('手机'), ('电脑'), ('键盘'), ('鼠标'), ('相机'), ('手表'),
  ('耳机'), ('充电器'), ('插座'), ('电风扇'), ('空调'), ('电饭煲'), ('锅'), ('碗'), ('筷子'), ('勺子'),
  ('面包'), ('饺子'), ('火锅'), ('奶茶'), ('咖啡'), ('苹果'), ('西瓜'), ('香蕉'), ('蛋糕'), ('冰淇淋'),
  ('显眼包'), ('松弛感'), ('内卷'), ('躺平'), ('摸鱼'), ('社恐'), ('社牛'), ('破防'), ('上头'), ('下头'),
  ('种草'), ('拔草'), ('吃瓜'), ('甩锅'), ('摆烂'), ('逆袭'), ('绝绝子'), ('栓Q'), ('班味'), ('淡人'),
  ('浓人'), ('多巴胺'), ('情绪价值'), ('显化'), ('搭子'), ('画龙点睛'), ('守株待兔'), ('亡羊补牢'), ('井底之蛙'), ('叶公好龙'),
  ('滥竽充数'), ('掩耳盗铃'), ('狐假虎威'), ('一鸣惊人'), ('胸有成竹'), ('望梅止渴'), ('刻舟求剑'), ('对牛弹琴'), ('雪中送炭'), ('画蛇添足'),
  ('盲人摸象'), ('鸡飞狗跳'), ('一箭双雕'), ('四面楚歌'), ('百发百中'), ('走马观花'), ('南辕北辙'), ('负荆请罪'), ('指鹿为马'), ('鱼目混珠')
on conflict (keyword) do nothing;

create table if not exists public.drawing_global_prompts (
  player_id uuid primary key,
  keyword text not null references public.drawing_global_keywords(keyword),
  consumed boolean not null default false,
  updated_at timestamptz not null default now()
);

create table if not exists public.drawing_global_artworks (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null,
  author_name text,
  keyword text not null,
  image_data text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.drawing_global_guesses (
  id uuid primary key default gen_random_uuid(),
  artwork_id uuid not null references public.drawing_global_artworks(id) on delete cascade,
  player_id uuid not null,
  player_name text not null default '朋友',
  guess text not null default '',
  correct boolean not null default false,
  gave_up boolean not null default false,
  created_at timestamptz not null default now(),
  unique(artwork_id, player_id)
);

create table if not exists public.drawing_global_reactions (
  artwork_id uuid not null references public.drawing_global_artworks(id) on delete cascade,
  player_id uuid not null,
  reaction smallint not null check (reaction in (-1, 1)),
  primary key(artwork_id, player_id)
);

-- Bring prior room drawings into the one plaza. Unknown old nicknames stay
-- unassigned until revealed; all new drawings must use one of the eight names.
insert into public.drawing_global_artworks(id, player_id, author_name, keyword, image_data, created_at)
select a.id, a.player_id,
       case when a.player_name in ('程思源','甘爽','姜霁宸','蔡羽晨','童佳一','贾子琪','徐帧念','张立欣') then a.player_name else null end,
       a.keyword, a.image_data, a.created_at
from public.drawing_artworks a
on conflict (id) do nothing;

insert into public.drawing_global_guesses(id, artwork_id, player_id, player_name, guess, correct, gave_up, created_at)
select g.id, g.artwork_id, g.player_id, g.player_name, g.guess, g.correct, g.gave_up, g.created_at
from public.drawing_guesses g
join public.drawing_global_artworks a on a.id = g.artwork_id
on conflict (id) do nothing;

insert into public.drawing_global_reactions(artwork_id, player_id, reaction)
select r.artwork_id, r.player_id, r.reaction
from public.drawing_reactions r
join public.drawing_global_artworks a on a.id = r.artwork_id
on conflict (artwork_id, player_id) do nothing;

alter table public.drawing_global_keywords enable row level security;
alter table public.drawing_global_prompts enable row level security;
alter table public.drawing_global_artworks enable row level security;
alter table public.drawing_global_guesses enable row level security;
alter table public.drawing_global_reactions enable row level security;
revoke all on public.drawing_global_keywords, public.drawing_global_prompts, public.drawing_global_artworks, public.drawing_global_guesses, public.drawing_global_reactions from anon, authenticated;

create or replace function public.get_global_drawing_prompt(p_player_id uuid)
returns text language plpgsql security definer set search_path = public, pg_temp as $$
declare chosen text;
begin
  if p_player_id is null then raise exception 'player id required'; end if;
  select keyword into chosen from drawing_global_prompts where player_id = p_player_id and not consumed;
  if chosen is not null then return chosen; end if;
  select keyword into chosen from drawing_global_keywords order by random() limit 1;
  insert into drawing_global_prompts(player_id, keyword, consumed, updated_at)
  values (p_player_id, chosen, false, now())
  on conflict (player_id) do update set keyword = excluded.keyword, consumed = false, updated_at = now();
  return chosen;
end; $$;

create or replace function public.submit_global_drawing(p_player_id uuid, p_author_name text, p_image text)
returns uuid language plpgsql security definer set search_path = public, pg_temp as $$
declare new_art uuid; own_word text;
begin
  if p_author_name not in ('程思源','甘爽','姜霁宸','蔡羽晨','童佳一','贾子琪','徐帧念','张立欣') then raise exception 'choose one of the eight friends'; end if;
  if length(p_image) > 1400000 or p_image not like 'data:image/jpeg;base64,%' then raise exception 'invalid image'; end if;
  select keyword into own_word from drawing_global_prompts where player_id = p_player_id and not consumed for update;
  if own_word is null then raise exception 'get your prompt first'; end if;
  insert into drawing_global_artworks(player_id, author_name, keyword, image_data)
  values (p_player_id, p_author_name, own_word, p_image) returning id into new_art;
  update drawing_global_prompts set consumed = true, updated_at = now() where player_id = p_player_id;
  return new_art;
end; $$;

create or replace function public.get_global_drawing_feed(p_player_id uuid)
returns jsonb language sql stable security definer set search_path = public, pg_temp as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', a.id, 'image', a.image_data, 'created_at', a.created_at,
    'revealed', (a.player_id = p_player_id or exists (select 1 from drawing_global_guesses g where g.artwork_id = a.id and g.player_id = p_player_id and (g.correct or g.gave_up))),
    'keyword', case when (a.player_id = p_player_id or exists (select 1 from drawing_global_guesses g where g.artwork_id = a.id and g.player_id = p_player_id and (g.correct or g.gave_up))) then a.keyword else null end,
    'hint_length', char_length(regexp_replace(a.keyword, '[[:space:]]', '', 'g')),
    'is_mine', a.player_id = p_player_id,
    'artist', case when (a.player_id = p_player_id or exists (select 1 from drawing_global_guesses g where g.artwork_id = a.id and g.player_id = p_player_id and (g.correct or g.gave_up))) then a.author_name else null end,
    'attempts', (select count(*) from drawing_global_guesses g where g.artwork_id = a.id),
    'correct', (select count(*) from drawing_global_guesses g where g.artwork_id = a.id and g.correct),
    'gave_up', (select count(*) from drawing_global_guesses g where g.artwork_id = a.id and g.gave_up),
    'likes', (select count(*) from drawing_global_reactions r where r.artwork_id = a.id and r.reaction = 1),
    'dislikes', (select count(*) from drawing_global_reactions r where r.artwork_id = a.id and r.reaction = -1),
    'my_guess', (select case when g.gave_up then '' else g.guess end from drawing_global_guesses g where g.artwork_id = a.id and g.player_id = p_player_id),
    'my_correct', coalesce((select g.correct from drawing_global_guesses g where g.artwork_id = a.id and g.player_id = p_player_id), false),
    'my_reaction', coalesce((select r.reaction from drawing_global_reactions r where r.artwork_id = a.id and r.player_id = p_player_id), 0)
  ) order by a.created_at desc), '[]'::jsonb) from drawing_global_artworks a;
$$;

create or replace function public.submit_global_drawing_guess(p_artwork_id uuid, p_player_id uuid, p_player_name text, p_guess text, p_give_up boolean)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare art drawing_global_artworks%rowtype; answer text; normalized text; already drawing_global_guesses%rowtype;
begin
  select * into art from drawing_global_artworks where id = p_artwork_id;
  if not found then raise exception 'artwork not found'; end if;
  if art.player_id = p_player_id then raise exception 'cannot guess own drawing'; end if;
  select * into already from drawing_global_guesses where artwork_id = p_artwork_id and player_id = p_player_id;
  if found then
    if p_give_up and not already.correct and not already.gave_up then update drawing_global_guesses set gave_up = true where id = already.id; end if;
  elsif p_give_up then
    insert into drawing_global_guesses(artwork_id, player_id, player_name, guess, gave_up) values (p_artwork_id, p_player_id, left(trim(coalesce(p_player_name,'朋友')),16), '', true);
  else
    answer := art.keyword;
    normalized := lower(regexp_replace(trim(coalesce(p_guess,'')), '[[:space:][:punct:]]', '', 'g'));
    if normalized = '' then raise exception 'empty guess'; end if;
    insert into drawing_global_guesses(artwork_id, player_id, player_name, guess, correct)
    values (p_artwork_id, p_player_id, left(trim(coalesce(p_player_name,'朋友')),16), left(trim(p_guess),40), normalized = lower(regexp_replace(trim(answer), '[[:space:][:punct:]]', '', 'g')));
  end if;
  return jsonb_build_object('ok', true);
end; $$;

create or replace function public.react_to_global_drawing(p_artwork_id uuid, p_player_id uuid, p_reaction smallint)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if p_reaction not in (-1,0,1) then raise exception 'invalid reaction'; end if;
  if not exists (select 1 from drawing_global_artworks a where a.id = p_artwork_id and a.player_id <> p_player_id and exists (select 1 from drawing_global_guesses g where g.artwork_id = a.id and g.player_id = p_player_id and (g.correct or g.gave_up))) then raise exception 'reveal the drawing first'; end if;
  if p_reaction = 0 then delete from drawing_global_reactions where artwork_id = p_artwork_id and player_id = p_player_id;
  else insert into drawing_global_reactions(artwork_id, player_id, reaction) values (p_artwork_id, p_player_id, p_reaction) on conflict (artwork_id, player_id) do update set reaction = excluded.reaction; end if;
  return jsonb_build_object('ok', true);
end; $$;

revoke all on function public.get_global_drawing_prompt(uuid), public.submit_global_drawing(uuid,text,text), public.get_global_drawing_feed(uuid), public.submit_global_drawing_guess(uuid,uuid,text,text,boolean), public.react_to_global_drawing(uuid,uuid,smallint) from public;
grant execute on function public.get_global_drawing_prompt(uuid), public.submit_global_drawing(uuid,text,text), public.get_global_drawing_feed(uuid), public.submit_global_drawing_guess(uuid,uuid,text,text,boolean), public.react_to_global_drawing(uuid,uuid,smallint) to anon, authenticated;
