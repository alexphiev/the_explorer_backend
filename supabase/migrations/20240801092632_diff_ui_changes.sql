drop trigger if exists "trigger_update_geoloc" on "public"."nature_places";

alter table "public"."places" drop constraint "places_pk";

drop index if exists "public"."places_pk";

alter table "public"."nature_places" alter column "id" set not null;

alter table "public"."places" add column "_geoloc" jsonb;

alter table "public"."places" alter column "id" set not null;

CREATE UNIQUE INDEX nature_places_id_key ON public.nature_places USING btree (id);

CREATE UNIQUE INDEX nature_places_pkey ON public.nature_places USING btree (id);

CREATE UNIQUE INDEX places_id_key ON public.places USING btree (id);

CREATE UNIQUE INDEX places_pkey ON public.places USING btree (ogc_fid, id);

alter table "public"."nature_places" add constraint "nature_places_pkey" PRIMARY KEY using index "nature_places_pkey";

alter table "public"."places" add constraint "places_pkey" PRIMARY KEY using index "places_pkey";

alter table "public"."nature_places" add constraint "nature_places_id_key" UNIQUE using index "nature_places_id_key";

alter table "public"."places" add constraint "places_id_key" UNIQUE using index "places_id_key";

CREATE TRIGGER trigger_update_geoloc BEFORE INSERT OR UPDATE OF wkb_geometry ON public.places FOR EACH ROW EXECUTE FUNCTION update_geoloc();