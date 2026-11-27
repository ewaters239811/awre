begin;

-- Keep archived Monday editions readable while the worker creates Sunday editions.
alter table public.weekly_letters
  drop constraint if exists weekly_letters_week_of_check,
  add constraint weekly_letters_week_of_check
    check (extract(isodow from week_of) in (1, 7));

commit;
