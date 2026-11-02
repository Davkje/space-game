import type { RefObject } from "react";
import { useFrame } from "@react-three/fiber";
import type { Group } from "three";
import {
	BULLET_RADIUS,
	CRYSTAL_POINTS,
	PARTICLE_SPEED,
	ROCK_POINTS_PER_HIT,
	SHIP_RADIUS,
} from "./constants";
import { isInvulnerable, useGameStore } from "./gameStore";
import { crystalMaterial, rockMaterial } from "./resources";
import {
	deactivate,
	emitParticles,
	hitRock,
	type Asteroid,
	type Bullet,
	type Particle,
} from "./world";

/*
  GameLogic – spelets "domare". Ritar ingenting (returnerar null), utan
  kör varje frame:
    1. räknar upp speltiden (och avgör om man vunnit)
    2. skott ↔ sten:      stenen tappar ett "liv", går sönder vid 0
    3. skepp ↔ kristall:  plockas upp → poäng
    4. skepp ↔ sten:      krock → skeppet tappar ett liv

  ── Kollisioner med sfärer ──
  Riktig kollision mellan två 3D-former är krångligt. Ett klassiskt
  fusk i spel: låtsas att allt är sfärer (klot). Två sfärer krockar om
  avståndet mellan deras mittpunkter är mindre än radierna tillsammans:

        avstånd < radie1 + radie2   →   KROCK!

  Vector3.distanceTo() räknar ut avståndet åt oss (Pythagoras sats i 3D).

  ── Ordningen spelar roll ──
  useFrame-funktioner körs i den ordning komponenterna monterades. Vi
  lägger <GameLogic /> SIST i Scene.tsx, så att den kollar kollisioner
  EFTER att asteroider och skott har flyttats denna frame.
*/

type GameLogicProps = {
	shipRef: RefObject<Group | null>;
	asteroidsRef: RefObject<Asteroid[]>;
	bulletsRef: RefObject<Bullet[]>;
	particlesRef: RefObject<Particle[]>;
};

export function GameLogic({ shipRef, asteroidsRef, bulletsRef, particlesRef }: GameLogicProps) {
	useFrame((_state, delta) => {
		// Actions (tick, shipHit, addScore) är vanliga funktioner, så vi kan
		// plocka ut dem från getState() och anropa dem direkt.
		const { phase, tick, shipHit, addScore } = useGameStore.getState();
		if (phase !== "playing") return;

		// ── 1. Tiden ──
		tick(delta);

		const ship = shipRef.current;
		if (!ship) return;

		const particles = particlesRef.current;

		for (const asteroid of asteroidsRef.current) {
			if (!asteroid.active || !asteroid.mesh) continue;
			const asteroidPos = asteroid.mesh.position;

			// ── 2. Skott ↔ sten ──
			// Kristaller hoppar vi över: skotten flyger rakt igenom dem.
			if (asteroid.kind === "rock") {
				for (const bullet of bulletsRef.current) {
					if (!bullet.active || !bullet.mesh) continue;
					if (bullet.mesh.position.distanceTo(asteroidPos) >= asteroid.radius + BULLET_RADIUS) continue;

					deactivate(bullet);
					const destroyed = hitRock(asteroid);

					if (!destroyed) {
						// Spricker bara: några små flisor där skottet träffade.
						emitParticles(particles, bullet.mesh.position, 3, rockMaterial, 0.15, asteroid.speed * 0.5, PARTICLE_SPEED * 0.6);
					} else {
						// Går sönder! Större sten = fler och större skärvor.
						emitParticles(
							particles,
							asteroidPos,
							6 + asteroid.maxHits * 4,
							rockMaterial,
							0.2 + asteroid.radius * 0.15,
							asteroid.speed * 0.5,
							PARTICLE_SPEED,
						);
						deactivate(asteroid);
						addScore(ROCK_POINTS_PER_HIT * asteroid.maxHits);
					}
					break; // Ett skott per sten och frame räcker
				}

				// Stenen kan just ha blivit sönderskjuten ovan.
				if (!asteroid.active) continue;
			}

			// Rör skeppet asteroiden? Annars är vi klara med den.
			if (ship.position.distanceTo(asteroidPos) >= asteroid.radius + SHIP_RADIUS) continue;

			if (asteroid.kind === "crystal") {
				// ── 3. Plocka upp kristall ──
				// Gnistorna flyger med skeppet (driftZ = 0) i stället för förbi.
				emitParticles(particles, asteroidPos, 12, crystalMaterial, 0.15, 0, PARTICLE_SPEED * 0.8);
				deactivate(asteroid);
				addScore(CRYSTAL_POINTS);
			} else {
				// ── 4. Krock med sten ──
				// getState() igen, eftersom tick() nyss ändrade `elapsed`.
				if (isInvulnerable(useGameStore.getState())) continue;

				emitParticles(particles, asteroidPos, 20, rockMaterial, 0.3, asteroid.speed * 0.3, PARTICLE_SPEED);
				deactivate(asteroid);
				shipHit();
			}
		}
	});

	return null;
}
