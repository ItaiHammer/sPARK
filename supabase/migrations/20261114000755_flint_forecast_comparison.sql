create table public.mean_last_3_weeks_forecasts (
    lot_id text not null references public.lots (lot_id),
    forecast_ts timestamptz not null,
    prediction_pct numeric not null check (prediction_pct between 0 and 100),
    model_name text not null,
    model_version text not null,
    generated_at timestamptz not null,
    primary key (lot_id, forecast_ts)
);

alter table public.mean_last_3_weeks_forecasts enable row level security;
revoke all on public.mean_last_3_weeks_forecasts from public, anon, authenticated;
grant select, insert, update on public.mean_last_3_weeks_forecasts to service_role;

create unique index forecasts_lot_time on public.forecasts (lot_id, forecast_ts);

-- Publish both sets together. An older run cannot overwrite a newer prediction.
create function public.save_flint_forecasts(p_flint jsonb, p_baseline jsonb)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
    insert into public.forecasts as current
        (lot_id, forecast_ts, prediction_pct, model_name, model_version, generated_at)
    select lot_id, forecast_ts, prediction_pct, model_name, model_version, generated_at
    from jsonb_populate_recordset(null::public.forecasts, p_flint)
    order by lot_id, forecast_ts
    on conflict (lot_id, forecast_ts) do update set
        prediction_pct = excluded.prediction_pct,
        model_name = excluded.model_name,
        model_version = excluded.model_version,
        generated_at = excluded.generated_at
    where current.generated_at is null or current.generated_at <= excluded.generated_at;

    insert into public.mean_last_3_weeks_forecasts as current
        (lot_id, forecast_ts, prediction_pct, model_name, model_version, generated_at)
    select lot_id, forecast_ts, prediction_pct, model_name, model_version, generated_at
    from jsonb_populate_recordset(null::public.mean_last_3_weeks_forecasts, p_baseline)
    order by lot_id, forecast_ts
    on conflict (lot_id, forecast_ts) do update set
        prediction_pct = excluded.prediction_pct,
        model_name = excluded.model_name,
        model_version = excluded.model_version,
        generated_at = excluded.generated_at
    where current.generated_at <= excluded.generated_at;
end;
$$;

revoke execute on function public.save_flint_forecasts(jsonb, jsonb) from public, anon, authenticated;
grant execute on function public.save_flint_forecasts(jsonb, jsonb) to service_role;
