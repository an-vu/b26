import type { Board } from '../../models/board';
import type { Widget } from '../../models/widget';
export type HomePreviewBoard = { board: Board; widgets: Widget[]; minutesAgo: number; avatarUrl?: string };
// Snapshots of explicitly generated local demo boards. Not a publication feed.
export const HOME_PREVIEW_BOARDS: HomePreviewBoard[] = [
  {
    "board": {
      "id": "8f2e3b86-9b3e-4b16-bab6-67bd6d94e98d",
      "boardName": "Emma’s listening room",
      "boardUrl": "home-preview-emma",
      "name": "Title",
      "headline": "Description",
      "version": 6,
      "ownerUsername": "emma",
      "appearance": {
        "theme": "light",
        "radiusStep": 2,
        "backgroundColor": "#f9f8f6",
        "pattern": "none",
        "themeFamily": "default",
        "patternIntensity": "light",
        "spacingStep": 2
      },
      "ownerDisplayName": "Emma",
      "website": "",
      "visibility": "public"
    },
    "widgets": [
      {
        "id": 30,
        "type": "embed",
        "title": "Dreams — Fleetwood Mac",
        "layout": "span-2x2",
        "config": {
          "embedUrl": "https://www.youtube-nocookie.com/embed/mrZRURcb1cM"
        },
        "enabled": true,
        "order": 0
      }
    ],
    "minutesAgo": 9,
  },
  {
    "board": {
      "id": "7be5caf5-926d-4273-9371-3b503ed71394",
      "boardName": "The daily read",
      "boardUrl": "home-preview-news",
      "name": "Title",
      "headline": "Description",
      "version": 6,
      "ownerUsername": "news",
      "appearance": {
        "theme": "light",
        "radiusStep": 2,
        "backgroundColor": "#f9f8f6",
        "pattern": "none",
        "themeFamily": "default",
        "patternIntensity": "light",
        "spacingStep": 2
      },
      "ownerDisplayName": "News",
      "website": "",
      "visibility": "public"
    },
    "widgets": [
      {
        "id": 31,
        "type": "link",
        "title": "A little closer to the stars",
        "layout": "span-1",
        "config": {
          "url": "https://www.nasa.gov/",
          "description": "Space, science, and a little perspective on our planet."
        },
        "enabled": true,
        "order": 0
      }
    ],
    "minutesAgo": 15,
  },
  {
    "board": {
      "id": "f1b223a2-d591-445f-995a-6f988745db50",
      "boardName": "Nori’s travel journal",
      "boardUrl": "home-preview-nori",
      "name": "Title",
      "headline": "Description",
      "version": 6,
      "ownerUsername": "nori",
      "appearance": {
        "theme": "light",
        "radiusStep": 2,
        "backgroundColor": "#f9f8f6",
        "pattern": "none",
        "themeFamily": "default",
        "patternIntensity": "light",
        "spacingStep": 2
      },
      "ownerDisplayName": "Nori",
      "website": "",
      "visibility": "public"
    },
    "widgets": [
      {
        "id": 32,
        "type": "link",
        "title": "Trip to Florida",
        "layout": "span-2x2",
        "config": {
          "url": "https://www.visitflorida.com/",
          "imageUrl": "/themes/aqua-coast.svg",
          "description": "Slow mornings, salt air, and nowhere to rush."
        },
        "enabled": true,
        "order": 0
      }
    ],
    "minutesAgo": 20,
  },
  {
    "board": {
      "id": "b6ff47a0-e51b-4146-a0af-29693a02b9c5",
      "boardName": "Victoria after hours",
      "boardUrl": "home-preview-victoria",
      "name": "Title",
      "headline": "Description",
      "version": 6,
      "ownerUsername": "victoria",
      "appearance": {
        "theme": "light",
        "radiusStep": 2,
        "backgroundColor": "#f9f8f6",
        "pattern": "none",
        "themeFamily": "default",
        "patternIntensity": "light",
        "spacingStep": 2
      },
      "ownerDisplayName": "Victoria",
      "website": "",
      "visibility": "public"
    },
    "widgets": [
      {
        "id": 33,
        "type": "link",
        "title": "After the city falls asleep",
        "layout": "span-1x2",
        "config": {
          "url": "https://www.nasa.gov/",
          "imageUrl": "/themes/aqua-galaxy.svg",
          "description": "A little collection of things that glow in the dark."
        },
        "enabled": true,
        "order": 0
      }
    ],
    "minutesAgo": 30,
  },
  {
    "board": {
      "id": "1144ea5a-5233-431c-83f2-ae4c75d39a0c",
      "boardName": "Small daily things",
      "boardUrl": "home-preview-daily",
      "name": "Title",
      "headline": "Description",
      "version": 6,
      "ownerUsername": "daily",
      "appearance": {
        "theme": "light",
        "radiusStep": 2,
        "backgroundColor": "#f9f8f6",
        "pattern": "none",
        "themeFamily": "default",
        "patternIntensity": "light",
        "spacingStep": 2
      },
      "ownerDisplayName": "Daily",
      "website": "",
      "visibility": "public"
    },
    "widgets": [
      {
        "id": 34,
        "type": "link",
        "title": "One good thing today",
        "layout": "span-1",
        "config": {
          "url": "https://www.wikipedia.org/",
          "description": "Learn something small. Keep it with you."
        },
        "enabled": true,
        "order": 0
      }
    ],
    "minutesAgo": 38,
  },
  {
    "board": {
      "id": "421691d4-e665-42ec-9105-666ff856268b",
      "boardName": "Feature’s inspiration shelf",
      "boardUrl": "home-preview-feature",
      "name": "Title",
      "headline": "Description",
      "version": 6,
      "ownerUsername": "feature",
      "appearance": {
        "theme": "light",
        "radiusStep": 2,
        "backgroundColor": "#f9f8f6",
        "pattern": "none",
        "themeFamily": "default",
        "patternIntensity": "light",
        "spacingStep": 2
      },
      "ownerDisplayName": "Feature",
      "website": "",
      "visibility": "public"
    },
    "widgets": [
      {
        "id": 35,
        "type": "link",
        "title": "Made for a little curiosity",
        "layout": "span-2",
        "config": {
          "url": "https://www.designmuseum.org/",
          "description": "Objects, ideas, and the people who make them."
        },
        "enabled": true,
        "order": 0
      }
    ],
    "minutesAgo": 45,
  },
  {
    "board": {
      "id": "0d9e0a47-0138-490c-b3a7-5dd555cfcef5",
      "boardName": "BlueBerry’s corner",
      "boardUrl": "home-preview-blueberry",
      "name": "Title",
      "headline": "Description",
      "version": 6,
      "ownerUsername": "blueberry",
      "appearance": {
        "theme": "light",
        "radiusStep": 2,
        "backgroundColor": "#f9f8f6",
        "pattern": "none",
        "themeFamily": "default",
        "patternIntensity": "light",
        "spacingStep": 2
      },
      "ownerDisplayName": "Blueberry",
      "website": "",
      "visibility": "public"
    },
    "widgets": [
      {
        "id": 36,
        "type": "link",
        "title": "Hello, BlueBerry",
        "layout": "span-1",
        "config": {
          "url": "https://github.com/an-vu/b26",
          "imageUrl": "/brand/blueberry-about.png",
          "description": "A little space for your favorite things."
        },
        "enabled": true,
        "order": 0
      }
    ],
    "minutesAgo": 52,
  }
];
