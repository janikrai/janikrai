export interface Project {
  id: string;
  name: string;
  client: string;
  tags: string[];
  videoUrl: string;
  teaserUrl: string;
  ratio: 'contain' | 'cover';
  hasAwards?: boolean;
  laurelUrls?: string[];
  credits?: string;
  stills?: string[];
}

export type Category = 'Selected' | 'Commercial' | 'Films' | 'Archive';
