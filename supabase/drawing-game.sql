-- Run this script once in Supabase SQL Editor. The anon key is safe to use in
-- the browser because table access is revoked and reads/writes use these RPCs.
create extension if not exists pgcrypto;

create table if not exists public.drawing_rooms (
  id uuid primary key default gen_random_uuid(), created_at timestamptz not null default now()
);
create table if not exists public.drawing_player_prompts (
  room_id uuid not null references public.drawing_rooms(id) on delete cascade, player_id uuid not null,
  keyword text not null, primary key(room_id, player_id)
);
create table if not exists public.drawing_artworks (
  id uuid primary key default gen_random_uuid(), room_id uuid not null references public.drawing_rooms(id) on delete cascade,
  player_id uuid not null, player_name text not null, keyword text not null, image_data text not null,
  created_at timestamptz not null default now(), unique(room_id, player_id)
);
create table if not exists public.drawing_guesses (
  id uuid primary key default gen_random_uuid(), artwork_id uuid not null references public.drawing_artworks(id) on delete cascade,
  player_id uuid not null, player_name text not null, guess text not null default '', correct boolean not null default false,
  gave_up boolean not null default false, created_at timestamptz not null default now(), unique(artwork_id, player_id)
);
create table if not exists public.drawing_reactions (
  artwork_id uuid not null references public.drawing_artworks(id) on delete cascade, player_id uuid not null,
  reaction smallint not null check (reaction in (-1, 1)), primary key(artwork_id, player_id)
);
alter table public.drawing_rooms enable row level security;
alter table public.drawing_player_prompts enable row level security;
alter table public.drawing_artworks enable row level security;
alter table public.drawing_guesses enable row level security;
alter table public.drawing_reactions enable row level security;
revoke all on public.drawing_rooms, public.drawing_player_prompts, public.drawing_artworks, public.drawing_guesses, public.drawing_reactions from anon, authenticated;

create or replace function public.create_drawing_room(p_player_name text)
returns uuid language plpgsql security definer set search_path = public as $$
declare new_room uuid;
begin
  if length(trim(p_player_name)) not between 1 and 16 then raise exception 'invalid player name'; end if;
  insert into drawing_rooms default values returning id into new_room;
  return new_room;
end; $$;

create or replace function public.get_drawing_room(p_room_id uuid)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object('id', id, 'created_at', created_at) from drawing_rooms where id = p_room_id;
$$;

create or replace function public.get_own_drawing_prompt(p_room_id uuid, p_player_id uuid)
returns text language plpgsql volatile security definer set search_path = public as $$
declare chosen text; words text[] := array['冰箱里的最后一块蛋糕','周一早上的闹钟','迷路的外星人','老板画的饼','会飞的火锅','下班后的自由','一只社恐的猫','假装成熟的大人','迟到的奶茶','考试前的我','被窝封印','突然暴富的周末'];
begin
  if not exists (select 1 from drawing_rooms where id = p_room_id) then raise exception 'room not found'; end if;
  perform 1 from drawing_rooms where id = p_room_id for update;
  select keyword into chosen from drawing_player_prompts where room_id = p_room_id and player_id = p_player_id;
  if chosen is not null then return chosen; end if;
  select w.candidate into chosen from unnest(words) as w(candidate) where not exists
    (select 1 from drawing_player_prompts p where p.room_id = p_room_id and p.keyword = w.candidate)
    order by random() limit 1;
  if chosen is null then raise exception 'this round already has eight players'; end if;
  insert into drawing_player_prompts(room_id, player_id, keyword)
  values (p_room_id, p_player_id, chosen) on conflict do nothing;
  select keyword into chosen from drawing_player_prompts where room_id = p_room_id and player_id = p_player_id;
  return chosen;
end; $$;

create or replace function public.submit_drawing(p_room_id uuid, p_player_id uuid, p_player_name text, p_image text)
returns uuid language plpgsql security definer set search_path = public as $$
declare new_art uuid; own_word text;
begin
  if not exists (select 1 from drawing_rooms where id = p_room_id) then raise exception 'room not found'; end if;
  if length(trim(p_player_name)) not between 1 and 16 then raise exception 'invalid player name'; end if;
  if length(p_image) > 1400000 or p_image not like 'data:image/jpeg;base64,%' then raise exception 'invalid image'; end if;
  select keyword into own_word from drawing_player_prompts where room_id = p_room_id and player_id = p_player_id;
  if own_word is null then raise exception 'get your prompt first'; end if;
  insert into drawing_artworks(room_id, player_id, player_name, keyword, image_data) values (p_room_id, p_player_id, trim(p_player_name), own_word, p_image) returning id into new_art;
  return new_art;
end; $$;

create or replace function public.get_drawing_feed(p_room_id uuid, p_player_id uuid)
returns jsonb language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', a.id, 'image', a.image_data, 'created_at', a.created_at,
    'revealed', (a.player_id = p_player_id or exists (select 1 from drawing_guesses g where g.artwork_id = a.id and g.player_id = p_player_id and (g.correct or g.gave_up))),
    'keyword', case when (a.player_id = p_player_id or exists (select 1 from drawing_guesses g where g.artwork_id = a.id and g.player_id = p_player_id and (g.correct or g.gave_up))) then a.keyword else null end,
    'hint_length', char_length(regexp_replace(a.keyword, '[[:space:]]', '', 'g')),
    'is_mine', a.player_id = p_player_id,
    'artist', case when (a.player_id = p_player_id or exists (select 1 from drawing_guesses g where g.artwork_id = a.id and g.player_id = p_player_id and (g.correct or g.gave_up))) then a.player_name else null end,
    'attempts', (select count(*) from drawing_guesses g where g.artwork_id = a.id),
    'correct', (select count(*) from drawing_guesses g where g.artwork_id = a.id and g.correct),
    'gave_up', (select count(*) from drawing_guesses g where g.artwork_id = a.id and g.gave_up),
    'likes', (select count(*) from drawing_reactions r where r.artwork_id = a.id and r.reaction = 1),
    'dislikes', (select count(*) from drawing_reactions r where r.artwork_id = a.id and r.reaction = -1),
    'my_guess', (select case when g.gave_up then '' else g.guess end from drawing_guesses g where g.artwork_id = a.id and g.player_id = p_player_id),
    'my_correct', coalesce((select g.correct from drawing_guesses g where g.artwork_id = a.id and g.player_id = p_player_id), false),
    'my_reaction', coalesce((select r.reaction from drawing_reactions r where r.artwork_id = a.id and r.player_id = p_player_id), 0)
  ) order by a.created_at desc), '[]'::jsonb) from drawing_artworks a where a.room_id = p_room_id;
$$;

create or replace function public.submit_drawing_guess(p_artwork_id uuid, p_player_id uuid, p_player_name text, p_guess text, p_give_up boolean)
returns jsonb language plpgsql security definer set search_path = public as $$
declare art drawing_artworks%rowtype; answer text; normalized text; already drawing_guesses%rowtype;
begin
  select * into art from drawing_artworks where id = p_artwork_id;
  if not found then raise exception 'artwork not found'; end if;
  if art.player_id = p_player_id then raise exception 'cannot guess own drawing'; end if;
  select * into already from drawing_guesses where artwork_id = p_artwork_id and player_id = p_player_id;
  if found then
    if p_give_up and not already.correct and not already.gave_up then update drawing_guesses set gave_up = true where id = already.id; end if;
  elsif p_give_up then
    insert into drawing_guesses(artwork_id, player_id, player_name, guess, gave_up) values (p_artwork_id, p_player_id, left(trim(p_player_name),16), '', true);
  else
    answer := art.keyword;
    normalized := lower(regexp_replace(trim(coalesce(p_guess,'')), '[[:space:][:punct:]]', '', 'g'));
    if normalized = '' then raise exception 'empty guess'; end if;
    insert into drawing_guesses(artwork_id, player_id, player_name, guess, correct)
    values (p_artwork_id, p_player_id, left(trim(p_player_name),16), left(trim(p_guess),40), normalized = lower(regexp_replace(trim(answer), '[[:space:][:punct:]]', '', 'g')));
  end if;
  return jsonb_build_object('ok', true);
end; $$;

create or replace function public.react_to_drawing(p_artwork_id uuid, p_player_id uuid, p_reaction smallint)
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  if p_reaction not in (-1,0,1) then raise exception 'invalid reaction'; end if;
  if not exists (select 1 from drawing_artworks a where a.id = p_artwork_id and a.player_id <> p_player_id and exists (select 1 from drawing_guesses g where g.artwork_id = a.id and g.player_id = p_player_id and (g.correct or g.gave_up))) then raise exception 'reveal the drawing first'; end if;
  if p_reaction = 0 then delete from drawing_reactions where artwork_id = p_artwork_id and player_id = p_player_id;
  else insert into drawing_reactions(artwork_id, player_id, reaction) values (p_artwork_id, p_player_id, p_reaction) on conflict (artwork_id, player_id) do update set reaction = excluded.reaction; end if;
  return jsonb_build_object('ok', true);
end; $$;

revoke all on function public.create_drawing_room(text), public.get_drawing_room(uuid), public.get_own_drawing_prompt(uuid,uuid), public.submit_drawing(uuid,uuid,text,text), public.get_drawing_feed(uuid,uuid), public.submit_drawing_guess(uuid,uuid,text,text,boolean), public.react_to_drawing(uuid,uuid,smallint) from public;
grant execute on function public.create_drawing_room(text), public.get_drawing_room(uuid), public.get_own_drawing_prompt(uuid,uuid), public.submit_drawing(uuid,uuid,text,text), public.get_drawing_feed(uuid,uuid), public.submit_drawing_guess(uuid,uuid,text,text,boolean), public.react_to_drawing(uuid,uuid,smallint) to anon, authenticated;
