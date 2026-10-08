-- Explicit sample-content operation for 1.5.7; not an automatic Flyway migration.
-- Public sample profiles have no email or password. Existing profiles are never replaced.
-- Run this DO statement in one transaction after reviewing the target database.
DO $seed$
DECLARE profile jsonb; item jsonb; user_key text; board_key text; widget_order integer;
BEGIN
  FOR profile IN SELECT value FROM jsonb_array_elements($profiles$[
  {
    "username": "vhuman",
    "displayName": "vHuman",
    "boardName": "Studio notes",
    "headline": "Sample board: quiet objects, spaces, and visual ideas.",
    "themeFamily": "default",
    "theme": "light",
    "pattern": "none",
    "widgets": [
      {
        "type": "link",
        "title": "Room to breathe",
        "layout": "span-2x2",
        "config": {
          "url": "https://vhumanstudios.com/",
          "description": "A sample collection of spaces with a little room around them.",
          "imageUrl": "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=800&q=80"
        }
      },
      {
        "type": "link",
        "title": "The inspiration shelf",
        "layout": "span-1",
        "config": {
          "url": "https://www.designmuseum.org/",
          "description": "Objects and the stories behind them."
        }
      },
      {
        "type": "link",
        "title": "Less, but better",
        "layout": "span-1x2",
        "config": {
          "url": "https://www.vitsoe.com/",
          "description": "Small details, considered carefully."
        }
      },
      {
        "type": "link",
        "title": "Made by people",
        "layout": "span-2",
        "config": {
          "url": "https://www.lovefrom.com/",
          "description": "Craft, materials, and patient design."
        }
      },
      {
        "type": "map",
        "title": "Cities on the moodboard",
        "layout": "span-2",
        "config": {
          "places": [
            "Shanghai",
            "Copenhagen",
            "Kyoto"
          ]
        }
      }
    ]
  },
  {
    "username": "vi",
    "displayName": "Vi",
    "boardName": "After hours",
    "headline": "Sample board: blue skies, music, and late-night daydreams.",
    "themeFamily": "aqua",
    "theme": "light",
    "pattern": "stars",
    "widgets": [
      {
        "type": "link",
        "title": "Blue hour",
        "layout": "span-2x2",
        "config": {
          "url": "https://unsplash.com/",
          "description": "The last light before the city settles down.",
          "imageUrl": "https://images.unsplash.com/photo-1470770841072-f978cf4d019e?auto=format&fit=crop&w=800&q=80"
        }
      },
      {
        "type": "link",
        "title": "A little cosmic perspective",
        "layout": "span-1",
        "config": {
          "url": "https://www.nasa.gov/",
          "description": "A sky full of things we have yet to discover."
        }
      },
      {
        "type": "link",
        "title": "A shelf of old favorites",
        "layout": "span-1x2",
        "config": {
          "url": "https://archive.org/",
          "description": "Sounds, pictures, and a little internet nostalgia."
        }
      },
      {
        "type": "link",
        "title": "Stay curious",
        "layout": "span-2",
        "config": {
          "url": "https://www.esa.int/",
          "description": "Somewhere between science and wonder."
        }
      },
      {
        "type": "map",
        "title": "Places for a slow evening",
        "layout": "span-2",
        "config": {
          "places": [
            "Chicago",
            "Vancouver",
            "Tokyo"
          ]
        }
      }
    ]
  },
  {
    "username": "moka",
    "displayName": "Moka",
    "boardName": "Slow mornings",
    "headline": "Sample board: coffee, warm light, and weekend wandering.",
    "themeFamily": "omahakase",
    "theme": "dark",
    "pattern": "sakura",
    "widgets": [
      {
        "type": "link",
        "title": "First cup",
        "layout": "span-2x2",
        "config": {
          "url": "https://unsplash.com/",
          "description": "A quiet start, one sip at a time.",
          "imageUrl": "https://images.unsplash.com/photo-1442512595331-e89e73853f31?auto=format&fit=crop&w=800&q=80"
        }
      },
      {
        "type": "link",
        "title": "A small ritual",
        "layout": "span-1",
        "config": {
          "url": "https://www.japan.travel/",
          "description": "Places worth slowing down for."
        }
      },
      {
        "type": "link",
        "title": "Notes from the kitchen",
        "layout": "span-1x2",
        "config": {
          "url": "https://www.seriouseats.com/",
          "description": "Keep a few good recipes close."
        }
      },
      {
        "type": "link",
        "title": "Objects with a story",
        "layout": "span-2",
        "config": {
          "url": "https://www.designmuseum.org/",
          "description": "A little shelf of everyday favorites."
        }
      },
      {
        "type": "map",
        "title": "Next coffee stops",
        "layout": "span-2",
        "config": {
          "places": [
            "Kyoto",
            "Melbourne",
            "Portland"
          ]
        }
      }
    ]
  },
  {
    "username": "sol",
    "displayName": "Sol",
    "boardName": "Outside, please",
    "headline": "Sample board: green trails, fresh air, and small escapes.",
    "themeFamily": "frutiger-aero",
    "theme": "light",
    "pattern": "wave",
    "widgets": [
      {
        "type": "link",
        "title": "Take the scenic route",
        "layout": "span-2x2",
        "config": {
          "url": "https://unsplash.com/",
          "description": "A reminder to step outside and look around.",
          "imageUrl": "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=800&q=80"
        }
      },
      {
        "type": "link",
        "title": "Find a trail",
        "layout": "span-1",
        "config": {
          "url": "https://www.nps.gov/",
          "description": "A weekend plan that starts with walking."
        }
      },
      {
        "type": "link",
        "title": "A bigger world",
        "layout": "span-1x2",
        "config": {
          "url": "https://www.nationalgeographic.com/",
          "description": "Stories from beyond the usual route."
        }
      },
      {
        "type": "link",
        "title": "Pack light",
        "layout": "span-2",
        "config": {
          "url": "https://www.rei.com/",
          "description": "The essentials, then a little room for snacks."
        }
      },
      {
        "type": "map",
        "title": "A few green escapes",
        "layout": "span-2",
        "config": {
          "places": [
            "Olympic National Park",
            "Lake Michigan",
            "Banff"
          ]
        }
      }
    ]
  },
  {
    "username": "pixel",
    "displayName": "Pixel",
    "boardName": "Save point",
    "headline": "Sample board: game-night nostalgia, neon, and playful little discoveries.",
    "themeFamily": "kiwi",
    "theme": "dark",
    "pattern": "grid",
    "widgets": [
      {
        "type": "link",
        "title": "Press start",
        "layout": "span-2x2",
        "config": {
          "url": "https://archive.org/",
          "description": "A sample shelf of old games and digital memories.",
          "imageUrl": "/themes/aqua-galaxy.svg"
        }
      },
      {
        "type": "link",
        "title": "One more level",
        "layout": "span-1",
        "config": {
          "url": "https://www.playstation.com/",
          "description": "Game-night inspiration."
        }
      },
      {
        "type": "link",
        "title": "Build something small",
        "layout": "span-1x2",
        "config": {
          "url": "https://itch.io/",
          "description": "Independent games and unexpected ideas."
        }
      },
      {
        "type": "link",
        "title": "Keep experimenting",
        "layout": "span-2",
        "config": {
          "url": "https://threejs.org/",
          "description": "A place to explore playful digital worlds."
        }
      },
      {
        "type": "map",
        "title": "Arcade daydreams",
        "layout": "span-2",
        "config": {
          "places": [
            "Tokyo",
            "Seattle",
            "Seoul"
          ]
        }
      }
    ]
  }
]$profiles$::jsonb) LOOP
    user_key := 'b26-sample-157-' || (profile->>'username');
    board_key := user_key || '-board';
    IF EXISTS (SELECT 1 FROM app_users WHERE lower(username) = profile->>'username' AND id <> user_key) THEN
      RAISE EXCEPTION 'Sample username @% already belongs to another account', profile->>'username';
    END IF;
    IF EXISTS (SELECT 1 FROM boards WHERE board_url = 'sample-' || (profile->>'username') AND id <> board_key) THEN
      RAISE EXCEPTION 'Sample board URL is already in use';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM app_users WHERE id = user_key) THEN
      INSERT INTO app_users(id,username,display_name,role)
      VALUES(user_key,profile->>'username',profile->>'displayName','USER');
      INSERT INTO boards(id,owner_user_id,name,headline,board_name,board_url,visibility,
        appearance_theme_family,appearance_theme,appearance_pattern,appearance_background_color)
      VALUES(board_key,user_key,profile->>'displayName',profile->>'headline',profile->>'boardName',
        'sample-' || (profile->>'username'),'public',profile->>'themeFamily',profile->>'theme',profile->>'pattern','#f9f8f6');
      INSERT INTO user_preferences(user_id,main_board_id) VALUES(user_key,board_key);
      widget_order := 0;
      FOR item IN SELECT value FROM jsonb_array_elements(profile->'widgets') LOOP
        INSERT INTO widgets(board_id,type,title,layout,config_json,enabled,sort_order)
        VALUES(board_key,item->>'type',item->>'title',item->>'layout',(item->'config')::text,true,widget_order);
        widget_order := widget_order + 1;
      END LOOP;
    END IF;
  END LOOP;
END;
$seed$;
