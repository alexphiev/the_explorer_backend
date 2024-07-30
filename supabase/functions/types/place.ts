export interface Geometry {
  type: string;
  coordinates: number[];
}

interface Source {
  property: string;
  dataset: string;
  record_id: string;
  confidence: null | number; // Assuming confidence can be a number or null
}

interface Names {
  primary: string;
  common: null | string; // Assuming common can be a string or null
  rules: null | string; // Assuming rules can be a string or null
}

interface Categories {
  main: string;
  alternate: string[];
}

interface Brand {
  wikidata: null | string;
  names: Names;
}

interface Address {
  freeform: string;
  locality: null | string; // Assuming locality can be a string or null
  postcode: string;
  region: null | string; // Assuming region can be a string or null
  country: string;
}

export interface Place {
  ogc_fid: number;
  wkb_geometry: Geometry;
  id: string;
  version: number;
  update_time: Date;
  sources: Source[]; // Updated to use Source array
  names: Names; // Updated to use Names type
  categories: Categories; // Updated to use Categories type
  confidence: number;
  websites: string[];
  socials: string[];
  phones: string[];
  brand: Brand; // This could be further refined if the structure of brand is known
  addresses: Address[]; // Updated to use Address array
}
