import { useRef, type RefObject } from "react";
import { useFrame } from "@react-three/fiber";
import { MathUtils, type Group } from "three";
import {
	AIMED_CHANCE,
	ASTEROID_DESPAWN_Z,
	ASTEROID_SPAWN_Z,
	ASTEROID_SPEED_END,
	ASTEROID_SPEED_START,
	CRYSTAL_CHANCE,
	CRYSTAL_RADIUS,
	GAME_DURATION,
	ROCK_SIZES,
	SHIP_BOUNDS,
	SPAWN_INTERVAL_END,
	SPAWN_INTERVAL_START,
} from "./constants";
import { useGameStore } from "./gameStore";
import { crystalGeometry, crystalMaterial, rockGeometry, rockMaterial } from "./resources";
import { ASTEROID_POOL_SIZE, moveAsteroids, type Asteroid } from "./world";

/*
  Asteroids – skapar, flyttar och tar bort asteroiderna.

  Två sorter (se world.ts):
    - "rock":    grå, kantig sten i fem storlekar. Skjut sönder eller väj!
    - "crystal": orange, lysande kristall. Flyg in i den för poäng.

  Geometrier och material kommer från resources.ts och delas av alla
  asteroider. När en asteroid "återföds" byter vi bara vilken geometri och
  vilket material dess mesh pekar på, och storleken via mesh.scale.
*/

type AsteroidsProps = {
	asteroidsRef: RefObject<Asteroid[]>;
	shipRef: RefObject<Group | null>;
};

export function Asteroids({ asteroidsRef, shipRef }: AsteroidsProps) {
	/** Sekunder kvar tills nästa asteroid ska skapas. */
	const spawnTimer = useRef(0);

	/** "Återföd" en ledig asteroid längst bort, med slumpade egenskaper. */
	function spawn(asteroid: Asteroid, progress: number) {
		const mesh = asteroid.mesh;
		if (!mesh) return;

		if (Math.random() < CRYSTAL_CHANCE) {
			asteroid.kind = "crystal";
			asteroid.radius = CRYSTAL_RADIUS;
			asteroid.maxHits = 0; // Kan inte skjutas
		} else {
			/*
			  Slumpa en av storlekarna i ROCK_SIZES.
			  Math.random() ger 0 ≤ x < 1. Gånger antalet storlekar (5) och
			  avrundat nedåt ger ett heltal 0, 1, 2, 3 eller 4 – ett index.
			*/
			const size = ROCK_SIZES[Math.floor(Math.random() * ROCK_SIZES.length)];
			asteroid.kind = "rock";
			asteroid.radius = size.radius;
			asteroid.maxHits = size.hits;
		}
		asteroid.hitsLeft = asteroid.maxHits;

		/*
		  Svårighetsgrad: `progress` går från 0 (start) till 1 (slut).
		  lerp(a, b, t) = "linjär interpolation": värdet t procent av vägen
		  från a till b. lerp(30, 55, 0.5) = 42.5.
		  Lite slump (±15 %) så att inte alla åker exakt lika fort.
		*/
		const baseSpeed = MathUtils.lerp(ASTEROID_SPEED_START, ASTEROID_SPEED_END, progress);
		asteroid.speed = baseSpeed * MathUtils.randFloat(0.85, 1.15);
		asteroid.spinX = MathUtils.randFloatSpread(3);
		asteroid.spinY = MathUtils.randFloatSpread(3);

		// Var ska den dyka upp? Ibland rakt mot skeppet, annars slumpat
		// inom (lite större än) området där skeppet kan flyga.
		const ship = shipRef.current;
		if (ship && Math.random() < AIMED_CHANCE) {
			mesh.position.set(ship.position.x, ship.position.y, ASTEROID_SPAWN_Z);
		} else {
			mesh.position.set(
				MathUtils.randFloatSpread(SHIP_BOUNDS.x * 2 + 4),
				MathUtils.randFloatSpread(SHIP_BOUNDS.y * 2 + 2),
				ASTEROID_SPAWN_Z,
			);
		}

		// setScalar(n) = set(n, n, n): samma skala på alla axlar.
		// Geometrierna har radie 1, så skala = radie.
		const isCrystal = asteroid.kind === "crystal";
		mesh.scale.setScalar(asteroid.radius);
		mesh.geometry = isCrystal ? crystalGeometry : rockGeometry;
		mesh.material = isCrystal ? crystalMaterial : rockMaterial;
		mesh.visible = true;
		asteroid.active = true;
	}

	useFrame((_state, delta) => {
		// getState() läser storen utan att React renderar om (se gameStore.ts).
		const { phase, elapsed } = useGameStore.getState();
		// Inga asteroider i startmenyn, och de fryser när spelet är slut.
		if (phase !== "playing") return;

		const asteroids = asteroidsRef.current;
		const progress = elapsed / GAME_DURATION;

		// ── 1. Skapa nya asteroider med jämna mellanrum ──
		spawnTimer.current -= delta;
		if (spawnTimer.current <= 0) {
			spawnTimer.current = MathUtils.lerp(SPAWN_INTERVAL_START, SPAWN_INTERVAL_END, progress);
			// find() ger första lediga, eller undefined om poolen är full.
			const free = asteroids.find((asteroid) => !asteroid.active);
			if (free) spawn(free, progress);
		}

		// ── 2. Flytta alla aktiva asteroider (se world.ts) ──
		moveAsteroids(asteroids, delta, ASTEROID_DESPAWN_Z);
	});

	/*
	  Vi renderar ALLA meshes i poolen direkt från början. De saknar egen
	  geometri och material tills spawn() ger dem det, och de är osynliga.

	  ref={(mesh) => ...} är en "callback ref": React anropar funktionen med
	  three.js-objektet när det skapats. Där kopplar vi ihop meshen med
	  sin plats i poolen.

	  OBS: vi sätter `visible = false` i ref-callbacken och INTE som prop
	  (visible={false}). En prop skulle R3F sätta om varje gång komponenten
	  renderas om – och då försvinner alla synliga asteroider!
	*/
	return (
		<>
			{Array.from({ length: ASTEROID_POOL_SIZE }, (_, i) => (
				<mesh
					key={i}
					ref={(mesh) => {
						asteroidsRef.current[i].mesh = mesh;
						if (mesh) mesh.visible = false;
					}}
				/>
			))}
		</>
	);
}
