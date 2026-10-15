alter table public.support_tickets
  add column if not exists messages jsonb not null default '[]'::jsonb;

-- Called only by authenticated server routes with the service role. Row locking
-- keeps replies and status changes atomic without overwriting another reply.
create or replace function public.append_support_ticket_message(
  p_ticket_id uuid, p_owner_id uuid, p_actor text, p_action text, p_body text default ''
) returns public.support_tickets
language plpgsql security invoker set search_path = '' as $$
declare
  ticket public.support_tickets;
  history jsonb;
  content text := btrim(coalesce(p_body, ''));
  next_status text;
  sent_at timestamptz := clock_timestamp();
begin
  if p_actor not in ('developer', 'support') or p_actor is null
    or p_action not in ('reply', 'resolve', 'close', 'reopen') or p_action is null then
    raise exception 'invalid_ticket_action';
  end if;
  if p_actor = 'developer' and (p_owner_id is null or p_action not in ('reply', 'resolve')) then
    raise exception 'invalid_ticket_action';
  end if;
  if p_actor = 'support' and p_action = 'resolve' then raise exception 'invalid_ticket_action'; end if;
  select * into ticket from public.support_tickets
    where id = p_ticket_id and (p_actor = 'support' or user_id = p_owner_id) for update;
  if not found then raise exception 'ticket_not_found'; end if;
  if p_action = 'reply' and (length(content) < 2 or length(content) > 10000) then
    raise exception 'invalid_ticket_message';
  end if;
  if p_action = 'reply' and p_actor = 'support' and ticket.status = 'closed' then
    raise exception 'ticket_closed';
  end if;
  if p_action = 'resolve' and ticket.status = 'closed' then return ticket; end if;
  history := ticket.messages;
  if jsonb_array_length(history) = 0 then
    history := jsonb_build_array(jsonb_build_object('id', gen_random_uuid(), 'role', 'developer', 'body', ticket.message, 'createdAt', ticket.created_at));
    if nullif(ticket.admin_reply, '') is not null then
      history := history || jsonb_build_array(jsonb_build_object('id', gen_random_uuid(), 'role', 'support', 'body', ticket.admin_reply, 'createdAt', coalesce(ticket.replied_at, ticket.updated_at)));
    end if;
  end if;
  next_status := case when p_action in ('resolve', 'close') then 'closed'
    when p_action = 'reopen' or p_actor = 'developer' then 'open' else 'answered' end;
  if p_action <> 'reply' then
    content := case p_action when 'resolve' then 'مشکلم حل شد؛ تیکت بسته شود.'
      when 'close' then 'تیکت توسط پشتیبانی بسته شد.' else 'تیکت توسط پشتیبانی دوباره باز شد.' end;
  end if;
  history := history || jsonb_build_array(jsonb_build_object('id', gen_random_uuid(), 'role', p_actor, 'body', content, 'createdAt', sent_at));
  update public.support_tickets set messages = history, status = next_status, updated_at = sent_at,
    admin_reply = case when p_actor = 'support' and p_action = 'reply' then content else admin_reply end,
    replied_at = case when p_actor = 'support' and p_action = 'reply' then sent_at else replied_at end
    where id = ticket.id returning * into ticket;
  return ticket;
end;
$$;
revoke all on function public.append_support_ticket_message(uuid, uuid, text, text, text) from public, anon, authenticated;
grant execute on function public.append_support_ticket_message(uuid, uuid, text, text, text) to service_role;
