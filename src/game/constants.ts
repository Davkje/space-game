/*
  Alla "rattar" för spelkänslan samlade på ett ställe.

  Att inte ha "magiska siffror" utspridda i koden gör det mycket lättare att
  experimentera: vill du att skeppet ska vara snabbare ändrar du bara här.

  Enheter: three.js har inga inbyggda enheter. 1 enhet kan vara 1 meter,
  1 km eller vad du vill – det viktiga är att vara konsekvent.
  Vi tänker oss ungefär att skeppet är ~2 enheter brett.

  Vinklar i three.js anges alltid i RADIANER, inte grader:
    π radianer = 180°   →   1 radian ≈ 57°
    Math.PI / 2 = 90°,  Math.PI / 4 = 45°  osv.
*/

// ── Skeppet ──

/** Maxhastighet i sidled/höjdled, i enheter per sekund. */
export const SHIP_MAX_SPEED = 8;

/**
 * Hur snabbt skeppet når maxhastigheten (och bromsar in).
 * Högre = snabbare och "hårdare" styrning, lägre = mer "glidig".
 * Används som `lambda` i MathUtils.damp – se Ship.tsx.
 */
export const SHIP_ACCELERATION = 6;

/**
 * Hur långt från mitten skeppet får flyga.
 * x: åt vänster/höger, y: upp/ner. Skeppet kan alltså röra sig inom
 * en rektangel som är 12 × 6 enheter stor.
 */
export const SHIP_BOUNDS = { x: 9, y: 3.5 };

/** Max lutning åt sidan ("bank") när man svänger. 0.6 rad ≈ 35°. */
export const SHIP_MAX_BANK = 0.6;

/** Max lutning upp/ner med nosen ("pitch"). 0.3 rad ≈ 17°. */
export const SHIP_MAX_PITCH = 0.3;

// ── Kameran ──

/** Hur långt bakom skeppet kameran sitter (längs +Z). */
export const CAMERA_DISTANCE = 6;

/** Hur högt över skeppet kameran sitter. */
export const CAMERA_HEIGHT = 0.2;

/**
 * Hur mycket kameran följer med när skeppet rör sig i sidled/höjdled.
 * 0 = kameran står helt still, 1 = kameran följer skeppet exakt.
 * Ett värde mittemellan gör att man SER att skeppet rör sig på skärmen,
 * men att det ändå aldrig åker utanför bild.
 */
export const CAMERA_FOLLOW = 0.5;

// ── Spelregler ──

/** Hur länge man måste överleva för att vinna, i sekunder. */
export const GAME_DURATION = 120;

/** Antal liv man börjar med. */
export const START_LIVES = 3;

/**
 * Sekunder som skeppet är osårbart (och blinkar) efter en krock.
 * Utan det här skulle man kunna tappa flera liv på samma asteroid.
 */
export const INVULNERABLE_TIME = 1.5;

/**
 * Skeppets "träffyta" för kollisioner. Vi låtsas att skeppet är en sfär
 * med den här radien. Lite mindre än skeppet ser ut – det känns rättvist
 * för spelaren när en asteroid "nästan" träffar vingspetsen.
 */
export const SHIP_RADIUS = 0.7;

// ── Asteroider ──

/** Hur långt bort asteroiderna skapas (negativ Z = framför oss). */
export const ASTEROID_SPAWN_Z = -160;

/**
 * När en asteroid passerat hit (bakom kameran) tas den bort.
 * Kameran sitter på z = CAMERA_DISTANCE, så +5 är strax bakom den.
 */
export const ASTEROID_DESPAWN_Z = CAMERA_DISTANCE + 5;

/**
 * Asteroidernas fart (enheter/sek). Spelet blir svårare med tiden:
 * farten går från START till END under spelets gång.
 */
export const ASTEROID_SPEED_START = 30;
export const ASTEROID_SPEED_END = 55;

/** Sekunder mellan varje ny asteroid – också från START till END. */
export const SPAWN_INTERVAL_START = 0.8;
export const SPAWN_INTERVAL_END = 0.25;

/**
 * Andel av asteroiderna som är orange kristaller (plockas upp genom att
 * flyga in i dem). Resten är grå stenar. 0.25 = 25 %.
 */
export const CRYSTAL_CHANCE = 0.25;

/**
 * Andel av asteroiderna som siktar rakt på skeppets nuvarande position.
 * Utan dessa kan man ibland bara stå still och klara sig.
 */
export const AIMED_CHANCE = 0.3;

/** Kristallernas storlek (radie). */
export const CRYSTAL_RADIUS = 0.8;

/** Poäng för att plocka upp en kristall. */
export const CRYSTAL_POINTS = 100;

/**
 * Stenarnas storlekar. Varje rad är en storlek:
 *   radius = hur stor stenen är (och dess träffyta)
 *   hits   = hur många skott som krävs för att den ska gå sönder
 * Lägg till eller ta bort rader för fler eller färre storlekar – resten av
 * koden anpassar sig automatiskt.
 */
export const ROCK_SIZES = [
	{ radius: 0.7, hits: 1 },
	{ radius: 1.0, hits: 2 },
	{ radius: 1.4, hits: 3 },
	{ radius: 1.8, hits: 4 },
	{ radius: 2.3, hits: 5 },
];

/**
 * Poäng när en sten går sönder, per skott den tålde.
 * Minsta stenen ger alltså 50, största 5 × 50 = 250.
 */
export const ROCK_POINTS_PER_HIT = 50;

// ── Partiklar ──

/** Hur länge en partikel lever, i sekunder. */
export const PARTICLE_LIFETIME = 0.9;

/** Hur fort partiklarna sprutar ut åt alla håll (enheter/sek). */
export const PARTICLE_SPEED = 10;

// ── Skott ──

/** Skottens fart framåt (enheter/sek). Snabbare än asteroiderna! */
export const BULLET_SPEED = 90;

/** Minsta tid mellan två skott, i sekunder (eldhastighet). */
export const FIRE_COOLDOWN = 0.18;

/** Hur långt bort skotten försvinner. */
export const BULLET_MAX_Z = -150;

/**
 * Skottens träffyta (radie), används för kollisioner.
 *
 * Större än skottet ser ut, med flit. Skott och asteroid närmar sig
 * varandra med ~90 + 55 = 145 enheter/sek, alltså ~2.4 enheter per frame.
 * Om träffytorna tillsammans är mindre än så kan skottet "hoppa över"
 * asteroiden mellan två frames utan att vi märker någon krock
 * ("tunneling" – ett klassiskt problem med snabba objekt i spel).
 */
export const BULLET_RADIUS = 0.6;

// ── Stjärnor ──

/** Antal stjärnor i stjärnfältet. */
export const STAR_COUNT = 500;

/** Hur fort stjärnorna susar förbi. Påverkar fartkänslan mycket! */
export const STAR_SPEED = 60;
