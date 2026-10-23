-- Named player accounts, repeatable public guesses, coins, and comments.
-- Run once in the Supabase SQL Editor.

create table if not exists public.drawing_player_accounts (
  player_id uuid primary key,
  player_name text not null unique,
  xiba_coins integer not null default 0 check (xiba_coins >= 0)
);

insert into public.drawing_player_accounts(player_id, player_name) values
 ('11111111-1111-4111-8111-111111111111','程思源'),
 ('22222222-2222-4222-8222-222222222222','甘爽'),
 ('33333333-3333-4333-8333-333333333333','姜霁宸'),
 ('44444444-4444-4444-8444-444444444444','蔡羽晨'),
 ('55555555-5555-4555-8555-555555555555','童佳一'),
 ('66666666-6666-4666-8666-666666666666','贾子琪'),
 ('77777777-7777-4777-8777-777777777777','徐帧念'),
 ('88888888-8888-4888-8888-888888888888','张立欣')
on conflict (player_name) do nothing;

alter table public.drawing_global_guesses
  drop constraint if exists drawing_global_guesses_artwork_id_player_id_key;
alter table public.drawing_global_guesses
  add column if not exists attempt_number integer not null default 1;
with ranked as (
  select id, row_number() over (partition by artwork_id, player_id order by created_at, id) as n
  from public.drawing_global_guesses
)
update public.drawing_global_guesses g set attempt_number = ranked.n
from ranked where ranked.id = g.id;
create unique index if not exists drawing_global_guesses_one_correct_per_player
  on public.drawing_global_guesses(artwork_id, player_id) where correct;

create table if not exists public.drawing_global_comments (
  id uuid primary key default gen_random_uuid(),
  artwork_id uuid not null references public.drawing_global_artworks(id) on delete cascade,
  player_id uuid not null references public.drawing_player_accounts(player_id),
  player_name text not null,
  message text not null check (char_length(message) between 1 and 300),
  created_at timestamptz not null default now()
);

alter table public.drawing_player_accounts enable row level security;
alter table public.drawing_global_comments enable row level security;
revoke all on public.drawing_player_accounts, public.drawing_global_comments from anon, authenticated;

create or replace function public.get_global_drawing_profile(p_player_name text)
returns jsonb language sql stable security definer set search_path = public, pg_temp as $$
  select jsonb_build_object('player_id', player_id, 'player_name', player_name, 'xiba_coins', xiba_coins)
  from drawing_player_accounts where player_name = p_player_name;
$$;

create or replace function public.get_global_drawing_feed(p_player_id uuid)
returns jsonb language sql stable security definer set search_path = public, pg_temp as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', a.id, 'image', a.image_data, 'created_at', a.created_at,
    'revealed', exists (select 1 from drawing_global_guesses g where g.artwork_id = a.id and g.correct),
    'keyword', case when exists (select 1 from drawing_global_guesses g where g.artwork_id = a.id and g.correct) then a.keyword else null end,
    'hint_length', char_length(regexp_replace(a.keyword, '[[:space:]]', '', 'g')),
    'is_mine', a.player_id = p_player_id,
    'artist', case when exists (select 1 from drawing_global_guesses g where g.artwork_id = a.id and g.correct) then a.author_name else null end,
    'attempts', (select count(*) from drawing_global_guesses g where g.artwork_id = a.id),
    'correct', (select count(distinct g.player_id) from drawing_global_guesses g where g.artwork_id = a.id and g.correct),
    'gave_up', 0,
    'likes', (select count(*) from drawing_global_reactions r where r.artwork_id = a.id and r.reaction = 1),
    'dislikes', (select count(*) from drawing_global_reactions r where r.artwork_id = a.id and r.reaction = -1),
    'my_guess', (select g.guess from drawing_global_guesses g where g.artwork_id = a.id and g.player_id = p_player_id order by g.created_at desc limit 1),
    'my_correct', exists (select 1 from drawing_global_guesses g where g.artwork_id = a.id and g.player_id = p_player_id and g.correct),
    'my_reaction', coalesce((select r.reaction from drawing_global_reactions r where r.artwork_id = a.id and r.player_id = p_player_id), 0),
    'wrong_guesses', coalesce((select jsonb_agg(jsonb_build_object('player_name', g.player_name, 'guess', g.guess, 'attempt_number', g.attempt_number, 'created_at', g.created_at) order by g.created_at) from drawing_global_guesses g where g.artwork_id = a.id and not g.correct), '[]'::jsonb),
    'correct_guesses', coalesce((select jsonb_agg(jsonb_build_object('player_name', g.player_name, 'attempts', g.attempt_number, 'created_at', g.created_at) order by g.created_at) from drawing_global_guesses g where g.artwork_id = a.id and g.correct), '[]'::jsonb),
    'comments', coalesce((select jsonb_agg(jsonb_build_object('player_name', c.player_name, 'message', c.message, 'created_at', c.created_at) order by c.created_at) from drawing_global_comments c where c.artwork_id = a.id), '[]'::jsonb)
  ) order by a.created_at desc), '[]'::jsonb) from drawing_global_artworks a;
$$;

create or replace function public.submit_global_drawing(p_player_id uuid, p_author_name text, p_image text)
returns uuid language plpgsql security definer set search_path = public, pg_temp as $$
declare new_art uuid; own_word text;
begin
  if not exists (select 1 from drawing_player_accounts where player_id = p_player_id and player_name = p_author_name) then raise exception 'choose your account first'; end if;
  if length(p_image) > 1400000 or p_image not like 'data:image/jpeg;base64,%' then raise exception 'invalid image'; end if;
  select keyword into own_word from drawing_global_prompts where player_id = p_player_id and not consumed for update;
  if own_word is null then raise exception 'get your prompt first'; end if;
  insert into drawing_global_artworks(player_id, author_name, keyword, image_data) values (p_player_id, p_author_name, own_word, p_image) returning id into new_art;
  update drawing_global_prompts set consumed = true, updated_at = now() where player_id = p_player_id;
  return new_art;
end; $$;

create or replace function public.submit_global_drawing_guess(p_artwork_id uuid, p_player_id uuid, p_player_name text, p_guess text, p_give_up boolean default false)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare art drawing_global_artworks%rowtype; normalized text; next_attempt integer; is_right boolean;
begin
  if not exists (select 1 from drawing_player_accounts where player_id = p_player_id and player_name = p_player_name) then raise exception 'choose your account first'; end if;
  perform 1 from drawing_player_accounts where player_id = p_player_id for update;
  select * into art from drawing_global_artworks where id = p_artwork_id;
  if not found then raise exception 'artwork not found'; end if;
  if art.player_id = p_player_id then raise exception 'cannot guess own drawing'; end if;
  if exists (select 1 from drawing_global_guesses where artwork_id = p_artwork_id and player_id = p_player_id and correct) then raise exception 'already solved'; end if;
  normalized := lower(regexp_replace(trim(coalesce(p_guess,'')), '[[:space:][:punct:]]', '', 'g'));
  if normalized = '' then raise exception 'empty guess'; end if;
  select coalesce(max(attempt_number), 0) + 1 into next_attempt from drawing_global_guesses where artwork_id = p_artwork_id and player_id = p_player_id;
  is_right := normalized = lower(regexp_replace(trim(art.keyword), '[[:space:][:punct:]]', '', 'g'));
  insert into drawing_global_guesses(artwork_id, player_id, player_name, guess, correct, gave_up, attempt_number)
  values (p_artwork_id, p_player_id, p_player_name, left(trim(p_guess),40), is_right, false, next_attempt);
  if is_right then update drawing_player_accounts set xiba_coins = xiba_coins + 10 where player_id = p_player_id; end if;
  return jsonb_build_object('ok', true, 'correct', is_right, 'attempt_number', next_attempt, 'coins_earned', case when is_right then 10 else 0 end);
end; $$;

create or replace function public.add_global_drawing_comment(p_artwork_id uuid, p_player_id uuid, p_player_name text, p_message text)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if not exists (select 1 from drawing_player_accounts where player_id = p_player_id and player_name = p_player_name) then raise exception 'choose your account first'; end if;
  if not exists (select 1 from drawing_global_guesses where artwork_id = p_artwork_id and player_id = p_player_id and correct) then raise exception 'guess correctly before commenting'; end if;
  if char_length(trim(coalesce(p_message,''))) not between 1 and 300 then raise exception 'comment must be 1 to 300 characters'; end if;
  insert into drawing_global_comments(artwork_id, player_id, player_name, message) values (p_artwork_id, p_player_id, p_player_name, trim(p_message));
  return jsonb_build_object('ok', true);
end; $$;

create or replace function public.react_to_global_drawing(p_artwork_id uuid, p_player_id uuid, p_reaction smallint)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if p_reaction not in (-1,0,1) then raise exception 'invalid reaction'; end if;
  if not exists (select 1 from drawing_player_accounts where player_id = p_player_id) then raise exception 'choose your account first'; end if;
  if not exists (select 1 from drawing_global_artworks a where a.id = p_artwork_id and a.player_id <> p_player_id and exists (select 1 from drawing_global_guesses g where g.artwork_id = a.id and g.player_id = p_player_id and g.correct)) then raise exception 'guess correctly first'; end if;
  if p_reaction = 0 then delete from drawing_global_reactions where artwork_id = p_artwork_id and player_id = p_player_id;
  else insert into drawing_global_reactions(artwork_id, player_id, reaction) values (p_artwork_id, p_player_id, p_reaction) on conflict (artwork_id, player_id) do update set reaction = excluded.reaction; end if;
  return jsonb_build_object('ok', true);
end; $$;

revoke all on function public.get_global_drawing_profile(text), public.get_global_drawing_feed(uuid), public.submit_global_drawing(uuid,text,text), public.submit_global_drawing_guess(uuid,uuid,text,text,boolean), public.add_global_drawing_comment(uuid,uuid,text,text), public.react_to_global_drawing(uuid,uuid,smallint) from public;
grant execute on function public.get_global_drawing_profile(text), public.get_global_drawing_feed(uuid), public.submit_global_drawing(uuid,text,text), public.submit_global_drawing_guess(uuid,uuid,text,text,boolean), public.add_global_drawing_comment(uuid,uuid,text,text), public.react_to_global_drawing(uuid,uuid,smallint) to anon, authenticated;
