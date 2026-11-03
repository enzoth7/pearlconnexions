-- Reviews can be assigned as a visible section. Approval and return remain
-- separate director-only operations.
update public.workspace_section_catalog
set director_only = false
where id = 'qa.reviews';
