import samplePhoto from '../assets/hero.png'
import tokyoPhoto1 from '../tokyo_1.jpg'
import tokyoPhoto2 from '../tokyo_2.jpg'
import tokyoPhoto3 from '../tokyo_3.jpg'
import tokyoPhoto4 from '../tokyo_4.jpg'
import tokyoPhoto5 from '../tokyo_5.jpg'
import tokyoPhoto6 from '../tokyo_6.jpg'

export type Memory = {
  id: string
  city: string
  lat: number
  lng: number
  photos: string[]
  description: string
}

const samplePhotos = [samplePhoto, samplePhoto, samplePhoto]
const tokyoPhotos = [
  tokyoPhoto1,
  tokyoPhoto2,
  tokyoPhoto3,
  tokyoPhoto4,
  tokyoPhoto5,
  tokyoPhoto6,
]

export const memories: Memory[] = [
  {
    id: 'tokyo',
    city: 'Tokyo',
    lat: 35.6762,
    lng: 139.6503,
    photos: tokyoPhotos,
    description: 'A memory from Tokyo.',
  },
  {
    id: 'osaka',
    city: 'Osaka',
    lat: 34.6937,
    lng: 135.5023,
    photos: samplePhotos,
    description: 'A memory from Osaka.',
  },
  {
    id: 'kyoto',
    city: 'Kyoto',
    lat: 35.0116,
    lng: 135.7681,
    photos: samplePhotos,
    description: 'A memory from Kyoto.',
  },
  {
    id: 'kawaguchiko',
    city: 'Kawaguchiko',
    lat: 35.4982,
    lng: 138.7689,
    photos: samplePhotos,
    description: 'A memory from Kawaguchiko.',
  },
  {
    id: 'hiroshima',
    city: 'Hiroshima',
    lat: 34.3853,
    lng: 132.4553,
    photos: samplePhotos,
    description: 'A memory from Hiroshima.',
  },
  {
    id: 'seoul',
    city: 'Seoul',
    lat: 37.5665,
    lng: 126.978,
    photos: samplePhotos,
    description: 'A memory from Seoul.',
  },
  {
    id: 'melbourne',
    city: 'Melbourne',
    lat: -37.8136,
    lng: 144.9631,
    photos: samplePhotos,
    description: 'Our memories in Melbourne.',
  },
  {
    id: 'sydney',
    city: 'Sydney',
    lat: -33.8688,
    lng: 151.2093,
    photos: samplePhotos,
    description: 'A memory from Sydney.',
  },
  {
    id: 'gold-coast',
    city: 'Gold Coast',
    lat: -28.0167,
    lng: 153.4,
    photos: samplePhotos,
    description: 'A memory from the Gold Coast.',
  },
  {
    id: 'byron-bay',
    city: 'Byron Bay',
    lat: -28.6474,
    lng: 153.602,
    photos: samplePhotos,
    description: 'A memory from Byron Bay.',
  },
  {
    id: 'paris',
    city: 'Paris',
    lat: 48.8566,
    lng: 2.3522,
    photos: samplePhotos,
    description: 'A memory from Paris.',
  },
  {
    id: 'nice',
    city: 'Nice',
    lat: 43.7102,
    lng: 7.262,
    photos: samplePhotos,
    description: 'A memory from Nice.',
  },
  {
    id: 'monaco',
    city: 'Monaco',
    lat: 43.7384,
    lng: 7.4246,
    photos: samplePhotos,
    description: 'A memory from Monaco.',
  },
  {
    id: 'alsace',
    city: 'Alsace',
    lat: 48.3182,
    lng: 7.4416,
    photos: samplePhotos,
    description: 'A memory from Alsace.',
  },
  {
    id: 'manchester',
    city: 'Manchester',
    lat: 53.4808,
    lng: -2.2426,
    photos: samplePhotos,
    description: 'A memory from Manchester.',
  },
  {
    id: 'liverpool',
    city: 'Liverpool',
    lat: 53.4084,
    lng: -2.9916,
    photos: samplePhotos,
    description: 'A memory from Liverpool.',
  },
  {
    id: 'switzerland',
    city: 'Switzerland',
    lat: 46.8182,
    lng: 8.2275,
    photos: samplePhotos,
    description: 'A memory from Switzerland.',
  },
  {
    id: 'amsterdam',
    city: 'Amsterdam',
    lat: 52.3676,
    lng: 4.9041,
    photos: samplePhotos,
    description: 'A memory from Amsterdam.',
  },
]
