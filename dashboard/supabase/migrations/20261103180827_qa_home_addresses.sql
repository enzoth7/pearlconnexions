alter table public.qa_homes
  add column address text
  check (address is null or char_length(trim(address)) between 5 and 300);
