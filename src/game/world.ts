import { MathUtils, Vector3, type Material, type Mesh } from "three";
import { particleGeometry } from "./resources";

/*
  world.ts – datatyperna för sakerna som flyger omkring: asteroider, skott
  och partiklar.

  ── Object pooling ──
  Ett naivt sätt att göra asteroider vore att lägga till en ny i en
  React-lista (useState) varje gång en ska skapas, och ta bort den när den
  passerat. Men då:
    - renderar React om hela listan flera gånger per sekund
    - skapas och kastas hela tiden nya three.js-objekt, vilket ger jobb åt
      "garbage collectorn" och kan ge små hack i spelet

  I stället skapar vi en "pool": ett FAST antal asteroider (t.ex. 60) som
  finns från början, men som är osynliga. När vi behöver en ny asteroid
  letar vi upp en ledig (inactive) i poolen, flyttar den längst bort och
  gör den synlig. När den passerat oss blir den ledig igen.

  Det är en klassisk teknik i spelutveckling, och React behöver aldrig
  rendera om något – allt sker i useFrame.

  Varje objekt i poolen har:
    - `mesh`: själva three.js-objektet (sätts via en ref när det skapats)
    - `active`: används den just nu?
    - egen data, t.ex. fart och storlek
*/

/**
 * "rock"    = grå sten. Skjut sönder den (större kräver fler skott) eller väj!
 * "crystal" = orange kristall. Flyg in i den för att plocka upp den.
 */
export type AsteroidKind = "rock" | "crystal";

export type Asteroid = {
	mesh: Mesh | null;
	active: boolean;
	kind: AsteroidKind;
	/** Storlek – används både för utseende (scale) och kollisioner. */
	radius: number;
	/** Hur många skott den tål från början ("hit points"). */
	maxHits: number;
	/** Hur många skott den tål till innan den går sönder. */
	hitsLeft: number;
	/** Fart mot spelaren, enheter/sek. */
	speed: number;
	/** Hur fort den snurrar runt x- och y-axeln (radianer/sek). */
	spinX: number;
	spinY: number;
};

export type Bullet = {
	mesh: Mesh | null;
	active: boolean;
};

/**
 * En liten skärva som flyger iväg när något går sönder.
 * Den krymper under sin livstid och försvinner när den blivit "gammal".
 */
export type Particle = {
	mesh: Mesh | null;
	active: boolean;
	/** Riktning och fart, enheter/sek (en Vector3 = x, y, z på en gång). */
	velocity: Vector3;
	/** Sekunder sedan partikeln skapades. */
	age: number;
	/** Storlek när den skapas – krymper sedan mot 0. */
	size: number;
};

/** Hur många av varje som finns i poolerna. Räcker gott för vårt tempo. */
export const ASTEROID_POOL_SIZE = 60;
export const BULLET_POOL_SIZE = 30;
export const PARTICLE_POOL_SIZE = 300;

/*
  Array.from({ length: n }, () => ...) skapar en array med n element, där
  varje element skapas av funktionen. Varje element blir ett EGET objekt
  (om vi skrev new Array(n).fill({...}) skulle alla dela SAMMA objekt!).
*/
export function createAsteroidPool(): Asteroid[] {
	return Array.from({ length: ASTEROID_POOL_SIZE }, () => ({
		mesh: null,
		active: false,
		kind: "rock",
		radius: 1,
		maxHits: 1,
		hitsLeft: 1,
		speed: 0,
		spinX: 0,
		spinY: 0,
	}));
}

export function createBulletPool(): Bullet[] {
	return Array.from({ length: BULLET_POOL_SIZE }, () => ({
		mesh: null,
		active: false,
	}));
}

export function createParticlePool(): Particle[] {
	return Array.from({ length: PARTICLE_POOL_SIZE }, () => ({
		mesh: null,
		active: false,
		velocity: new Vector3(),
		age: 0,
		size: 0,
	}));
}

/** Gör ett objekt i poolen ledigt igen och göm det. */
export function deactivate(item: Asteroid | Bullet | Particle) {
	item.active = false;
	if (item.mesh) item.mesh.visible = false;
}

/*
  ── Varför ligger förflyttningen här och inte i komponenterna? ──
  Poolerna skickas som props till Asteroids/Bullets. React (och dess
  lint-regler, "React Compiler") utgår från att props ALDRIG ändras.
  Men våra pooler är spel-data som vi medvetet ändrar 60 gånger per
  sekund – de lever egentligen utanför React.

  Därför samlar vi själva "simuleringen" i vanliga TypeScript-funktioner
  här. Komponenterna anropar dem bara från useFrame. En bonus: logiken
  blir lätt att läsa (och testa) utan att man behöver kunna React.
*/

/** Flytta och snurra alla aktiva asteroider; ta bort dem som passerat. */
export function moveAsteroids(asteroids: Asteroid[], delta: number, despawnZ: number) {
	for (const asteroid of asteroids) {
		const mesh = asteroid.mesh;
		if (!asteroid.active || !mesh) continue;

		mesh.position.z += asteroid.speed * delta;
		mesh.rotation.x += asteroid.spinX * delta;
		mesh.rotation.y += asteroid.spinY * delta;

		// Passerat kameran? Ledig igen.
		if (mesh.position.z > despawnZ) deactivate(asteroid);
	}
}

/** Ett skott träffar en sten. Returnerar true om stenen gick sönder. */
export function hitRock(asteroid: Asteroid) {
	asteroid.hitsLeft -= 1;
	return asteroid.hitsLeft <= 0;
}

/** Flytta alla aktiva skott framåt (−z); ta bort dem som flugit för långt. */
export function moveBullets(bullets: Bullet[], delta: number, speed: number, maxZ: number) {
	for (const bullet of bullets) {
		const mesh = bullet.mesh;
		if (!bullet.active || !mesh) continue;

		mesh.position.z -= speed * delta;
		if (mesh.position.z < maxZ) deactivate(bullet);
	}
}

/**
 * Skapa en "explosion" av partiklar.
 *
 * @param position  var explosionen sker (t.ex. stenens position)
 * @param count     hur många partiklar
 * @param material  vilket material (sten eller kristall) – skärvorna ska
 *                  se ut som det som gick sönder
 * @param size      ungefärlig storlek på varje skärva
 * @param driftZ    gemensam fart mot spelaren (+z). Skärvorna från en sten
 *                  fortsätter i stenens riktning, som i verkligheten.
 * @param speed     hur fort skärvorna sprutar ut åt alla håll
 */
export function emitParticles(
	particles: Particle[],
	position: Vector3,
	count: number,
	material: Material,
	size: number,
	driftZ: number,
	speed: number,
) {
	let emitted = 0;
	for (const particle of particles) {
		if (emitted >= count) break;
		const mesh = particle.mesh;
		if (particle.active || !mesh) continue;

		/*
		  Slumpa en riktning: en punkt i en kub från -1 till 1 på varje axel.
		  normalize() gör vektorn 1 lång (bara riktningen kvar), och sen
		  multiplicerar vi med en slumpad fart.
		*/
		particle.velocity
			.set(MathUtils.randFloatSpread(2), MathUtils.randFloatSpread(2), MathUtils.randFloatSpread(2))
			.normalize()
			.multiplyScalar(speed * MathUtils.randFloat(0.4, 1));
		particle.velocity.z += driftZ;

		particle.age = 0;
		particle.size = size * MathUtils.randFloat(0.5, 1.2);
		particle.active = true;

		// copy() kopierar x, y, z från en annan vektor.
		mesh.position.copy(position);
		mesh.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);
		mesh.scale.setScalar(particle.size);
		mesh.geometry = particleGeometry;
		mesh.material = material;
		mesh.visible = true;

		emitted++;
	}
}

/** Flytta, snurra och krymp partiklarna; ta bort dem som blivit för gamla. */
export function moveParticles(particles: Particle[], delta: number, lifetime: number) {
	for (const particle of particles) {
		const mesh = particle.mesh;
		if (!particle.active || !mesh) continue;

		particle.age += delta;
		if (particle.age >= lifetime) {
			deactivate(particle);
			continue;
		}

		/*
		  addScaledVector(v, s) = position += v * s.
		  Samma "sträcka = hastighet × tid" som för skeppet, fast för alla
		  tre axlarna på en gång.
		*/
		mesh.position.addScaledVector(particle.velocity, delta);
		mesh.rotation.x += delta * 5;
		mesh.rotation.y += delta * 3;

		// Krymp från full storlek (age = 0) till 0 (age = lifetime).
		const lifeLeft = 1 - particle.age / lifetime;
		mesh.scale.setScalar(particle.size * lifeLeft);
	}
}
