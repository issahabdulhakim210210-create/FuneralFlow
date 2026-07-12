insert into service_categories(name) values
('Caterers'),('Coffin Makers'),('Photographers'),('Florists'),('Pastors'),('MCs'),('Transportation'),('Decoration'),('Venue'),('Sound Systems'),('Custom Service')
on conflict do nothing;
