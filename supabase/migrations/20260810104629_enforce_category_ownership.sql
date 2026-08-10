drop policy "own budgets" on public.budgets;
create policy "own budgets" on public.budgets
  for all using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.categories as category
      where category.id = category_id and category.user_id = auth.uid()
    )
  );

drop policy "own transactions" on public.transactions;
create policy "own transactions" on public.transactions
  for all using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.categories as category
      where category.id = category_id and category.user_id = auth.uid()
    )
  );
