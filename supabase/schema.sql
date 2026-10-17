-- Bloom: run once in Supabase → SQL Editor. Only creates bloom_* objects; nothing else is touched.

create sequence if not exists public.bloom_rev_seq;

create table if not exists public.bloom_records (
  user_id    uuid    not null default auth.uid() references auth.users (id) on delete cascade,
  tbl        text    not null check (tbl in ('sets', 'cards', 'reviews', 'tests', 'attempts')),
  id         text    not null,
  updated_at bigint  not null,
  deleted    boolean not null default false,
  data       jsonb   not null default '{}'::jsonb,
  rev        bigint  not null default nextval('public.bloom_rev_seq'),
  primary key (user_id, tbl, id)
);
create index if not exists bloom_records_user_rev on public.bloom_records (user_id, rev);

alter table public.bloom_records enable row level security;

drop policy if exists "bloom own rows" on public.bloom_records;
create policy "bloom own rows" on public.bloom_records
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

revoke all on public.bloom_records from anon;
grant select, insert, update, delete on public.bloom_records to authenticated;
grant usage on sequence public.bloom_rev_seq to authenticated;

-- One round trip: push local changes (last write wins by updatedAt), get back everything newer than `since`.
create or replace function public.bloom_sync(changes jsonb, since bigint)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;

  insert into bloom_records (user_id, tbl, id, updated_at, deleted, data, rev)
  select uid, c.tbl, c.id, c.updated_at, c.deleted, c.data, nextval('bloom_rev_seq')
  from (
    select distinct on (x->>'table', x->>'id')
      x->>'table'                              as tbl,
      x->>'id'                                 as id,
      (x->>'updatedAt')::bigint                as updated_at,
      coalesce((x->>'deleted')::boolean, false) as deleted,
      coalesce(x->'data', '{}'::jsonb)         as data
    from jsonb_array_elements(coalesce(changes, '[]'::jsonb)) x
    where x->>'table' in ('sets', 'cards', 'reviews', 'tests', 'attempts')
      and x->>'id' is not null
      and x->>'updatedAt' is not null
    order by x->>'table', x->>'id', (x->>'updatedAt')::bigint desc
  ) c
  on conflict (user_id, tbl, id) do update
    set updated_at = excluded.updated_at,
        deleted    = excluded.deleted,
        data       = excluded.data,
        rev        = excluded.rev
    where bloom_records.updated_at < excluded.updated_at;

  return jsonb_build_object(
    'rev', (select coalesce(max(rev), 0) from bloom_records where user_id = uid),
    'rows', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'table', tbl, 'id', id, 'updatedAt', updated_at, 'deleted', deleted, 'data', data
      ) order by rev), '[]'::jsonb)
      from bloom_records
      where user_id = uid and rev > coalesce(since, 0)
    )
  );
end;
$$;

revoke all on function public.bloom_sync(jsonb, bigint) from public, anon;
grant execute on function public.bloom_sync(jsonb, bigint) to authenticated;
