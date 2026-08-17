-- FE-04 · Cuando se anula un viaje, sus pagos se anulan
-- ─────────────────────────────────────────────────────────────────────────────
-- REGISTRO (no lo ejecuta Claude Code). Este cambio de base lo APLICÓ Claude en
-- Cowork en producción el 16/08/2026, con aprobación expresa del dueño y ensayo
-- previo BEGIN … ROLLBACK. Se guarda aquí solo como rastro de lo aplicado.
-- Alcance: docs/alcances/FE-04-anular-pagos.md
--
-- Regla: al pasar un viaje a 'anulado', sus pagos de flete/estibada pasan a
-- 'anulado' (origen='viaje_anulado'). Si algún pago ya está 'pagado', se PLANTA
-- con VIAJE_CON_PAGOS_PAGADOS y la anulación no ocurre (el viaje queda como estaba).
-- El disparador cuelga de la tabla `viajes`, no de una función, para cubrir
-- cualquier camino que anule un viaje (hoy anular_viaje, mañana el que sea).
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function public.fe_pagos_al_anular_viaje()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_pagados int;
begin
  if new.estado = 'anulado' and old.estado is distinct from 'anulado' then
    select count(*) into v_pagados
      from public.pagos_fe
     where viaje_id = new.viaje_id and estado = 'pagado';
    if v_pagados > 0 then
      raise exception 'VIAJE_CON_PAGOS_PAGADOS: %', v_pagados;
    end if;
    update public.pagos_fe
       set estado = 'anulado', origen = 'viaje_anulado'
     where viaje_id = new.viaje_id and estado <> 'anulado';
  end if;
  return new;
end $$;

drop trigger if exists t_fe_pagos_al_anular_viaje on public.viajes;
create trigger t_fe_pagos_al_anular_viaje
  before update of estado on public.viajes
  for each row execute function public.fe_pagos_al_anular_viaje();
