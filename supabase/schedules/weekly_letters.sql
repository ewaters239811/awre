-- Create these in Supabase Vault before running this file:
-- clearpth_site_url: hosted app origin, with no path
-- clearpth_weekly_letters_cron_secret: matches WEEKLY_LETTERS_CRON_SECRET on the app
create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.schedule(
  'clearpth-weekly-letters',
  '*/5 * * * *',
  $job$
  select net.http_post(
    url := rtrim(site.decrypted_secret, '/') || '/api/weekly-letters/deliver',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || secret.decrypted_secret,
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 55000
  )
  from vault.decrypted_secrets as site
  cross join vault.decrypted_secrets as secret
  where site.name = 'clearpth_site_url'
    and secret.name = 'clearpth_weekly_letters_cron_secret';
  $job$
);
