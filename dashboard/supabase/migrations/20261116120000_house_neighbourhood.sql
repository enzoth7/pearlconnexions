-- Houses now carry their public gemstone name (name) and the neighbourhood they sit in.
alter table public.qa_homes
  add column if not exists neighbourhood text
  check (neighbourhood is null or char_length(trim(neighbourhood)) between 2 and 120);

-- Keep the old name as the neighbourhood, then adopt the names used on the website.
update public.qa_homes set neighbourhood = coalesce(neighbourhood, name)
where code in ('CH1','CH2','CH3','CH4','CH5','CH6','CH7');

update public.qa_homes set name = 'Sapphire House' where code = 'CH4' and name = 'Crimsworth';
update public.qa_homes set name = 'Garnet House'   where code = 'CH2' and name = 'Coulsdon';
update public.qa_homes set name = 'Ruby House'     where code = 'CH3' and name = 'Heathfields';
update public.qa_homes set name = 'Emerald House'  where code = 'CH7' and name = 'Milne Park';
update public.qa_homes set name = 'Onyx House', neighbourhood = 'Friday Road' where code = 'CH5' and name = 'Friday Rd';
-- CH1 Brambles Acre and CH6 Victoria Rd keep their names until their gemstone names are confirmed.
