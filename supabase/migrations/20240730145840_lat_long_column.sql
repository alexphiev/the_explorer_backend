ALTER TABLE nature_places ADD COLUMN _geoloc jsonb;

CREATE OR REPLACE FUNCTION update_geoloc() 
RETURNS trigger AS $$
BEGIN
  NEW._geoloc := jsonb_build_object(
    'lat', ST_Y(NEW.wkb_geometry::geometry),
    'lng', ST_X(NEW.wkb_geometry::geometry)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trigger_update_geoloc
BEFORE INSERT OR UPDATE OF wkb_geometry ON nature_places
FOR EACH ROW
EXECUTE FUNCTION update_geoloc();
