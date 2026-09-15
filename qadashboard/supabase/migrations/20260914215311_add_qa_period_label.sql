alter table public.qa_periods
  add column label text;

alter table public.qa_periods
  add constraint qa_periods_label_length
  check (label is null or char_length(trim(label)) between 2 and 120);

comment on column public.qa_periods.label is
  'Optional user-facing period name. Month and year remain the canonical reporting date.';
